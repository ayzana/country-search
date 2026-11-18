// DEBOUNCE
export function debounce(fn, delay) {
  let timer = null;
  const wrapped = (...args) => {
    if (timer !== null) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      fn(...args);
    }, delay);
  };
  wrapped.cancel = () => {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
  };
  return wrapped;
}
// errors
export class HttpError extends Error {
  status;
  constructor(status, message = `HTTP ${status}`) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
  }
}
export function classifyError(err) {
  if (err instanceof DOMException) {
    if (err.name === 'AbortError') return 'abort';
    if (err.name === 'TimeoutError') return 'timeout';
  }
  if (err instanceof HttpError) return 'http';
  if (err instanceof TypeError) return 'network';
  return 'unknown';
}
// mapping
function getFlagUrl(raw) {
  if (raw.alpha2Code) {
    return `https://flagcdn.com/${raw.alpha2Code.toLowerCase()}.svg`;
  }
  return raw.flag ?? '';
}
export function mapCountryResponse(raw) {
  return {
    name: raw.name,
    flag: getFlagUrl(raw) ?? '',
    capital: raw.capital ?? '',
    region: raw.region ?? '',
    population: raw.population ?? 0,
    languages: (raw.languages ?? []).map((l) => l.name),
  };
}
export function mapCountryDetails(raw) {
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
export async function searchCountries(query, signal) {
  const url = `${API_BASE}/name/${encodeURIComponent(query)}`;
  const res = await fetch(url, { signal });
  if (res.status === 404) return { countries: [], raws: [] };
  if (!res.ok) throw new HttpError(res.status);
  const data = await res.json();
  const raws = Array.isArray(data) ? data : [data];
  return {
    countries: raws.map(mapCountryResponse),
    raws,
  };
}
export function makeSignalWithTimeout(signal, ms = DEFAULT_TIMEOUT_MS) {
  const timeout = AbortSignal.timeout(ms);
  if (typeof AbortSignal.any === 'function') {
    return AbortSignal.any([signal, timeout]);
  }
  const controller = new AbortController();
  const abort = (reason) => controller.abort(reason);
  if (signal.aborted) abort(signal.reason);
  else signal.addEventListener('abort', () => abort(signal.reason), { once: true });
  timeout.addEventListener('abort', () => controller.abort(timeout.reason), { once: true });
  return controller.signal;
}
export class SearchCache {
  resolved = new Map();
  inflight = new Map();
  async get(query, signal, timeoutMs = DEFAULT_TIMEOUT_MS) {
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
        new Promise((_, reject) => {
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
// UI
export function setupUI(root) {
  const cache = new SearchCache();
  let controller = null;
  let lastQuery = '';
  const input = document.createElement('input');
  input.type = 'search';
  input.placeholder = 'Поиск страны…';
  input.setAttribute('aria-label', 'Поиск страны');
  const status = document.createElement('div');
  status.className = 'status';
  const list = document.createElement('ul');
  list.className = 'results';
  const details = document.createElement('div');
  details.className = 'details';
  root.append(input, status, list, details);
  const clear = () => {
    list.replaceChildren();
    details.replaceChildren();
    status.replaceChildren();
  };
  const showLoading = () => {
    status.textContent = 'Загрузка…';
  };
  const showError = (msg, retry) => {
    clear();
    status.textContent = msg;
    const btn = document.createElement('button');
    btn.textContent = 'Повторить';
    btn.addEventListener('click', retry);
    status.appendChild(btn);
  };
  const showEmpty = () => {
    clear();
    status.textContent = 'Ничего не найдено';
  };
  const renderDetails = (c) => {
    const section = document.createElement('section');
    section.className = 'details-card';
    const h = document.createElement('h2');
    // h.textContent = c.name;
    // const img = document.createElement('img');
    // img.src = c.flag;
    // img.alt = c.name;
    // img.width = 96;
    const rows = [
      ['Субрегион', c.subregion || '—'],
      ['Площадь', `${c.area.toLocaleString()} км²`],
      ['Языки', c.languages.join(', ') || '—'],
      ['Валюты', c.currencies.join(', ') || '—'],
      ['Границы', c.borders.join(', ') || '—'],
      ['Код', c.alpha3Code || '—'],
    ];
    section.append(h);
    for (const [label, value] of rows) {
      const p = document.createElement('p');
      p.textContent = `${label}: ${value}`;
      section.appendChild(p);
    }
    const close = document.createElement('button');
    close.textContent = 'Закрыть';
    close.addEventListener('click', () => details.replaceChildren());
    section.appendChild(close);
    details.replaceChildren(section);
  };
  const renderList = (countries, raws) => {
    clear();
    countries.forEach((c, i) => {
      const raw = raws[i];
      const li = document.createElement('li');
      li.className = 'card';
      const img = document.createElement('img');
      img.src = c.flag;
      img.alt = c.name;
      img.loading = 'lazy';
      img.width = 48;
      const h = document.createElement('h3');
      h.textContent = c.name;
      const cap = document.createElement('p');
      cap.textContent = `Столица: ${c.capital || '—'}`;
      const reg = document.createElement('p');
      reg.textContent = `Регион: ${c.region || '—'}`;
      const pop = document.createElement('p');
      pop.textContent = `Население: ${c.population.toLocaleString()}`;
      li.append(img, h, cap, reg, pop);
      li.addEventListener('click', () => {
        if (raw) renderDetails(mapCountryDetails(raw));
      });
      list.appendChild(li);
    });
  };
  const runSearch = async (query) => {
    lastQuery = query;
    showLoading();
    const local = new AbortController();
    controller = local;
    try {
      const { countries, raws } = await cache.get(query, local.signal);
      if (local.signal.aborted) return;
      if (countries.length === 0) {
        showEmpty();
      } else {
        renderList(countries, raws);
      }
    } catch (err) {
      const kind = classifyError(err);
      if (kind === 'abort') return;
      if (kind === 'timeout') {
        showError('Превышено время ожидания', () => void runSearch(lastQuery));
      } else if (kind === 'http') {
        showError('Ошибка сервера', () => void runSearch(lastQuery));
      } else if (kind === 'network') {
        showError('Ошибка сети', () => void runSearch(lastQuery));
      } else {
        showError('Неизвестная ошибка', () => void runSearch(lastQuery));
      }
    }
  };
  const debouncedSearch = debounce((q) => {
    void runSearch(q);
  }, 350);
  input.addEventListener('input', () => {
    const q = input.value.trim();
    controller?.abort();
    controller = null;
    debouncedSearch.cancel();
    if (q === '') {
      clear();
      lastQuery = '';
      return;
    }
    debouncedSearch(q);
  });
}
if (typeof document !== 'undefined' && document.body) {
  const root = document.createElement('main');
  root.id = 'app';
  document.body.appendChild(root);
  setupUI(root);
}
