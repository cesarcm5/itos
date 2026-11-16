import { Router } from 'express';
import { z } from 'zod';
import { AppError } from '../lib/errors.js';
import { symbolSchema } from '../lib/symbol.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { addToWatchlist, listWatchlist, removeFromWatchlist } from '../services/watchlist.js';

const symbolBody = z.object({ symbol: symbolSchema });
const symbolParams = z.object({ symbol: symbolSchema });

export const watchlistRouter = Router();

watchlistRouter.use(requireAuth);

watchlistRouter.get('/', async (req, res) => {
  res.json({ items: await listWatchlist(req.user!.id) });
});

watchlistRouter.post('/', validate({ body: symbolBody }), async (req, res) => {
  const { symbol } = req.body as z.infer<typeof symbolBody>;
  res.status(201).json({ items: await addToWatchlist(req.user!.id, symbol) });
});

watchlistRouter.delete('/:symbol', validate({ params: symbolParams }), async (req, res) => {
  const { symbol } = req.params as z.infer<typeof symbolParams>;
  const removed = await removeFromWatchlist(req.user!.id, symbol);
  if (!removed) throw new AppError('NOT_FOUND', `${symbol} is not in your watchlist`);
  res.json({ items: await listWatchlist(req.user!.id) });
});
