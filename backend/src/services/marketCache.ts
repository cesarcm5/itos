import { AppError } from '../lib/errors.js';
import { readCacheRow, writeCacheRow, type CacheRow } from './marketCacheStore.js';

export type Cached<T> = { data: T; stale: boolean; cachedAt: string };

type Entry<T> = { data: T; cachedAt: string };

export const TTL = {
  quote: 60,
  dailyHistory: 12 * 60 * 60,
  monthlyHistory: 24 * 60 * 60,
  search: 7 * 24 * 60 * 60,
  fx: 24 * 60 * 60,
} as const;

// Identical in-flight requests share one upstream call.
const inflight = new Map<string, Promise<Cached<unknown>>>();

function isEntry(payload: unknown): payload is Entry<unknown> {
  return typeof payload === 'object' && payload !== null && 'data' in payload && 'cachedAt' in payload;
}

/** Errors that should fall back to stale data instead of reaching the client. */
function canServeStale(err: unknown): boolean {
  return err instanceof AppError && (err.code === 'RATE_LIMITED' || err.code === 'UPSTREAM_ERROR');
}

/**
 * Returns fresh cached data, or fetches it (one upstream call per key at a time).
 * When the budget is exhausted or upstream fails, serves the expired row with `stale: true`.
 * With nothing cached, the original error (503 RATE_LIMITED / 502 UPSTREAM_ERROR) propagates.
 */
export async function getOrFetch<T>(key: string, ttlSeconds: number, fetcher: () => Promise<T>): Promise<Cached<T>> {
  let row: CacheRow | undefined;
  try {
    row = await readCacheRow(key);
  } catch (err) {
    console.error(`market_cache read failed for ${key}`, err);
  }

  const entry = row && isEntry(row.payload) ? (row.payload as Entry<T>) : undefined;
  if (row && entry && row.expiresAt.getTime() > Date.now()) {
    return { data: entry.data, stale: false, cachedAt: entry.cachedAt };
  }

  const pending = inflight.get(key);
  if (pending) return pending as Promise<Cached<T>>;

  const promise = (async (): Promise<Cached<T>> => {
    try {
      const data = await fetcher();
      const fresh: Entry<T> = { data, cachedAt: new Date().toISOString() };
      try {
        await writeCacheRow(key, fresh, new Date(Date.now() + ttlSeconds * 1000));
      } catch (err) {
        console.error(`market_cache write failed for ${key}`, err);
      }
      return { ...fresh, stale: false };
    } catch (err) {
      if (entry && canServeStale(err)) {
        return { data: entry.data, stale: true, cachedAt: entry.cachedAt };
      }
      throw err;
    }
  })();

  inflight.set(key, promise);
  try {
    return await promise;
  } finally {
    inflight.delete(key);
  }
}
