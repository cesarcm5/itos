import { app } from './app.js';
import { config } from './config.js';
import { sql } from './db/client.js';

const server = app.listen(config.PORT, () => {
  console.log(`ITOS API listening on port ${config.PORT}`);
});

// ALERTS_CRON_ENABLED=false (e.g. staging) skips the scheduler entirely: node-cron isn't even
// loaded, so there are no timers, no upstream credits and no emails. POST /internal/check-alerts
// still runs a check on demand.
let stopScheduler: (() => void) | undefined;
if (config.ALERTS_CRON_ENABLED) {
  const { startAlertsScheduler } = await import('./jobs/alertsScheduler.js');
  const task = startAlertsScheduler();
  stopScheduler = () => void task.stop();
  console.log('Price-alert scheduler enabled');
} else {
  console.log('Price-alert scheduler disabled (ALERTS_CRON_ENABLED=false)');
}

const shutdown = (signal: string) => {
  console.log(`${signal} received, shutting down`);
  stopScheduler?.();
  server.close(() => {
    void sql.end({ timeout: 5 }).finally(() => process.exit(0));
  });
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
