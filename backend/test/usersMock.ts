import { randomUUID } from 'node:crypto';
import type { UserRow } from '../src/services/users.js';

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
