import cron, { type ScheduledTask } from 'node-cron';
import { checkAlerts } from '../services/alertChecker.js';

const TIMEZONE = 'America/New_York';
// Every 15 min, Mon–Fri, 9:00–16:45 ET; isUsMarketOpen trims it to 9:30–16:00.
const SCHEDULE = '*/15 9-16 * * 1-5';

/** Regular US session (9:30–16:00 ET, Mon–Fri). Exchange holidays aren't modeled. */
export function isUsMarketOpen(now: Date = new Date()): boolean {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: TIMEZONE,
    weekday: 'short',
    hour: 'numeric',
    minute: 'numeric',
    hourCycle: 'h23',
  }).formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  if (get('weekday') === 'Sat' || get('weekday') === 'Sun') return false;
  const minutes = Number(get('hour')) * 60 + Number(get('minute'));
  return minutes >= 9 * 60 + 30 && minutes <= 16 * 60;
}

export function startAlertsScheduler(): ScheduledTask {
  return cron.schedule(
    SCHEDULE,
    async () => {
      if (!isUsMarketOpen()) return;
      try {
        const result = await checkAlerts();
        console.log('Alert check finished', result);
      } catch (err) {
        console.error('Alert check failed', err);
      }
    },
    { timezone: TIMEZONE, name: 'price-alerts', noOverlap: true },
  );
}
