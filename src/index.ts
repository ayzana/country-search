// types
export interface CountryRaw {
  name: string;
  alpha2Code?: string;
  alpha3Code?: string;
  capital?: string;
  region?: string;
  subregion?: string;
  population?: number;
  area?: number;
  currencies?: { code: string; name: string; symbol?: string }[];
  languages?: { iso639_1?: string; name: string }[];
  callingCodes?: string[];
  topLevelDomain?: string[];
  borders?: string[];
  flag?: string;
}

export interface Country {
  name: string;
  flag: string;
  capital: string;
  region: string;
  population: number;
  languages: string[];
}

export interface CountryDetails extends Country {
  area: number;
  borders: string[];
  currencies: string[];
  subregion: string;
  alpha3Code: string;
}

// DEBOUNCE

export function debounce<T extends (...args: never[]) => void>(
  fn: T,
  delay: number
): ((...args: Parameters<T>) => void) & { cancel: () => void } {
  let timer: ReturnType<typeof setTimeout> | null = null;

  const wrapped = (...args: Parameters<T>): void => {
    if (timer !== null) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      fn(...args);
    }, delay);
  };

  wrapped.cancel = (): void => {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
  };

  return wrapped;
}
// errors
export class HttpError extends Error {
  readonly status: number;
  constructor(status: number, message = `HTTP ${status}`) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
  }
}
export type ErrorKind = 'abort' | 'timeout' | 'http' | 'network' | 'unknown';

export function classifyError(err: unknown): ErrorKind {
  if (err instanceof DOMException) {
    if (err.name === 'AbortError') return 'abort';
    if (err.name === 'TimeoutError') return 'timeout';
  }
  if (err instanceof HttpError) return 'http';
  if (err instanceof TypeError) return 'network';
  return 'unknown';
}
// mapping
export function mapCountryResponse(raw: CountryRaw): Country {
  return {
    name: raw.name,
    flag: raw.flag ?? '',
    capital: raw.capital ?? '',
    region: raw.region ?? '',
    population: raw.population ?? 0,
    languages: (raw.languages ?? []).map((l) => l.name),
  };
}

export function mapCountryDetails(raw: CountryRaw): CountryDetails {
  const base = mapCountryResponse(raw);
  return {
    ...base,
    area: raw.area ?? 0,
    borders: raw.borders ?? [],
    currencies: (raw.currencies ?? []).map((c) => c.name),
    subregion: raw.subregion ?? '',
    alpha3Code: raw.alpha3Code ?? '',
  };
}
// search
export const API_BASE = 'https://countries.dev';
export const DEFAULT_TIMEOUT_MS = 8000;

export async function searchCountries(query: string, signal: AbortSignal): Promise<Country[]> {
  const url = `${API_BASE}/name/${encodeURIComponent(query)}`;
  const res = await fetch(url, { signal });

  if (res.status === 404) return [];
  if (!res.ok) throw new HttpError(res.status);

  const data: unknown = await res.json();
  const list = Array.isArray(data) ? data : [data];
  return (list as CountryRaw[]).map(mapCountryResponse);
}

export function makeSignalWithTimeout(signal: AbortSignal, ms = DEFAULT_TIMEOUT_MS): AbortSignal {
  const timeout = AbortSignal.timeout(ms);
  if (typeof AbortSignal.any === 'function') {
    return AbortSignal.any([signal, timeout]);
  }
  const controller = new AbortController();
  const abort = (reason: unknown): void => controller.abort(reason);
  if (signal.aborted) abort(signal.reason);
  else signal.addEventListener('abort', () => abort(signal.reason), { once: true });
  timeout.addEventListener('abort', () => controller.abort(timeout.reason), { once: true });
  return controller.signal;
}

// CACHE
interface InflightEntry {
  promise: Promise<Country[]>;
  controller: AbortController;
  refs: number;
}

export class SearchCache {
  private readonly resolved = new Map<string, Country[]>();
  private readonly inflight = new Map<string, InflightEntry>();

  async get(
    query: string,
    signal: AbortSignal,
    timeoutMs = DEFAULT_TIMEOUT_MS
  ): Promise<Country[]> {
    const key = query.toLowerCase();
    const cached = this.resolved.get(key);
    if (cached) return cached;

    let entry = this.inflight.get(key);
    if (!entry) {
      const controller = new AbortController();
      const promise = searchCountries(key, makeSignalWithTimeout(controller.signal, timeoutMs))
        .then((data) => {
          this.resolved.set(key, data);
          return data;
        })
        .finally(() => {
          this.inflight.delete(key);
        });
      entry = { promise, controller, refs: 0 };
      this.inflight.set(key, entry);
    }
    entry.refs += 1;

    try {
      return await Promise.race([
        entry.promise,
        new Promise<never>((_, reject) => {
          if (signal.aborted) {
            reject(new DOMException('Aborted', 'AbortError'));
            return;
          }
          signal.addEventListener(
            'abort',
            () => reject(new DOMException('Aborted', 'AbortError')),
            { once: true }
          );
        }),
      ]);
    } finally {
      entry.refs -= 1;
      if (entry.refs === 0 && this.inflight.has(key)) {
        entry.controller.abort();
        this.inflight.delete(key);
      }
    }
  }
}
