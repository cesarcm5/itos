import { Router } from 'express';
import { rateLimit, type AugmentedRequest } from 'express-rate-limit';
import { z } from 'zod';
import { AppError } from '../lib/errors.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { getCurrentUser, login, register } from '../services/auth.js';

function authLimiter(windowMs: number, limit: number) {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    handler: (req, _res, next) => {
      const resetTime = (req as AugmentedRequest).rateLimit?.resetTime;
      const retryAfter = resetTime
        ? Math.max(1, Math.ceil((resetTime.getTime() - Date.now()) / 1000))
        : windowMs / 1000;
      next(new AppError('TOO_MANY_REQUESTS', 'Too many attempts, try again later', { retryAfter }));
    },
  });
}

// Per IP. /auth/me isn't limited: it can't be brute-forced.
const registerLimiter = authLimiter(60 * 60 * 1000, 5); // 5 sign-ups / hour
const loginLimiter = authLimiter(60 * 1000, 6); // 6 attempts / minute

const email = z.string().trim().toLowerCase().pipe(z.email().max(254));

const registerSchema = z.object({
  email,
  // bcrypt only uses the first 72 bytes
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .refine((value) => Buffer.byteLength(value, 'utf8') <= 72, 'Password must be at most 72 bytes'),
});

const loginSchema = z.object({
  email,
  password: z.string().min(1).max(200),
});

type Credentials = { email: string; password: string };

export const authRouter = Router();

authRouter.post('/register', registerLimiter, validate({ body: registerSchema }), async (req, res) => {
  const { email, password } = req.body as Credentials;
  res.status(201).json(await register(email, password));
});

authRouter.post('/login', loginLimiter, validate({ body: loginSchema }), async (req, res) => {
  const { email, password } = req.body as Credentials;
  res.json(await login(email, password));
});

authRouter.get('/me', requireAuth, async (req, res) => {
  // requireAuth guarantees req.user
  res.json({ user: await getCurrentUser(req.user!.id) });
});
