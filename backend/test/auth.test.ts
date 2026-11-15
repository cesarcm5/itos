import jwt from 'jsonwebtoken';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { store, usersMock } from './usersMock.js';

vi.mock('../src/services/users.js', () => usersMock);

const { app } = await import('../src/app.js');

const SECRET = process.env.JWT_SECRET!;
const creds = { email: 'Ana@Example.com', password: 'supersecret1' };

// Each test gets its own client IP (read via trust proxy) so the per-IP auth limits don't carry over.
let ipCounter = 0;
let ip = '';
const post = (path: string) => request(app).post(path).set('X-Forwarded-For', ip);

beforeEach(() => {
  store.clear();
  ip = `203.0.113.${++ipCounter}`;
});

describe('POST /auth/register', () => {
  it('creates a user, lowercases the email and returns a valid HS256 token', async () => {
    const res = await post('/auth/register').send(creds);

    expect(res.status).toBe(201);
    expect(res.body.user).toMatchObject({ email: 'ana@example.com' });
    expect(res.body.user).not.toHaveProperty('passwordHash');

    const decoded = jwt.verify(res.body.token, SECRET, { algorithms: ['HS256'] }) as jwt.JwtPayload;
    expect(decoded.sub).toBe(res.body.user.id);
    expect(decoded.email).toBe('ana@example.com');
    expect(decoded.exp! - decoded.iat!).toBe(24 * 60 * 60);

    const stored = store.get(res.body.user.id)!;
    expect(stored.passwordHash).not.toBe(creds.password);
    expect(stored.passwordHash).toMatch(/^\$2[aby]\$10\$/);
  });

  it('rejects a duplicate email (case-insensitive) with 409 EMAIL_TAKEN', async () => {
    await post('/auth/register').send(creds);
    const res = await post('/auth/register')
      .send({ ...creds, email: 'ANA@example.com' });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('EMAIL_TAKEN');
  });

  it('validates email and password length', async () => {
    const res = await post('/auth/register').send({ email: 'nope', password: 'short' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});

describe('POST /auth/login', () => {
  it('returns a token for valid credentials', async () => {
    await post('/auth/register').send(creds);
    const res = await post('/auth/login')
      .send({ email: '  ana@example.COM ', password: creds.password });

    expect(res.status).toBe(200);
    expect(res.body.token).toEqual(expect.any(String));
    expect(res.body.user.email).toBe('ana@example.com');
  });

  it('returns the same 401 for a wrong password and an unknown email', async () => {
    await post('/auth/register').send(creds);
    const wrongPassword = await post('/auth/login')
      .send({ email: creds.email, password: 'wrong-password' });
    const unknownEmail = await post('/auth/login')
      .send({ email: 'nobody@example.com', password: creds.password });

    expect(wrongPassword.status).toBe(401);
    expect(unknownEmail.status).toBe(401);
    expect(wrongPassword.body).toEqual(unknownEmail.body);
    expect(wrongPassword.body.error.code).toBe('INVALID_CREDENTIALS');
  });
});

describe('GET /auth/me', () => {
  it('returns the current user with a valid token', async () => {
    const { body } = await post('/auth/register').send(creds);
    const res = await request(app).get('/auth/me').set('Authorization', `Bearer ${body.token}`);

    expect(res.status).toBe(200);
    expect(res.body.user).toEqual(body.user);
  });

  it.each([
    ['no header', undefined],
    ['malformed header', 'Token abc'],
    ['bad signature', `Bearer ${jwt.sign({ email: 'x@y.z' }, 'another-secret-another-secret-123', { subject: crypto.randomUUID() })}`],
    ['expired token', `Bearer ${jwt.sign({ email: 'x@y.z' }, SECRET, { subject: crypto.randomUUID(), expiresIn: -10 })}`],
    ['alg none', `Bearer ${jwt.sign({ email: 'x@y.z' }, '', { subject: crypto.randomUUID(), algorithm: 'none' })}`],
  ])('returns 401 UNAUTHORIZED for %s', async (_label, header) => {
    const req = request(app).get('/auth/me');
    if (header) req.set('Authorization', header);
    const res = await req;

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('returns 401 when the user in a valid token no longer exists', async () => {
    const token = jwt.sign({ email: 'gone@example.com' }, SECRET, { subject: crypto.randomUUID() });
    const res = await request(app).get('/auth/me').set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(401);
  });
});

describe('error handling', () => {
  it('maps malformed JSON to 400 VALIDATION_ERROR', async () => {
    const res = await post('/auth/login')
      .set('Content-Type', 'application/json')
      .send('{"email":');

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 404 NOT_FOUND for unknown routes', async () => {
    const res = await request(app).get('/nope');

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });
});
