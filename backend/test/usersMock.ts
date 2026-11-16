import { randomUUID } from 'node:crypto';
import type { UserRow } from '../src/services/users.js';
import type { NewRefreshToken, RefreshTokenRow } from '../src/services/tokens.js';

/** In-memory replacement for src/services/users.ts. */
export const store = new Map<string, UserRow>();

export const usersMock = {
  findUserByEmail: async (email: string) => [...store.values()].find((u) => u.email === email),
  findUserById: async (id: string) => store.get(id),
  createUser: async (email: string, passwordHash: string) => {
    if ([...store.values()].some((u) => u.email === email)) return undefined;
    const row: UserRow = { id: randomUUID(), email, passwordHash, createdAt: new Date() };
    store.set(row.id, row);
    return row;
  },
};

/** In-memory replacement for src/services/tokens.ts. */
export const refreshStore = new Map<string, RefreshTokenRow>();

export const tokensMock = {
  insertRefreshToken: async (t: NewRefreshToken) => {
    const id = randomUUID();
    refreshStore.set(id, { ...t, id, revokedAt: null, createdAt: new Date() });
  },
  findRefreshToken: async (hash: string) => [...refreshStore.values()].find((t) => t.tokenHash === hash),
  rotateRefreshToken: async (oldId: string, next: NewRefreshToken) => {
    const old = refreshStore.get(oldId);
    if (!old || old.revokedAt) return false;
    old.revokedAt = new Date();
    await tokensMock.insertRefreshToken(next);
    return true;
  },
  hasActiveFamilyToken: async (familyId: string) =>
    [...refreshStore.values()].some((t) => t.familyId === familyId && !t.revokedAt && t.expiresAt > new Date()),
  revokeRefreshFamily: async (familyId: string) => {
    for (const t of refreshStore.values()) if (t.familyId === familyId) t.revokedAt ??= new Date();
  },
};

export function resetAuthMocks() {
  store.clear();
  refreshStore.clear();
}
