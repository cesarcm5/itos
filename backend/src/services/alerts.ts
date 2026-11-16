import { and, asc, count, eq, sql as dsql } from 'drizzle-orm';
import { db } from '../db/client.js';
import { alerts } from '../db/schema.js';
import { AppError } from '../lib/errors.js';

export const ALERT_LIMIT = 5;

type AlertRow = typeof alerts.$inferSelect;

export type AlertCondition = AlertRow['condition'];

export type Alert = {
  id: string;
  symbol: string;
  condition: AlertCondition;
  targetPrice: number;
  status: AlertRow['status'];
  triggeredPrice: number | null;
  triggeredAt: string | null;
};

export function toAlert(row: AlertRow): Alert {
  return {
    id: row.id,
    symbol: row.symbol,
    condition: row.condition,
    targetPrice: row.targetPrice,
    status: row.status,
    triggeredPrice: row.triggeredPrice,
    triggeredAt: row.triggeredAt?.toISOString() ?? null,
  };
}

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/** Serializes active-count checks per user so two requests can't both pass the limit. */
async function assertUnderLimit(tx: Tx, userId: string): Promise<void> {
  await tx.execute(dsql`select pg_advisory_xact_lock(hashtext(${userId}))`);
  const [result] = await tx
    .select({ active: count() })
    .from(alerts)
    .where(and(eq(alerts.userId, userId), eq(alerts.status, 'active')));
  if ((result?.active ?? 0) >= ALERT_LIMIT) {
    throw new AppError('ALERT_LIMIT', `You can have at most ${ALERT_LIMIT} active alerts`);
  }
}

export async function listAlerts(userId: string): Promise<Alert[]> {
  const rows = await db.select().from(alerts).where(eq(alerts.userId, userId)).orderBy(asc(alerts.status), asc(alerts.symbol));
  return rows.map(toAlert);
}

export async function createAlert(
  userId: string,
  input: { symbol: string; condition: AlertCondition; targetPrice: number },
): Promise<Alert> {
  return db.transaction(async (tx) => {
    await assertUnderLimit(tx, userId);
    const [row] = await tx.insert(alerts).values({ userId, ...input }).returning();
    return toAlert(row!);
  });
}

/** Re-activates (resets the trigger) or cancels an alert. */
export async function setAlertStatus(userId: string, id: string, status: 'active' | 'cancelled'): Promise<Alert> {
  return db.transaction(async (tx) => {
    const [current] = await tx
      .select()
      .from(alerts)
      .where(and(eq(alerts.id, id), eq(alerts.userId, userId)))
      .limit(1);
    if (!current) throw new AppError('NOT_FOUND', 'Alert not found');
    if (current.status === status) return toAlert(current);

    if (status === 'active') await assertUnderLimit(tx, userId);

    const [row] = await tx
      .update(alerts)
      .set(status === 'active' ? { status, triggeredPrice: null, triggeredAt: null } : { status })
      .where(and(eq(alerts.id, id), eq(alerts.userId, userId)))
      .returning();
    return toAlert(row!);
  });
}

export async function deleteAlert(userId: string, id: string): Promise<void> {
  const deleted = await db
    .delete(alerts)
    .where(and(eq(alerts.id, id), eq(alerts.userId, userId)))
    .returning({ id: alerts.id });
  if (deleted.length === 0) throw new AppError('NOT_FOUND', 'Alert not found');
}
