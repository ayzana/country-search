import { describe, it, expect, vi, afterEach } from 'vitest';
import { SearchCache, type CountryRaw } from './index';

const USA: CountryRaw = { name: 'United States' };

afterEach(() => vi.restoreAllMocks());

describe('SearchCache', () => {
  it('повторный запрос берётся из кэша', async () => {
    const spy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response(JSON.stringify([USA]), { status: 200 }));
    const cache = new SearchCache();
    const s = new AbortController().signal;

    await cache.get('usa', s);
    await cache.get('usa', s);

    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('дедуплицирует одновременные запросы', async () => {
    const spy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response(JSON.stringify([USA]), { status: 200 }));
    const cache = new SearchCache();
    const s = new AbortController().signal;

    await Promise.all([cache.get('usa', s), cache.get('usa', s)]);

    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('отмена одного вызывающего не рушит промис для другого', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(
      (_url, init) =>
        new Promise<Response>((resolve, reject) => {
          const t = setTimeout(() => {
            resolve(new Response(JSON.stringify([USA]), { status: 200 }));
          }, 50);
          init?.signal?.addEventListener('abort', () => {
            clearTimeout(t);
            reject(new DOMException('Aborted', 'AbortError'));
          });
        })
    );

    const cache = new SearchCache();
    const c1 = new AbortController();
    const c2 = new AbortController();

    const p1 = cache.get('usa', c1.signal);
    const p2 = cache.get('usa', c2.signal);
    c1.abort();

    await expect(p1).rejects.toMatchObject({ name: 'AbortError' });
    const result = await p2;
    expect(result).toHaveLength(1);
  });
});
