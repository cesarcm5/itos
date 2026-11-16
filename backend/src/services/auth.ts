import { createHash, randomBytes, randomUUID } from 'node:crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { config } from '../config.js';
import { AppError } from '../lib/errors.js';
import {
  findRefreshToken,
  hasActiveFamilyToken,
  insertRefreshToken,
  revokeRefreshFamily,
  rotateRefreshToken,
} from './tokens.js';
import { createUser, findUserByEmail, findUserById, type UserRow } from './users.js';

const BCRYPT_COST = 10;
const ACCESS_TOKEN_TTL = '15m';
export const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;
/** A rotated refresh token still works this long, for parallel requests that sent the same one. */
export const REFRESH_REUSE_GRACE_MS = 30 * 1000;

// Compared against when the email doesn't exist, so a missing user takes as long as a wrong password.
const DUMMY_HASH = bcrypt.hashSync('itos-timing-equalizer', BCRYPT_COST);

export type AuthUser = { id: string; email: string };

export type PublicUser = { id: string; email: string; createdAt: string };

export type AuthResult = { token: string; refreshToken: string; user: PublicUser };

/** `refreshToken` is absent when a just-rotated token was reused inside the grace window. */
export type RefreshResult = { token: string; refreshToken?: string; user: PublicUser };

const tokenPayloadSchema = z.object({
  sub: z.uuid(),
  email: z.string(),
});

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function toPublicUser(row: UserRow): PublicUser {
  return { id: row.id, email: row.email, createdAt: row.createdAt.toISOString() };
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function newOpaqueToken(): { token: string; hash: string } {
  const token = randomBytes(32).toString('base64url');
  return { token, hash: hashToken(token) };
}

export function signToken(user: AuthUser): string {
  return jwt.sign({ email: user.email }, config.JWT_SECRET, {
    algorithm: 'HS256',
    expiresIn: ACCESS_TOKEN_TTL,
    subject: user.id,
  });
}

export function verifyToken(token: string): AuthUser {
  try {
    const decoded = jwt.verify(token, config.JWT_SECRET, { algorithms: ['HS256'] });
    const payload = tokenPayloadSchema.parse(decoded);
    return { id: payload.sub, email: payload.email };
  } catch {
    throw new AppError('UNAUTHORIZED', 'Invalid or expired token');
  }
}

function newRefreshToken(userId: string, familyId: string) {
  const { token, hash } = newOpaqueToken();
  return {
    token,
    row: { userId, familyId, tokenHash: hash, expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS) },
  };
}

/** Starts a new refresh-token family (one per login). */
async function startSession(user: UserRow): Promise<AuthResult> {
  const refresh = newRefreshToken(user.id, randomUUID());
  await insertRefreshToken(refresh.row);
  return { token: signToken(user), refreshToken: refresh.token, user: toPublicUser(user) };
}

export async function register(email: string, password: string): Promise<AuthResult> {
  const normalized = normalizeEmail(email);
  const passwordHash = await bcrypt.hash(password, BCRYPT_COST);
  const row = await createUser(normalized, passwordHash);
  if (!row) {
    throw new AppError('EMAIL_TAKEN', 'An account with this email already exists');
  }
  return startSession(row);
}

export async function login(email: string, password: string): Promise<AuthResult> {
  const row = await findUserByEmail(normalizeEmail(email));
  const valid = await bcrypt.compare(password, row?.passwordHash ?? DUMMY_HASH);
  if (!row || !valid) {
    throw new AppError('INVALID_CREDENTIALS', 'Incorrect email or password');
  }
  return startSession(row);
}

export async function refresh(refreshToken: string): Promise<RefreshResult> {
  const unauthorized = new AppError('UNAUTHORIZED', 'Invalid or expired refresh token');
  const row = await findRefreshToken(hashToken(refreshToken));
  if (!row || row.expiresAt.getTime() <= Date.now()) throw unauthorized;

  const user = await findUserById(row.userId);
  if (!user) throw unauthorized;

  if (!row.revokedAt) {
    const next = newRefreshToken(user.id, row.familyId);
    if (await rotateRefreshToken(row.id, next.row)) {
      return { token: signToken(user), refreshToken: next.token, user: toPublicUser(user) };
    }
  }

  // Already revoked (or a parallel request rotated it just now). A recent rotation with a live
  // successor is a benign race: hand out an access token only. Anything else is reuse.
  const revokedAt = row.revokedAt?.getTime() ?? Date.now();
  if (Date.now() - revokedAt <= REFRESH_REUSE_GRACE_MS && (await hasActiveFamilyToken(row.familyId))) {
    return { token: signToken(user), user: toPublicUser(user) };
  }
  await revokeRefreshFamily(row.familyId);
  throw unauthorized;
}

export async function logout(refreshToken: string): Promise<void> {
  const row = await findRefreshToken(hashToken(refreshToken));
  if (row) await revokeRefreshFamily(row.familyId);
}

export async function getCurrentUser(id: string): Promise<PublicUser> {
  const row = await findUserById(id);
  if (!row) {
    throw new AppError('UNAUTHORIZED', 'User no longer exists');
  }
  return toPublicUser(row);
}
