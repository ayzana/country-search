import { describe, it, expect, vi, afterEach } from 'vitest';
import { searchCountries, HttpError, type CountryRaw } from './index';

const USA: CountryRaw = {
  name: 'United States of America',
  capital: 'Washington, D.C.',
  region: 'Americas',
  population: 329_484_123,
  languages: [{ name: 'English' }],
  flag: 'https://countries.dev/flags/us.svg',
};

afterEach(() => vi.restoreAllMocks());

describe('searchCountries', () => {
  it('возвращает массив стран на 200', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify([USA]), { status: 200 })
    );
    const r = await searchCountries('united', new AbortController().signal);
    expect(r).toHaveLength(1);
    expect(r[0]?.name).toBe('United States of America');
    expect(r[0]?.languages).toEqual(['English']);
  });

  it('404 → пустой массив (не ошибка)', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('', { status: 404 }));
    const r = await searchCountries('zzz', new AbortController().signal);
    expect(r).toEqual([]);
  });

  it('500 → HttpError', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('', { status: 500 }));
    await expect(searchCountries('x', new AbortController().signal)).rejects.toBeInstanceOf(
      HttpError
    );
  });

  it('пробрасывает signal в fetch', async () => {
    const spy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response('[]', { status: 200 }));
    const ctrl = new AbortController();
    await searchCountries('x', ctrl.signal);
    expect(spy).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ signal: ctrl.signal })
    );
  });

  it('кодирует query в URL', async () => {
    const spy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response('[]', { status: 200 }));
    await searchCountries('côte d’ivoire', new AbortController().signal);
    expect(spy).toHaveBeenCalledWith(
      expect.stringContaining('c%C3%B4te%20d%E2%80%99ivoire'),
      expect.anything()
    );
  });
});
