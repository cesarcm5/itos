import { beforeEach, describe, expect, it, vi } from 'vitest';

// In-memory stand-in for the two daily counters. A throw inside `transaction` discards its writes.
const counters = { global: new Map<string, number>(), user: new Map<string, number>() };

vi.mock('../src/db/client.js', async () => {
  const schema = await import('../src/db/schema.js');
  type Values = { date: string; creditsUsed: number; userId?: string };
  const makeTx = (staged: typeof counters) => ({
    insert: (table: unknown) => ({
      values: (v: Values) => ({
        onConflictDoUpdate: () => ({
          returning: async () => {
            const isUser = table === schema.userApiUsage;
            const map = isUser ? staged.user : staged.global;
            const key = isUser ? `${v.userId}:${v.date}` : v.date;
            const { USER_DAILY_LIMIT, DAILY_LIMIT } = await import('../src/services/rateLimiter.js');
            const limit = isUser ? USER_DAILY_LIMIT : DAILY_LIMIT;
            const current = map.get(key);
            if (current !== undefined && current + v.creditsUsed > limit) return [];
            map.set(key, (current ?? 0) + v.creditsUsed);
            return [{ creditsUsed: map.get(key) }];
          },
        }),
      }),
    }),
  });
  return {
    db: {
      transaction: async (fn: (tx: ReturnType<typeof makeTx>) => Promise<void>) => {
        const staged = { global: new Map(counters.global), user: new Map(counters.user) };
        await fn(makeTx(staged));
        counters.global = staged.global;
        counters.user = staged.user;
      },
    },
  };
});

const { acquireCredits, resetMinuteWindow, USER_DAILY_LIMIT, DAILY_LIMIT } = await import(
  '../src/services/rateLimiter.js'
);
const { runWithUser } = await import('../src/lib/requestContext.js');

const today = () => new Date().toISOString().slice(0, 10);
const ana = crypto.randomUUID();

beforeEach(() => {
  counters.global = new Map();
  counters.user = new Map();
  resetMinuteWindow();
});

describe('acquireCredits daily quotas', () => {
  it('charges the user from the request context and the global budget', async () => {
    await runWithUser(ana, () => acquireCredits(1));
    expect(counters.user.get(`${ana}:${today()}`)).toBe(1);
    expect(counters.global.get(today())).toBe(1);
  });

  it('charges only the global budget outside a request (alerts)', async () => {
    await acquireCredits(1);
    expect(counters.user.size).toBe(0);
    expect(counters.global.get(today())).toBe(1);
  });

  it('refuses once the user spent their daily quota, without touching the global budget', async () => {
    counters.user.set(`${ana}:${today()}`, USER_DAILY_LIMIT);
    counters.global.set(today(), 10);

    const err = await runWithUser(ana, () => acquireCredits(1)).catch((e: unknown) => e);
    expect(err).toMatchObject({ code: 'RATE_LIMITED', status: 503 });
    expect((err as { retryAfter: number }).retryAfter).toBeGreaterThan(0);
    expect(counters.global.get(today())).toBe(10);

    // Another user is unaffected, and the minute slot was released.
    await runWithUser(crypto.randomUUID(), () => acquireCredits(1));
    expect(counters.global.get(today())).toBe(11);
  });

  it('rolls back the user charge when the global budget is exhausted', async () => {
    counters.global.set(today(), DAILY_LIMIT);
    await expect(runWithUser(ana, () => acquireCredits(1))).rejects.toMatchObject({ code: 'RATE_LIMITED' });
    expect(counters.user.get(`${ana}:${today()}`)).toBeUndefined();
  });
});

describe('requireAuth request context', () => {
  it('exposes the user id to async code downstream of the middleware', async () => {
    const { default: express } = await import('express');
    const { default: request } = await import('supertest');
    const { requireAuth } = await import('../src/middleware/auth.js');
    const { signToken } = await import('../src/services/auth.js');
    const { currentUserId } = await import('../src/lib/requestContext.js');

    const app = express();
    app.get('/whoami', requireAuth, async (_req, res) => {
      await new Promise((resolve) => setTimeout(resolve, 5));
      res.json({ userId: currentUserId() ?? null });
    });

    const res = await request(app)
      .get('/whoami')
      .set('Authorization', `Bearer ${signToken({ id: ana, email: 'ana@example.com' })}`);
    expect(res.body.userId).toBe(ana);
  });
});
