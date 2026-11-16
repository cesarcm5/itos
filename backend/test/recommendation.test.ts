import { describe, expect, it } from 'vitest';
import { buildRecommendation, type ProfileInput } from '../src/services/recommendation.js';

const base: ProfileInput = {
  monthlyIncomeMxn: 30000,
  monthlyExpensesMxn: 20000,
  hasEmergencyFund: true,
  horizon: 'long',
  risk: 'medium',
};

describe('buildRecommendation', () => {
  it('computes surplus and the 6-month emergency target', () => {
    const r = buildRecommendation(base);
    expect(r.surplus).toBe(10000);
    expect(r.emergencyTarget).toBe(120000);
  });

  it.each([
    ['low', 3000],
    ['medium', 5000],
    ['high', 7000],
  ] as const)('invests the %s-risk share of the surplus', (risk, expected) => {
    const r = buildRecommendation({ ...base, risk });
    expect(r.suggestedMonthly).toBe(expected);
    expect(r.remainder).toBe(10000 - expected);
  });

  it('suggests 0 without an emergency fund and tips fixed income', () => {
    const r = buildRecommendation({ ...base, hasEmergencyFund: false, risk: 'high' });
    expect(r.suggestedMonthly).toBe(0);
    expect(r.investShare).toBe(0);
    expect(r.remainder).toBe(10000);
    expect(r.tips.some((t) => t.includes('CETES'))).toBe(true);
  });

  it('never suggests a negative amount when expenses exceed income', () => {
    const r = buildRecommendation({ ...base, monthlyIncomeMxn: 15000 });
    expect(r.surplus).toBe(-5000);
    expect(r.suggestedMonthly).toBe(0);
    expect(r.remainder).toBe(0);
  });

  it.each([
    ['short', 'high', 'Fixed income', ['SHY', 'BND']],
    ['medium', 'low', 'Balanced', ['BND', 'VOO']],
    ['medium', 'high', 'Equity-leaning', ['VOO', 'VXUS']],
    ['long', 'medium', 'Broad market', ['VOO', 'VTI', 'VXUS']],
    ['long', 'high', 'Broad market + growth', ['VTI', 'QQQ']],
  ] as const)('maps %s horizon / %s risk to %s', (horizon, risk, focus, symbols) => {
    const r = buildRecommendation({ ...base, horizon, risk });
    expect(r.where.focus).toBe(focus);
    expect(r.where.assets.map((a) => a.symbol)).toEqual(symbols);
    expect(r.where.assets.every((a) => a.why.length > 0)).toBe(true);
  });
});
