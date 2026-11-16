import { Router } from 'express';
import { z } from 'zod';
import { AppError } from '../lib/errors.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { getProfile, upsertProfile, type Profile } from '../services/profile.js';

const money = z.number().finite().min(0).max(9_999_999_999.99);

export const profileSchema = z.object({
  monthlyIncomeMxn: money,
  monthlyExpensesMxn: money,
  hasEmergencyFund: z.boolean(),
  horizon: z.enum(['short', 'medium', 'long']),
  risk: z.enum(['low', 'medium', 'high']),
});

export const profileRouter = Router();

profileRouter.use(requireAuth);

profileRouter.get('/', async (req, res) => {
  const profile = await getProfile(req.user!.id);
  if (!profile) throw new AppError('NOT_FOUND', 'Profile not found');
  res.json(profile);
});

profileRouter.put('/', validate({ body: profileSchema }), async (req, res) => {
  res.json(await upsertProfile(req.user!.id, req.body as Profile));
});
