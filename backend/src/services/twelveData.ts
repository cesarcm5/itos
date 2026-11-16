import { z } from 'zod';
import { config } from '../config.js';
import { AppError } from '../lib/errors.js';
import { getOrFetch, TTL, type Cached } from './marketCache.js';
import { acquireCredits } from './rateLimiter.js';

// The only module that calls Twelve Data. Every public function goes through marketCache.

const BASE_URL = 'https://api.twelvedata.com';
const TIMEOUT_MS = 10_000;

const errorBodySchema = z.object({
  status: z.literal('error'),
  code: z.number().optional(),
  message: z.string().optional(),
});

const num = z.coerce.number().refine(Number.isFinite);
const optionalNum = z
  .union([z.string(), z.number(), z.null()])
  .optional()
  .transform((value) => {
    const n = value === null || value === undefined || value === '' ? Number.NaN : Number(value);
    return Number.isFinite(n) ? n : null;
  });

const quoteSchema = z.object({
  symbol: z.string(),
  name: z.string(),
  exchange: z.string(),
  currency: z.string(),
  datetime: z.string(),
  timestamp: z.number(),
  open: num,
  high: num,
  low: num,
  close: num,
  previous_close: num,
  change: num,
  percent_change: num,
  volume: optionalNum,
  is_market_open: z.boolean().optional(),
  fifty_two_week: z.object({ low: optionalNum, high: optionalNum }).optional(),
});

const timeSeriesSchema = z.object({
  values: z.array(z.object({ datetime: z.string(), close: num })),
});

const searchSchema = z.object({
  data: z.array(
    z.object({
      symbol: z.string(),
      instrument_name: z.string(),
      exchange: z.string(),
      instrument_type: z.string(),
      country: z.string(),
      currency: z.string(),
    }),
  ),
});

const exchangeRateSchema = z.object({ rate: num, timestamp: z.number() });

export type Quote = {
  symbol: string;
  name: string;
  exchange: string;
  currency: string;
  price: number;
  open: number;
  high: number;
  low: number;
  previousClose: number;
  change: number;
  percentChange: number;
  volume: number | null;
  fiftyTwoWeekLow: number | null;
  fiftyTwoWeekHigh: number | null;
  isMarketOpen: boolean | null;
  /** Upstream timestamp of the price. */
  asOf: string;
};

export type PricePoint = { date: string; close: number };

export type SymbolMatch = { symbol: string; name: string; exchange: string; type: string; currency: string };

export type FxRate = { pair: 'USD/MXN'; rate: number; asOf: string };

async function request<T>(endpoint: string, params: Record<string, string>, schema: z.ZodType<T>): Promise<T> {
  await acquireCredits(1);

  const url = new URL(endpoint, BASE_URL);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  url.searchParams.set('apikey', config.TWELVE_DATA_API_KEY);

  let res: Response;
  try {
    res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
  } catch (err) {
    console.error(`Twelve Data ${endpoint} request failed`, err);
    throw new AppError('UPSTREAM_ERROR', 'Market data provider is unavailable');
  }

  const body: unknown = await res.json().catch(() => null);

  // Twelve Data may answer HTTP 200 with { status: "error", code, message }.
  const asError = errorBodySchema.safeParse(body);
  if (asError.success || !res.ok) {
    const code = asError.success ? asError.data.code : res.status;
    const message = asError.success ? asError.data.message : undefined;
    if (code === 429) {
      throw new AppError('RATE_LIMITED', 'Market data limit reached, try again in a minute', { retryAfter: 60 });
    }
    if (code === 400 || code === 404) {
      throw new AppError('NOT_FOUND', 'Symbol not found');
    }
    console.error(`Twelve Data ${endpoint} error`, code, message);
    throw new AppError('UPSTREAM_ERROR', 'Market data provider returned an error');
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    console.error(`Twelve Data ${endpoint} unexpected payload`, parsed.error.issues);
    throw new AppError('UPSTREAM_ERROR', 'Unexpected response from market data provider');
  }
  return parsed.data;
}

export function getQuote(symbol: string): Promise<Cached<Quote>> {
  return getOrFetch(`quote:${symbol}`, TTL.quote, async () => {
    const q = await request('/quote', { symbol }, quoteSchema);
    return {
      symbol: q.symbol,
      name: q.name,
      exchange: q.exchange,
      currency: q.currency,
      price: q.close,
      open: q.open,
      high: q.high,
      low: q.low,
      previousClose: q.previous_close,
      change: q.change,
      percentChange: q.percent_change,
      volume: q.volume,
      fiftyTwoWeekLow: q.fifty_two_week?.low ?? null,
      fiftyTwoWeekHigh: q.fifty_two_week?.high ?? null,
      isMarketOpen: q.is_market_open ?? null,
      asOf: new Date(q.timestamp * 1000).toISOString(),
    };
  });
}

// One series per interval is cached and sliced per range, so 1M/6M share a call and 1Y/5Y/simulator share another.
const DAILY_POINTS = 130; // ~6 months of trading days
const MONTHLY_POINTS = 61; // 5 years + the current month

async function timeSeries(symbol: string, interval: '1day' | '1month', outputsize: number): Promise<PricePoint[]> {
  const ts = await request('/time_series', { symbol, interval, outputsize: String(outputsize) }, timeSeriesSchema);
  // Upstream returns newest first; we return oldest first.
  return ts.values.map((v) => ({ date: v.datetime.slice(0, 10), close: v.close })).reverse();
}

export function getDailyHistory(symbol: string): Promise<Cached<PricePoint[]>> {
  return getOrFetch(`history:${symbol}:1day`, TTL.dailyHistory, () => timeSeries(symbol, '1day', DAILY_POINTS));
}

export function getMonthlyHistory(symbol: string): Promise<Cached<PricePoint[]>> {
  return getOrFetch(`history:${symbol}:1month`, TTL.monthlyHistory, () =>
    timeSeries(symbol, '1month', MONTHLY_POINTS),
  );
}

const MAX_SEARCH_RESULTS = 10;

export function searchSymbols(query: string): Promise<Cached<SymbolMatch[]>> {
  const q = query.trim().toUpperCase();
  return getOrFetch(`search:${q}`, TTL.search, async () => {
    const { data } = await request('/symbol_search', { symbol: q, outputsize: '30' }, searchSchema);
    // The free plan only covers US markets.
    return data
      .filter((item) => item.country === 'United States')
      .slice(0, MAX_SEARCH_RESULTS)
      .map((item) => ({
        symbol: item.symbol,
        name: item.instrument_name,
        exchange: item.exchange,
        type: item.instrument_type,
        currency: item.currency,
      }));
  });
}

export function getUsdMxn(): Promise<Cached<FxRate>> {
  return getOrFetch('fx:USD/MXN', TTL.fx, async () => {
    const fx = await request('/exchange_rate', { symbol: 'USD/MXN' }, exchangeRateSchema);
    return { pair: 'USD/MXN' as const, rate: fx.rate, asOf: new Date(fx.timestamp * 1000).toISOString() };
  });
}
