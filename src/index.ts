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
