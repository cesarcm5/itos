import { suggestAssets, type AssetSuggestion, type Horizon, type Risk } from '../lib/assets.js';

// Pure functions: no DB or HTTP.

export const EMERGENCY_MONTHS = 6;

export const INVEST_SHARE: Record<Risk, number> = { low: 0.3, medium: 0.5, high: 0.7 };

export type ProfileInput = {
  monthlyIncomeMxn: number;
  monthlyExpensesMxn: number;
  hasEmergencyFund: boolean;
  horizon: Horizon;
  risk: Risk;
};

export type Recommendation = {
  surplus: number;
  emergencyTarget: number;
  hasEmergencyFund: boolean;
  /** Share of the surplus suggested for investing (0 without an emergency fund). */
  investShare: number;
  suggestedMonthly: number;
  /** Surplus not invested: flexible savings/spending, or the emergency fund. */
  remainder: number;
  where: AssetSuggestion;
  math: string[];
  tips: string[];
};

const round2 = (n: number) => Math.round(n * 100) / 100;

export function buildRecommendation(profile: ProfileInput): Recommendation {
  const income = profile.monthlyIncomeMxn;
  const expenses = profile.monthlyExpensesMxn;
  const surplus = round2(income - expenses);
  const emergencyTarget = round2(expenses * EMERGENCY_MONTHS);
  const investShare = profile.hasEmergencyFund ? INVEST_SHARE[profile.risk] : 0;
  const suggestedMonthly = surplus > 0 ? round2(surplus * investShare) : 0;
  const remainder = round2(Math.max(surplus, 0) - suggestedMonthly);

  const math = [
    `Monthly surplus = income − expenses = ${income} − ${expenses} = ${surplus}`,
    `Emergency fund target = expenses × ${EMERGENCY_MONTHS} = ${expenses} × ${EMERGENCY_MONTHS} = ${emergencyTarget}`,
    profile.hasEmergencyFund
      ? `Suggested monthly investment = surplus × ${investShare * 100}% (${profile.risk} risk) = ${suggestedMonthly}`
      : 'Suggested monthly investment = 0 until your emergency fund is complete',
  ];

  const tips: string[] = [];
  if (surplus <= 0) {
    tips.push('Your expenses are equal to or higher than your income. Lowering expenses comes before investing.');
  }
  if (!profile.hasEmergencyFund) {
    tips.push(
      `Build your emergency fund first (${emergencyTarget}): put your surplus in fixed income such as CETES, high-yield savings or short-term bond funds.`,
    );
  }
  tips.push('Keep your emergency fund in fixed income (liquid, low risk), not in stocks.');

  return {
    surplus,
    emergencyTarget,
    hasEmergencyFund: profile.hasEmergencyFund,
    investShare,
    suggestedMonthly,
    remainder,
    where: suggestAssets(profile.horizon, profile.risk),
    math,
    tips,
  };
}
