import type { RequestHandler } from 'express';
import { AppError } from '../lib/errors.js';
import { runWithUser } from '../lib/requestContext.js';
import { verifyToken } from '../services/auth.js';

export const requireAuth: RequestHandler = (req, _res, next) => {
  const header = req.get('authorization');
  const match = header?.match(/^Bearer (\S+)$/i);
  if (!match?.[1]) {
    throw new AppError('UNAUTHORIZED', 'Missing bearer token');
  }
  req.user = verifyToken(match[1]);
  runWithUser(req.user.id, next);
};
