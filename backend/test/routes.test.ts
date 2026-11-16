import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../src/services/alertChecker.js', () => ({
  checkAlerts: vi.fn(async () => ({ checked: 2, triggered: 1, skipped: 0 })),
}));

const { app } = await import('../src/app.js');
const { signToken } = await import('../src/services/auth.js');

const token = signToken({ id: crypto.randomUUID(), email: 'ana@example.com' });
const auth = { Authorization: `Bearer ${token}` };

describe('protected routes', () => {
  it.each([
    ['get', '/profile'],
    ['get', '/recommendations'],
    ['get', '/stocks/search?q=voo'],
    ['get', '/stocks/VOO/quote'],
    ['get', '/stocks/VOO/history?range=1Y'],
    ['post', '/simulator'],
    ['get', '/watchlist'],
    ['get', '/alerts'],
  ] as const)('%s %s requires a token', async (method, path) => {
    const res = await request(app)[method](path);
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });
});

describe('validation (no DB or upstream reached)', () => {
  it.each([
    ['put', '/profile', { monthlyIncomeMxn: -1, monthlyExpensesMxn: 0, hasEmergencyFund: true, horizon: 'long', risk: 'low' }],
    ['post', '/simulator', { symbol: 'VOO', monthlyAmountUsd: 100, years: 2 }],
    ['post', '/simulator', { symbol: 'VOO', monthlyAmountUsd: 0, years: 1 }],
    ['post', '/watchlist', { symbol: 'not a symbol' }],
    ['post', '/alerts', { symbol: 'VOO', condition: 'sideways', targetPrice: 500 }],
    ['post', '/alerts', { symbol: 'VOO', condition: 'above', targetPrice: -5 }],
    ['patch', '/alerts/not-a-uuid', { status: 'active' }],
  ] as const)('%s %s rejects bad input', async (method, path, body) => {
    const res = await request(app)[method](path).set(auth).send(body);
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it.each(['', 'q'.repeat(21)])('search rejects q=%j', async (q) => {
    const res = await request(app).get('/stocks/search').query({ q }).set(auth);
    expect(res.status).toBe(400);
  });

  it('history rejects an unknown range', async () => {
    const res = await request(app).get('/stocks/VOO/history?range=2W').set(auth);
    expect(res.status).toBe(400);
  });
});

describe('POST /internal/check-alerts', () => {
  it('rejects a missing or wrong secret', async () => {
    expect((await request(app).post('/internal/check-alerts')).status).toBe(401);
    expect((await request(app).post('/internal/check-alerts').set('x-cron-secret', 'wrong')).status).toBe(401);
  });

  it('runs the check with the right secret', async () => {
    const res = await request(app).post('/internal/check-alerts').set('x-cron-secret', process.env.CRON_SECRET!);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ checked: 2, triggered: 1, skipped: 0 });
  });
});
