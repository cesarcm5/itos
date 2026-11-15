import { app } from './app.js';
import { config } from './config.js';
import { sql } from './db/client.js';

const server = app.listen(config.PORT, () => {
  console.log(`ITOS API listening on port ${config.PORT}`);
});

const shutdown = (signal: string) => {
  console.log(`${signal} received, shutting down`);
  server.close(() => {
    void sql.end({ timeout: 5 }).finally(() => process.exit(0));
  });
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
