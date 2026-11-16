import { Router } from 'express';
import { z } from 'zod';
import { AppError } from '../lib/errors.js';
import { symbolSchema } from '../lib/symbol.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { simulate } from '../services/simulator.js';
import { getMonthlyHistory } from '../services/twelveData.js';

const simulatorBody = z.object({
  symbol: symbolSchema,
  monthlyAmountUsd: z.number().finite().positive().max(1_000_000),
  years: z.union([z.literal(1), z.literal(3), z.literal(5)]),
});

export const simulatorRouter = Router();

simulatorRouter.post('/', requireAuth, validate({ body: simulatorBody }), async (req, res) => {
  const { symbol, monthlyAmountUsd, years } = req.body as z.infer<typeof simulatorBody>;
  const history = await getMonthlyHistory(symbol); // 0 credits when cached
  // The last N monthly closes (the latest month's close is today's price).
  const closes = history.data.slice(-years * 12);
  if (closes.length === 0) throw new AppError('NOT_FOUND', `No price history for ${symbol}`);

  res.json({
    symbol,
    monthlyAmountUsd,
    years,
    ...simulate(closes, monthlyAmountUsd),
    stale: history.stale,
    cachedAt: history.cachedAt,
  });
});
