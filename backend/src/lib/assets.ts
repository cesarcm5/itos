// Curated, hardcoded suggestions keyed by (horizon, risk). Zero API credits.

export type Horizon = 'short' | 'medium' | 'long';
export type Risk = 'low' | 'medium' | 'high';

export type SuggestedAsset = { symbol: string; name: string; why: string };

export type AssetSuggestion = { focus: string; assets: SuggestedAsset[]; note?: string };

const SHY: SuggestedAsset = {
  symbol: 'SHY',
  name: 'iShares 1-3 Year Treasury Bond ETF',
  why: 'Short-term US Treasuries: low volatility for money you need soon.',
};
const BND: SuggestedAsset = {
  symbol: 'BND',
  name: 'Vanguard Total Bond Market ETF',
  why: 'Broad, diversified bonds that cushion stock market drops.',
};
const VOO: SuggestedAsset = {
  symbol: 'VOO',
  name: 'Vanguard S&P 500 ETF',
  why: "The 500 largest US companies in one low-cost fund.",
};
const VTI: SuggestedAsset = {
  symbol: 'VTI',
  name: 'Vanguard Total Stock Market ETF',
  why: 'The entire US stock market: large, mid and small companies.',
};
const VXUS: SuggestedAsset = {
  symbol: 'VXUS',
  name: 'Vanguard Total International Stock ETF',
  why: 'Companies outside the US, so you are not tied to one economy.',
};
const QQQ: SuggestedAsset = {
  symbol: 'QQQ',
  name: 'Invesco QQQ Trust',
  why: 'The 100 largest Nasdaq companies: more growth, more ups and downs.',
};

const shortTerm: AssetSuggestion = {
  focus: 'Fixed income',
  assets: [SHY, BND],
  note: 'In Mexico, CETES are a common fixed-income option for short horizons.',
};

const table: Record<Horizon, Record<Risk, AssetSuggestion>> = {
  short: { low: shortTerm, medium: shortTerm, high: shortTerm },
  medium: {
    low: { focus: 'Balanced', assets: [BND, VOO] },
    medium: { focus: 'Balanced', assets: [BND, VOO] },
    high: { focus: 'Equity-leaning', assets: [VOO, VXUS] },
  },
  long: {
    low: { focus: 'Broad market', assets: [VOO, VTI, VXUS] },
    medium: { focus: 'Broad market', assets: [VOO, VTI, VXUS] },
    high: { focus: 'Broad market + growth', assets: [VTI, QQQ] },
  },
};

export function suggestAssets(horizon: Horizon, risk: Risk): AssetSuggestion {
  return table[horizon][risk];
}
