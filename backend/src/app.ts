import cors from 'cors';
import express from 'express';
import { config } from './config.js';
import { sql } from './db/client.js';
import { errorHandler, notFound } from './middleware/error.js';
import { authRouter } from './routes/auth.js';

export const app = express();

app.disable('x-powered-by');
app.set('trust proxy', config.TRUST_PROXY);
app.use(cors({ origin: config.CORS_ORIGIN }));
app.use(express.json({ limit: '100kb' }));

app.get('/health', async (_req, res) => {
  try {
    await sql`select 1`;
    res.json({ status: 'ok', db: 'ok' });
  } catch {
    res.status(503).json({ status: 'degraded', db: 'down' });
  }
});

app.use('/auth', authRouter);

app.use(notFound);
app.use(errorHandler);
