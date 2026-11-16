import { eq } from 'drizzle-orm';
import { db } from '../db/client.js';
import { marketCache } from '../db/schema.js';

export type CacheRow = { payload: unknown; expiresAt: Date };

export async function readCacheRow(key: string): Promise<CacheRow | undefined> {
  const [row] = await db
    .select({ payload: marketCache.payload, expiresAt: marketCache.expiresAt })
    .from(marketCache)
    .where(eq(marketCache.key, key))
    .limit(1);
  return row;
}

export async function writeCacheRow(key: string, payload: unknown, expiresAt: Date): Promise<void> {
  await db
    .insert(marketCache)
    .values({ key, payload, expiresAt })
    .onConflictDoUpdate({ target: marketCache.key, set: { payload, expiresAt } });
}
