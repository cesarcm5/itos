// Response shapes from GET /recommendations and GET /watchlist (backend/src/routes).
// The API's `math`, `tips`, `focus` and `why` strings are in English; the UI builds its
// Spanish copy from the numeric fields and the maps below, falling back to the API text.

export type SuggestedAsset = { symbol: string; name: string; why: string };

export type AssetSuggestion = { focus: string; assets: SuggestedAsset[]; note?: string };

export type Recommendation = {
  surplus: number;
  emergencyTarget: number;
  hasEmergencyFund: boolean;
  investShare: number;
  suggestedMonthly: number;
  remainder: number;
  where: AssetSuggestion;
  suggestedMonthlyUsd: number | null;
  fx: { rate: number; asOf: string; stale: boolean } | null;
};

export type WatchlistItem = { symbol: string; createdAt: string };
export type Watchlist = { items: WatchlistItem[] };

export const EMERGENCY_MONTHS = 6;

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Income and expenses aren't in the response, but they follow from it. */
export function profileNumbers(rec: Recommendation) {
  const expenses = round2(rec.emergencyTarget / EMERGENCY_MONTHS);
  return { expenses, income: round2(rec.surplus + expenses) };
}

const RISK_BY_SHARE: Record<number, string> = { 0.3: "bajo", 0.5: "medio", 0.7: "alto" };

export function riskLabel(investShare: number): string | null {
  return RISK_BY_SHARE[investShare] ?? null;
}

/** Whole months of surplus needed to reach the emergency-fund target. */
export function monthsToFund(rec: Recommendation): number | null {
  if (rec.surplus <= 0) return null;
  return Math.ceil(rec.emergencyTarget / rec.surplus);
}

const FOCUS: Record<string, { label: string; description: string }> = {
  "Fixed income": {
    label: "Renta fija",
    description: "Necesitarás este dinero pronto, así que conviene algo que se mueva poco.",
  },
  Balanced: {
    label: "Balanceado",
    description: "Una mezcla de bonos y acciones: crece más que la renta fija y aguanta mejor las bajas.",
  },
  "Equity-leaning": {
    label: "Más acciones",
    description: "Más peso en acciones para crecer, con bajas más marcadas en el camino.",
  },
  "Broad market": {
    label: "Mercado amplio",
    description: "Con un plazo largo, fondos que compran cientos de empresas a la vez son un buen punto de partida.",
  },
  "Broad market + growth": {
    label: "Mercado amplio + crecimiento",
    description: "Todo el mercado de EE. UU. más un extra de empresas tecnológicas que suben y bajan más.",
  },
};

export function focusCopy(focus: string): { label: string; description: string | null } {
  return FOCUS[focus] ?? { label: focus, description: null };
}

const WHY: Record<string, string> = {
  SHY: "Bonos del gobierno de EE. UU. a corto plazo: se mueven poco, ideal para dinero que necesitas pronto.",
  BND: "Muchos bonos distintos en un solo fondo; amortiguan las caídas de la bolsa.",
  VOO: "Las 500 empresas más grandes de EE. UU. en un fondo de bajo costo.",
  VTI: "Todo el mercado de EE. UU.: empresas grandes, medianas y pequeñas.",
  VXUS: "Empresas fuera de EE. UU., para no depender de una sola economía.",
  QQQ: "Las 100 empresas más grandes del Nasdaq: más crecimiento, más subidas y bajadas.",
};

export function whyCopy(asset: SuggestedAsset): string {
  return WHY[asset.symbol] ?? asset.why;
}

export function noteCopy(note: string): string {
  return note.includes("CETES")
    ? "En México, los CETES son una opción común de renta fija para plazos cortos."
    : note;
}
