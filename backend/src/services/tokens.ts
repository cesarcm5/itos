import { and, eq, gt, isNull } from 'drizzle-orm';
import { db } from '../db/client.js';
import { refreshTokens } from '../db/schema.js';

// DB access for refresh tokens. Only hashes are stored.

export type RefreshTokenRow = typeof refreshTokens.$inferSelect;
export type NewRefreshToken = Pick<RefreshTokenRow, 'userId' | 'familyId' | 'tokenHash' | 'expiresAt'>;

export async function insertRefreshToken(token: NewRefreshToken): Promise<void> {
  await db.insert(refreshTokens).values(token);
}

export async function findRefreshToken(tokenHash: string): Promise<RefreshTokenRow | undefined> {
  const [row] = await db.select().from(refreshTokens).where(eq(refreshTokens.tokenHash, tokenHash)).limit(1);
  return row;
}

/**
 * Revokes `oldId` and inserts its successor in one transaction. Returns false when
 * another request already revoked it (the row lock makes the loser wait for the winner's commit).
 */
export async function rotateRefreshToken(oldId: string, next: NewRefreshToken): Promise<boolean> {
  return db.transaction(async (tx) => {
    const revoked = await tx
      .update(refreshTokens)
      .set({ revokedAt: new Date() })
      .where(and(eq(refreshTokens.id, oldId), isNull(refreshTokens.revokedAt)))
      .returning({ id: refreshTokens.id });
    if (revoked.length === 0) return false;
    await tx.insert(refreshTokens).values(next);
    return true;
  });
}

/** True when the family still has a usable token (it was rotated, not logged out or reset). */
export async function hasActiveFamilyToken(familyId: string): Promise<boolean> {
  const [row] = await db
    .select({ id: refreshTokens.id })
    .from(refreshTokens)
    .where(
      and(
        eq(refreshTokens.familyId, familyId),
        isNull(refreshTokens.revokedAt),
        gt(refreshTokens.expiresAt, new Date()),
      ),
    )
    .limit(1);
  return row !== undefined;
}

export async function revokeRefreshFamily(familyId: string): Promise<void> {
  await db
    .update(refreshTokens)
    .set({ revokedAt: new Date() })
    .where(and(eq(refreshTokens.familyId, familyId), isNull(refreshTokens.revokedAt)));
}
