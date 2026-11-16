import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { tokensMock, usersMock } from './usersMock.js';

vi.mock('../src/services/users.js', () => usersMock);
vi.mock('../src/services/tokens.js', () => tokensMock);

// Separate file so the limiters start fresh (vitest isolates modules per file).
const { app } = await import('../src/app.js');

describe('auth rate limits (per IP)', () => {
  it('allows 6 login attempts per minute, then returns 429 with retryAfter', async () => {
    const body = { email: 'a@b.co', password: 'whatever' };
    for (let i = 0; i < 6; i++) {
      const res = await request(app).post('/auth/login').send(body);
      expect(res.status).toBe(401);
    }

    const res = await request(app).post('/auth/login').send(body);
    expect(res.status).toBe(429);
    expect(res.body.error.code).toBe('TOO_MANY_REQUESTS');
    expect(res.body.error.retryAfter).toBeGreaterThan(0);
    expect(res.body.error.retryAfter).toBeLessThanOrEqual(60);
    expect(res.headers['retry-after']).toBeDefined();
  });

  it('allows 5 sign-ups per hour, independent of the login limit', async () => {
    for (let i = 0; i < 5; i++) {
      const res = await request(app)
        .post('/auth/register')
        .send({ email: `user${i}@example.com`, password: 'supersecret1' });
      expect(res.status).toBe(201);
    }

    const res = await request(app)
      .post('/auth/register')
      .send({ email: 'user6@example.com', password: 'supersecret1' });
    expect(res.status).toBe(429);
    expect(res.body.error.code).toBe('TOO_MANY_REQUESTS');
    expect(res.body.error.retryAfter).toBeGreaterThan(60);
    expect(res.body.error.retryAfter).toBeLessThanOrEqual(3600);
  });

  it('does not rate-limit /auth/me', async () => {
    const res = await request(app).get('/auth/me');
    expect(res.status).toBe(401);
  });
});
