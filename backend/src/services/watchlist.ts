import { and, asc, eq } from 'drizzle-orm';
import { db } from '../db/client.js';
import { watchlist } from '../db/schema.js';

export type WatchlistItem = { symbol: string; createdAt: string };

export async function listWatchlist(userId: string): Promise<WatchlistItem[]> {
  const rows = await db
    .select({ symbol: watchlist.symbol, createdAt: watchlist.createdAt })
    .from(watchlist)
    .where(eq(watchlist.userId, userId))
    .orderBy(asc(watchlist.createdAt));
  return rows.map((r) => ({ symbol: r.symbol, createdAt: r.createdAt.toISOString() }));
}

/** Idempotent: adding a symbol twice is a no-op. */
export async function addToWatchlist(userId: string, symbol: string): Promise<WatchlistItem[]> {
  await db.insert(watchlist).values({ userId, symbol }).onConflictDoNothing();
  return listWatchlist(userId);
}

/** Returns false when the symbol wasn't in the watchlist. */
export async function removeFromWatchlist(userId: string, symbol: string): Promise<boolean> {
  const deleted = await db
    .delete(watchlist)
    .where(and(eq(watchlist.userId, userId), eq(watchlist.symbol, symbol)))
    .returning({ symbol: watchlist.symbol });
  return deleted.length > 0;
}
