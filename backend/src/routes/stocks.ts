import { Router } from 'express';
import { z } from 'zod';
import { symbolSchema } from '../lib/symbol.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { getDailyHistory, getMonthlyHistory, getQuote, searchSymbols } from '../services/twelveData.js';

const searchQuery = z.object({ q: z.string().trim().min(1).max(20) });
const symbolParams = z.object({ symbol: symbolSchema });
const historyQuery = z.object({ range: z.enum(['1M', '6M', '1Y', '5Y']).default('1Y') });

type Range = z.infer<typeof historyQuery>['range'];

const RANGE_MONTHS: Record<Range, number> = { '1M': 1, '6M': 6, '1Y': 12, '5Y': 60 };

function startDate(range: Range): string {
  const d = new Date();
  d.setUTCMonth(d.getUTCMonth() - RANGE_MONTHS[range]);
  return d.toISOString().slice(0, 10);
}

export const stocksRouter = Router();

stocksRouter.use(requireAuth);

stocksRouter.get('/search', validate({ query: searchQuery }), async (req, res) => {
  const { q } = req.query as z.infer<typeof searchQuery>;
  const result = await searchSymbols(q);
  res.json({ results: result.data, stale: result.stale, cachedAt: result.cachedAt });
});

stocksRouter.get('/:symbol/quote', validate({ params: symbolParams }), async (req, res) => {
  const { symbol } = req.params as z.infer<typeof symbolParams>;
  const result = await getQuote(symbol);
  res.json({ ...result.data, stale: result.stale, cachedAt: result.cachedAt });
});

stocksRouter.get(
  '/:symbol/history',
  validate({ params: symbolParams, query: historyQuery }),
  async (req, res) => {
    const { symbol } = req.params as z.infer<typeof symbolParams>;
    const { range } = req.query as z.infer<typeof historyQuery>;
    // 1M/6M use daily closes, 1Y/5Y monthly closes. One cached series per interval.
    const result = range === '1M' || range === '6M' ? await getDailyHistory(symbol) : await getMonthlyHistory(symbol);
    const from = startDate(range);
    // Monthly bars are dated the 1st, so keep the bar that contains the start date.
    const cutoff = range === '1Y' || range === '5Y' ? from.slice(0, 8) + '01' : from;
    res.json({
      symbol,
      range,
      points: result.data.filter((p) => p.date >= cutoff),
      stale: result.stale,
      cachedAt: result.cachedAt,
    });
  },
);
