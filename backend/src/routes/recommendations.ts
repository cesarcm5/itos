import { Router } from 'express';
import { AppError } from '../lib/errors.js';
import { requireAuth } from '../middleware/auth.js';
import { getProfile } from '../services/profile.js';
import { buildRecommendation } from '../services/recommendation.js';
import { getUsdMxn } from '../services/twelveData.js';

export const recommendationsRouter = Router();

recommendationsRouter.get('/', requireAuth, async (req, res) => {
  const profile = await getProfile(req.user!.id);
  if (!profile) throw new AppError('NOT_FOUND', 'Profile not found');

  const recommendation = buildRecommendation(profile);

  // The USD figure is a convenience for the simulator (US assets). Without a rate, it's omitted.
  let fx: { rate: number; asOf: string; stale: boolean } | null = null;
  try {
    const cached = await getUsdMxn();
    fx = { rate: cached.data.rate, asOf: cached.data.asOf, stale: cached.stale };
  } catch (err) {
    console.error('USD/MXN unavailable for recommendations', err);
  }

  res.json({
    ...recommendation,
    suggestedMonthlyUsd: fx ? Math.round((recommendation.suggestedMonthly / fx.rate) * 100) / 100 : null,
    fx,
  });
});
