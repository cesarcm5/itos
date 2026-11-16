import type { ErrorRequestHandler, RequestHandler } from 'express';
import { AppError } from '../lib/errors.js';

export const notFound: RequestHandler = (_req, _res, next) => {
  next(new AppError('NOT_FOUND', 'Route not found'));
};

function hasBodyParserType(err: unknown): err is { type: string } {
  return typeof err === 'object' && err !== null && 'type' in err && typeof err.type === 'string';
}

export const errorHandler: ErrorRequestHandler = (err: unknown, _req, res, _next) => {
  let appError: AppError;

  if (err instanceof AppError) {
    appError = err;
  } else if (hasBodyParserType(err) && err.type === 'entity.parse.failed') {
    appError = new AppError('VALIDATION_ERROR', 'Malformed JSON body');
  } else if (hasBodyParserType(err) && err.type === 'entity.too.large') {
    appError = new AppError('VALIDATION_ERROR', 'Request body too large');
  } else {
    console.error(err);
    appError = new AppError('INTERNAL_ERROR', 'Something went wrong');
  }

  if (appError.retryAfter !== undefined) {
    res.setHeader('Retry-After', String(appError.retryAfter));
  }

  res.status(appError.status).json({
    error: {
      code: appError.code,
      message: appError.message,
      ...(appError.retryAfter !== undefined && { retryAfter: appError.retryAfter }),
    },
  });
};
