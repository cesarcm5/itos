import { timingSafeEqual } from 'node:crypto';
import { Router, type RequestHandler } from 'express';
import { config } from '../config.js';
import { AppError } from '../lib/errors.js';
import { checkAlerts } from '../services/alertChecker.js';

const requireCronSecret: RequestHandler = (req, _res, next) => {
  const provided = Buffer.from(req.get('x-cron-secret') ?? '');
  const expected = Buffer.from(config.CRON_SECRET);
  if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) {
    throw new AppError('UNAUTHORIZED', 'Invalid cron secret');
  }
  next();
};

export const internalRouter = Router();

// Same check as the cron job, on demand. Works even with ALERTS_CRON_ENABLED=false.
internalRouter.post('/check-alerts', requireCronSecret, async (_req, res) => {
  res.json(await checkAlerts());
});
