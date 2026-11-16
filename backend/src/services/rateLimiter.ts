import { sql as dsql } from 'drizzle-orm';
import { db } from '../db/client.js';
import { apiUsage, userApiUsage } from '../db/schema.js';
import { AppError } from '../lib/errors.js';
import { currentUserId } from '../lib/requestContext.js';

// Twelve Data free plan: 8 credits/min, 800/day. We stay below both.
export const MINUTE_LIMIT = 7;
export const DAILY_LIMIT = 750;
// Max upstream credits one user can spend per UTC day. Cache hits are free; alerts aren't charged to anyone.
export const USER_DAILY_LIMIT = 100;
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

/** Thrown inside the transaction to roll it back without masking real DB errors. */
class QuotaExceeded extends Error {
  constructor(readonly scope: 'user' | 'global') {
    super(scope);
  }
}

/**
 * Reserves upstream credits or throws RATE_LIMITED (with retryAfter).
 * Inside an authenticated request the credits also count against that user's daily quota.
 * Both daily counters live in the DB and are incremented atomically in one transaction,
 * so they survive restarts and a refusal from either leaves both untouched.
 */
export async function acquireCredits(credits = 1, userId = currentUserId()): Promise<void> {
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
    await db.transaction(async (tx) => {
      if (userId) {
        const userRows = await tx
          .insert(userApiUsage)
          .values({ userId, date: today, creditsUsed: credits })
          .onConflictDoUpdate({
            target: [userApiUsage.userId, userApiUsage.date],
            set: { creditsUsed: dsql`${userApiUsage.creditsUsed} + ${credits}` },
            setWhere: dsql`${userApiUsage.creditsUsed} + ${credits} <= ${USER_DAILY_LIMIT}`,
          })
          .returning({ creditsUsed: userApiUsage.creditsUsed });
        if (userRows.length === 0) throw new QuotaExceeded('user');
      }

      const rows = await tx
        .insert(apiUsage)
        .values({ date: today, creditsUsed: credits })
        .onConflictDoUpdate({
          target: apiUsage.date,
          set: { creditsUsed: dsql`${apiUsage.creditsUsed} + ${credits}` },
          setWhere: dsql`${apiUsage.creditsUsed} + ${credits} <= ${DAILY_LIMIT}`,
        })
        .returning({ creditsUsed: apiUsage.creditsUsed });
      if (rows.length === 0) throw new QuotaExceeded('global');
    });
  } catch (err) {
    releaseMinuteSlots(now, credits);
    if (err instanceof QuotaExceeded) {
      const message =
        err.scope === 'user'
          ? 'You reached your daily market data limit, try again tomorrow'
          : 'Daily market data limit reached';
      throw new AppError('RATE_LIMITED', message, { retryAfter: secondsUntilUtcMidnight(new Date(now)) });
    }
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
