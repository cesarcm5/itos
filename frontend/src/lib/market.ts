// Response shapes from /stocks/* and /simulator (backend/src/routes/stocks.ts, simulator.ts).

import { ApiError } from "@/lib/api-client";

/** Same rule as the API's symbolSchema (backend/src/lib/symbol.ts). */
export const SYMBOL_PATTERN = /^[A-Z0-9][A-Z0-9.-]{0,9}$/;

export function normalizeSymbol(raw: string): string | null {
  const symbol = raw.trim().toUpperCase();
  return SYMBOL_PATTERN.test(symbol) ? symbol : null;
}

type Freshness = { stale: boolean; cachedAt: string };

export type Quote = Freshness & {
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

export const RANGES = ["1M", "6M", "1Y", "5Y"] as const;
export type Range = (typeof RANGES)[number];

export type PricePoint = { date: string; close: number };

export type History = Freshness & { symbol: string; range: Range; points: PricePoint[] };

export const SIMULATOR_YEARS = [1, 3, 5] as const;
export type SimulatorYears = (typeof SIMULATOR_YEARS)[number];

/** What the user asked for, as sent to the API, plus the MXN figure for the copy. */
export type SimulationRequest = {
  symbol: string;
  monthlyAmountUsd: number;
  years: SimulatorYears;
  /** The amount the user typed, when it was in MXN. */
  monthlyAmountMxn: number | null;
  fxRate: number | null;
};

export type SimulationPoint = { date: string; contributed: number; value: number };

export type Simulation = Freshness & {
  symbol: string;
  monthlyAmountUsd: number;
  years: SimulatorYears;
  months: number;
  shares: number;
  contributed: number;
  value: number;
  gain: number;
  gainPct: number;
  series: SimulationPoint[];
  disclaimer: string;
};

export type AlertCondition = "above" | "below";

export type Alert = {
  id: string;
  symbol: string;
  condition: AlertCondition;
  targetPrice: number;
  status: "active" | "triggered" | "cancelled";
  triggeredPrice: number | null;
  triggeredAt: string | null;
};

export const quoteKey = (symbol: string) => ["quote", symbol] as const;
export const historyKey = (symbol: string, range: Range) => ["history", symbol, range] as const;
export const ALERTS_KEY = ["alerts"] as const;

/**
 * TanStack Query retry rule for API data: 4xx won't fix itself, and retrying a
 * RATE_LIMITED 503 only spends the upstream budget we just ran out of.
 */
export function retryApi(failureCount: number, error: Error): boolean {
  if (error instanceof ApiError && (error.status < 500 || error.code === "RATE_LIMITED")) return false;
  return failureCount < 2;
}
