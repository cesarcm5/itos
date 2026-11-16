import type { PricePoint } from './twelveData.js';

// Pure function: no DB or HTTP.

export const SIMULATOR_DISCLAIMER =
  'Past performance does not guarantee future results. Not financial advice. Price return only (dividends not included).';

export type SimulationPoint = { date: string; contributed: number; value: number };

export type SimulationResult = {
  months: number;
  shares: number;
  contributed: number;
  value: number;
  gain: number;
  gainPct: number;
  series: SimulationPoint[];
  disclaimer: string;
};

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * One buy of `monthlyAmount` at each monthly close (fractional shares).
 * `closes` must be sorted oldest first; the last close values the portfolio.
 */
export function simulate(closes: PricePoint[], monthlyAmount: number): SimulationResult {
  let shares = 0;
  let contributed = 0;
  const series: SimulationPoint[] = [];

  for (const point of closes) {
    if (!(point.close > 0)) continue;
    shares += monthlyAmount / point.close;
    contributed += monthlyAmount;
    series.push({ date: point.date, contributed: round2(contributed), value: round2(shares * point.close) });
  }

  const value = series.at(-1)?.value ?? 0;
  const gain = round2(value - contributed);

  return {
    months: series.length,
    shares: Math.round(shares * 1e6) / 1e6,
    contributed: round2(contributed),
    value,
    gain,
    gainPct: contributed > 0 ? round2((gain / contributed) * 100) : 0,
    series,
    disclaimer: SIMULATOR_DISCLAIMER,
  };
}
