import cors from 'cors';
import express from 'express';
import { config } from './config.js';
import { sql } from './db/client.js';
import { errorHandler, notFound } from './middleware/error.js';
import { alertsRouter } from './routes/alerts.js';
import { authRouter } from './routes/auth.js';
import { internalRouter } from './routes/internal.js';
import { profileRouter } from './routes/profile.js';
import { recommendationsRouter } from './routes/recommendations.js';
import { simulatorRouter } from './routes/simulator.js';
import { stocksRouter } from './routes/stocks.js';
import { watchlistRouter } from './routes/watchlist.js';

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
app.use('/profile', profileRouter);
app.use('/recommendations', recommendationsRouter);
app.use('/stocks', stocksRouter);
app.use('/simulator', simulatorRouter);
app.use('/watchlist', watchlistRouter);
app.use('/alerts', alertsRouter);
app.use('/internal', internalRouter);

app.use(notFound);
app.use(errorHandler);
