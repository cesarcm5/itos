import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../src/services/marketCacheStore.js', () => ({
  readCacheRow: async () => undefined,
  writeCacheRow: async () => undefined,
}));
vi.mock('../src/services/rateLimiter.js', () => ({ acquireCredits: vi.fn(async () => undefined) }));

const { getQuote, getMonthlyHistory, searchSymbols } = await import('../src/services/twelveData.js');
const { acquireCredits } = await import('../src/services/rateLimiter.js');

function mockFetch(body: unknown, status = 200) {
  vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(body), { status })));
}

beforeEach(() => vi.mocked(acquireCredits).mockClear());
afterEach(() => vi.unstubAllGlobals());

describe('twelveData', () => {
  it('normalizes a quote and spends one credit', async () => {
    mockFetch({
      symbol: 'VOO',
      name: 'Vanguard S&P 500 ETF',
      exchange: 'NYSE',
      currency: 'USD',
      datetime: '2026-11-13',
      timestamp: 1_794_600_000,
      open: '600.1',
      high: '605',
      low: '598',
      close: '603.5',
      volume: '1000',
      previous_close: '600',
      change: '3.5',
      percent_change: '0.58',
      is_market_open: false,
      fifty_two_week: { low: '480', high: '610' },
    });
    const { data, stale } = await getQuote('VOO');
    expect(stale).toBe(false);
    expect(data).toMatchObject({ symbol: 'VOO', price: 603.5, previousClose: 600, fiftyTwoWeekHigh: 610 });
    expect(acquireCredits).toHaveBeenCalledWith(1);
  });

  it('treats HTTP 200 with status "error" code 429 as RATE_LIMITED', async () => {
    mockFetch({ status: 'error', code: 429, message: 'You have run out of API credits' });
    await expect(getQuote('AAPL')).rejects.toMatchObject({ code: 'RATE_LIMITED' });
  });

  it('maps an unknown symbol to NOT_FOUND', async () => {
    mockFetch({ status: 'error', code: 400, message: '**symbol** not found' });
    await expect(getQuote('ZZZZ')).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  it('maps other upstream failures to UPSTREAM_ERROR', async () => {
    mockFetch({ status: 'error', code: 500, message: 'boom' });
    await expect(getQuote('MSFT')).rejects.toMatchObject({ code: 'UPSTREAM_ERROR' });
  });

  it('returns history oldest first', async () => {
    mockFetch({
      status: 'ok',
      values: [
        { datetime: '2026-11-01', close: '3' },
        { datetime: '2026-10-01', close: '2' },
      ],
    });
    const { data } = await getMonthlyHistory('VTI');
    expect(data).toEqual([
      { date: '2026-10-01', close: 2 },
      { date: '2026-11-01', close: 3 },
    ]);
  });

  it('keeps only US search results, max 10', async () => {
    const item = (symbol: string, country: string) => ({
      symbol,
      instrument_name: symbol,
      exchange: 'NASDAQ',
      instrument_type: 'Common Stock',
      country,
      currency: 'USD',
    });
    mockFetch({
      status: 'ok',
      data: [item('AAPL', 'United States'), item('AAPL', 'Mexico'), ...Array.from({ length: 12 }, (_, i) => item(`A${i}`, 'United States'))],
    });
    const { data } = await searchSymbols('a');
    expect(data).toHaveLength(10);
    expect(data[0]).toEqual({ symbol: 'AAPL', name: 'AAPL', exchange: 'NASDAQ', type: 'Common Stock', currency: 'USD' });
  });
});
