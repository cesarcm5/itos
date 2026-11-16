import { Router } from 'express';
import { z } from 'zod';
import { symbolSchema } from '../lib/symbol.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { createAlert, deleteAlert, listAlerts, setAlertStatus } from '../services/alerts.js';

const createBody = z.object({
  symbol: symbolSchema,
  condition: z.enum(['above', 'below']),
  targetPrice: z.number().finite().positive().max(9_999_999_999),
});
const patchBody = z.object({ status: z.enum(['active', 'cancelled']) });
const idParams = z.object({ id: z.uuid() });

export const alertsRouter = Router();

alertsRouter.use(requireAuth);

alertsRouter.get('/', async (req, res) => {
  res.json({ items: await listAlerts(req.user!.id) });
});

alertsRouter.post('/', validate({ body: createBody }), async (req, res) => {
  res.status(201).json(await createAlert(req.user!.id, req.body as z.infer<typeof createBody>));
});

alertsRouter.patch('/:id', validate({ params: idParams, body: patchBody }), async (req, res) => {
  const { id } = req.params as z.infer<typeof idParams>;
  const { status } = req.body as z.infer<typeof patchBody>;
  res.json(await setAlertStatus(req.user!.id, id, status));
});

alertsRouter.delete('/:id', validate({ params: idParams }), async (req, res) => {
  const { id } = req.params as z.infer<typeof idParams>;
  await deleteAlert(req.user!.id, id);
  res.status(204).end();
});
