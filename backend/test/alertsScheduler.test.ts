import { describe, expect, it } from 'vitest';
import { isUsMarketOpen } from '../src/jobs/alertsScheduler.js';

describe('isUsMarketOpen', () => {
  it.each([
    ['2026-11-16T14:30:00Z', true], // Mon 9:30 ET (EST, UTC-5)
    ['2026-11-16T14:29:00Z', false], // Mon 9:29 ET
    ['2026-11-16T21:00:00Z', true], // Mon 16:00 ET
    ['2026-11-16T21:15:00Z', false], // Mon 16:15 ET
    ['2026-11-14T16:00:00Z', false], // Saturday
    ['2026-07-15T13:45:00Z', true], // Wed 9:45 ET (EDT, UTC-4)
  ])('%s → %s', (iso, expected) => {
    expect(isUsMarketOpen(new Date(iso))).toBe(expected);
  });
});
