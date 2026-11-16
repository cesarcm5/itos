import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { config } from '../config.js';
import { AppError } from '../lib/errors.js';
import { createUser, findUserByEmail, findUserById, type UserRow } from './users.js';

const BCRYPT_COST = 10;
const TOKEN_TTL = '24h';

// Compared against when the email doesn't exist, so a missing user takes as long as a wrong password.
const DUMMY_HASH = bcrypt.hashSync('itos-timing-equalizer', BCRYPT_COST);

export type AuthUser = { id: string; email: string };

export type PublicUser = { id: string; email: string; createdAt: string };

export type AuthResult = { token: string; user: PublicUser };

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

export function signToken(user: AuthUser): string {
  return jwt.sign({ email: user.email }, config.JWT_SECRET, {
    algorithm: 'HS256',
    expiresIn: TOKEN_TTL,
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

export async function register(email: string, password: string): Promise<AuthResult> {
  const normalized = normalizeEmail(email);
  const passwordHash = await bcrypt.hash(password, BCRYPT_COST);
  const row = await createUser(normalized, passwordHash);
  if (!row) {
    throw new AppError('EMAIL_TAKEN', 'An account with this email already exists');
  }
  return { token: signToken(row), user: toPublicUser(row) };
}

export async function login(email: string, password: string): Promise<AuthResult> {
  const row = await findUserByEmail(normalizeEmail(email));
  const valid = await bcrypt.compare(password, row?.passwordHash ?? DUMMY_HASH);
  if (!row || !valid) {
    throw new AppError('INVALID_CREDENTIALS', 'Incorrect email or password');
  }
  return { token: signToken(row), user: toPublicUser(row) };
}

export async function getCurrentUser(id: string): Promise<PublicUser> {
  const row = await findUserById(id);
  if (!row) {
    throw new AppError('UNAUTHORIZED', 'User no longer exists');
  }
  return toPublicUser(row);
}
