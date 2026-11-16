import { and, eq, inArray, sql as dsql } from 'drizzle-orm';
import { db } from '../db/client.js';
import { alerts, users } from '../db/schema.js';
import { sendAlertEmail } from './email.js';
import { toAlert } from './alerts.js';
import { getQuote } from './twelveData.js';

export type CheckResult = { checked: number; triggered: number; skipped: number };

export const SYMBOLS_PER_MINUTE = 7;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

let running: Promise<CheckResult> | null = null;

/** Runs one alert check; overlapping calls (cron + manual) share the same run. */
export function checkAlerts(): Promise<CheckResult> {
  running ??= runCheck().finally(() => {
    running = null;
  });
  return running;
}

async function runCheck(): Promise<CheckResult> {
  const rows = await db.selectDistinct({ symbol: alerts.symbol }).from(alerts).where(eq(alerts.status, 'active'));
  const symbols = rows.map((r) => r.symbol);
  const result: CheckResult = { checked: 0, triggered: 0, skipped: 0 };

  for (let i = 0; i < symbols.length; i++) {
    // At most 7 symbols per minute (the upstream per-minute budget).
    if (i > 0 && i % SYMBOLS_PER_MINUTE === 0) await sleep(60_000);
    const symbol = symbols[i]!;
    try {
      result.triggered += await checkSymbol(symbol);
      result.checked++;
    } catch (err) {
      console.error(`Alert check skipped for ${symbol}`, err);
      result.skipped++;
    }
  }

  return result;
}

/** Returns the number of alerts triggered for the symbol. Throws when no fresh price is available. */
async function checkSymbol(symbol: string): Promise<number> {
  const quote = await getQuote(symbol); // reuses the 60 s quote cache
  if (quote.stale) throw new Error('Only a stale quote is available');
  const price = quote.data.price;

  // Fires once: only rows still active change, and only those get an email.
  const fired = await db
    .update(alerts)
    .set({ status: 'triggered', triggeredPrice: price, triggeredAt: new Date() })
    .where(
      and(
        eq(alerts.symbol, symbol),
        eq(alerts.status, 'active'),
        dsql`((${alerts.condition} = 'above' and ${alerts.targetPrice} <= ${price})
           or (${alerts.condition} = 'below' and ${alerts.targetPrice} >= ${price}))`,
      ),
    )
    .returning();

  if (fired.length === 0) return 0;

  const userIds = [...new Set(fired.map((row) => row.userId))];
  const emails = await db.select({ id: users.id, email: users.email }).from(users).where(inArray(users.id, userIds));
  const emailById = new Map(emails.map((u) => [u.id, u.email]));

  await Promise.all(
    fired.map(async (row) => {
      const to = emailById.get(row.userId);
      if (!to) return;
      try {
        await sendAlertEmail(to, toAlert(row));
      } catch (err) {
        // The alert stays triggered: it fires once even if the email fails.
        console.error(`Alert email failed for alert ${row.id}`, err);
      }
    }),
  );

  return fired.length;
}
