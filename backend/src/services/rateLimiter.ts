import { sql as dsql } from 'drizzle-orm';
import { db } from '../db/client.js';
import { apiUsage } from '../db/schema.js';
import { AppError } from '../lib/errors.js';

// Twelve Data free plan: 8 credits/min, 800/day. We stay below both.
export const MINUTE_LIMIT = 7;
export const DAILY_LIMIT = 750;
const WINDOW_MS = 60_000;

// Timestamps of credits spent in the last minute. In memory: the API runs as a single instance.
const recent: number[] = [];

function pruneWindow(now: number): void {
  while (recent.length > 0 && now - recent[0]! >= WINDOW_MS) recent.shift();
}

function secondsUntilWindowFrees(now: number, credits: number): number {
  const oldestNeeded = recent[recent.length - (MINUTE_LIMIT - credits)] ?? recent[0] ?? now;
  return Math.max(1, Math.ceil((oldestNeeded + WINDOW_MS - now) / 1000));
}

function secondsUntilUtcMidnight(now: Date): number {
  const midnight = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1);
  return Math.max(1, Math.ceil((midnight - now.getTime()) / 1000));
}

/**
 * Reserves upstream credits or throws RATE_LIMITED (with retryAfter).
 * The daily counter lives in api_usage and is incremented atomically, so it survives restarts.
 */
export async function acquireCredits(credits = 1): Promise<void> {
  const now = Date.now();
  pruneWindow(now);
  if (recent.length + credits > MINUTE_LIMIT) {
    throw new AppError('RATE_LIMITED', 'Market data limit reached, try again in a minute', {
      retryAfter: secondsUntilWindowFrees(now, credits),
    });
  }

  // Reserve the minute slots before awaiting so concurrent calls can't overshoot.
  for (let i = 0; i < credits; i++) recent.push(now);

  const today = new Date(now).toISOString().slice(0, 10); // UTC day
  try {
    const rows = await db
      .insert(apiUsage)
      .values({ date: today, creditsUsed: credits })
      .onConflictDoUpdate({
        target: apiUsage.date,
        set: { creditsUsed: dsql`${apiUsage.creditsUsed} + ${credits}` },
        setWhere: dsql`${apiUsage.creditsUsed} + ${credits} <= ${DAILY_LIMIT}`,
      })
      .returning({ creditsUsed: apiUsage.creditsUsed });

    if (rows.length === 0) {
      releaseMinuteSlots(now, credits);
      throw new AppError('RATE_LIMITED', 'Daily market data limit reached', {
        retryAfter: secondsUntilUtcMidnight(new Date(now)),
      });
    }
  } catch (err) {
    if (!(err instanceof AppError)) releaseMinuteSlots(now, credits);
    throw err;
  }
}

function releaseMinuteSlots(timestamp: number, credits: number): void {
  for (let i = 0; i < credits; i++) {
    const index = recent.lastIndexOf(timestamp);
    if (index !== -1) recent.splice(index, 1);
  }
}

/** Test helper. */
export function resetMinuteWindow(): void {
  recent.length = 0;
}
