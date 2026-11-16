import { describe, expect, it } from 'vitest';
import { SIMULATOR_DISCLAIMER, simulate } from '../src/services/simulator.js';

describe('simulate', () => {
  it('buys fractional shares at each monthly close and values at the last close', () => {
    const r = simulate(
      [
        { date: '2026-01-01', close: 100 },
        { date: '2026-02-01', close: 50 },
        { date: '2026-03-01', close: 200 },
      ],
      100,
    );
    // shares = 1 + 2 + 0.5 = 3.5 → value = 3.5 × 200
    expect(r.months).toBe(3);
    expect(r.shares).toBe(3.5);
    expect(r.contributed).toBe(300);
    expect(r.value).toBe(700);
    expect(r.gain).toBe(400);
    expect(r.gainPct).toBe(133.33);
    expect(r.series).toEqual([
      { date: '2026-01-01', contributed: 100, value: 100 },
      { date: '2026-02-01', contributed: 200, value: 150 },
      { date: '2026-03-01', contributed: 300, value: 700 },
    ]);
  });

  it('reports a loss', () => {
    const r = simulate(
      [
        { date: '2026-01-01', close: 100 },
        { date: '2026-02-01', close: 80 },
      ],
      100,
    );
    expect(r.value).toBe(180); // (1 + 1.25) × 80
    expect(r.gain).toBe(-20);
    expect(r.gainPct).toBe(-10);
  });

  it('always returns the disclaimer, even with no data', () => {
    const r = simulate([], 100);
    expect(r).toMatchObject({ months: 0, contributed: 0, value: 0, gain: 0, gainPct: 0 });
    expect(r.disclaimer).toBe(SIMULATOR_DISCLAIMER);
    expect(r.disclaimer).toMatch(/Past performance/);
  });
});
