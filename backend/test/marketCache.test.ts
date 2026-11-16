import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppError } from '../src/lib/errors.js';

const rows = new Map<string, { payload: unknown; expiresAt: Date }>();

vi.mock('../src/services/marketCacheStore.js', () => ({
  readCacheRow: async (key: string) => rows.get(key),
  writeCacheRow: async (key: string, payload: unknown, expiresAt: Date) => {
    rows.set(key, { payload, expiresAt });
  },
}));

const { getOrFetch } = await import('../src/services/marketCache.js');

const past = () => new Date(Date.now() - 1000);
const future = () => new Date(Date.now() + 60_000);

beforeEach(() => rows.clear());

describe('getOrFetch', () => {
  it('fetches, stores and then serves from cache', async () => {
    const fetcher = vi.fn(async () => 42);
    expect(await getOrFetch('k', 60, fetcher)).toMatchObject({ data: 42, stale: false });
    expect(await getOrFetch('k', 60, fetcher)).toMatchObject({ data: 42, stale: false });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('shares one upstream call between identical in-flight requests', async () => {
    let resolve!: (n: number) => void;
    const fetcher = vi.fn(() => new Promise<number>((r) => (resolve = r)));
    const a = getOrFetch('k', 60, fetcher);
    const b = getOrFetch('k', 60, fetcher);
    await vi.waitFor(() => expect(fetcher).toHaveBeenCalled());
    resolve(7);
    expect((await a).data).toBe(7);
    expect((await b).data).toBe(7);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('refetches an expired entry', async () => {
    rows.set('k', { payload: { data: 1, cachedAt: '2026-01-01T00:00:00.000Z' }, expiresAt: past() });
    expect(await getOrFetch('k', 60, async () => 2)).toMatchObject({ data: 2, stale: false });
  });

  it.each(['RATE_LIMITED', 'UPSTREAM_ERROR'] as const)('serves stale data on %s', async (code) => {
    rows.set('k', { payload: { data: 1, cachedAt: '2026-01-01T00:00:00.000Z' }, expiresAt: past() });
    const result = await getOrFetch('k', 60, async () => {
      throw new AppError(code, 'nope');
    });
    expect(result).toEqual({ data: 1, stale: true, cachedAt: '2026-01-01T00:00:00.000Z' });
  });

  it('propagates RATE_LIMITED when nothing is cached', async () => {
    await expect(
      getOrFetch('k', 60, async () => {
        throw new AppError('RATE_LIMITED', 'nope', { retryAfter: 30 });
      }),
    ).rejects.toMatchObject({ code: 'RATE_LIMITED', status: 503 });
  });

  it('does not hide NOT_FOUND behind stale data', async () => {
    rows.set('k', { payload: { data: 1, cachedAt: 'x' }, expiresAt: past() });
    await expect(
      getOrFetch('k', 60, async () => {
        throw new AppError('NOT_FOUND', 'nope');
      }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  it('stores with the given TTL', async () => {
    await getOrFetch('k', 60, async () => 1);
    const expiresAt = rows.get('k')!.expiresAt.getTime();
    expect(expiresAt).toBeGreaterThan(future().getTime() - 1000);
  });
});
