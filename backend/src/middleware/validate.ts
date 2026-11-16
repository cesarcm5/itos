import type { RequestHandler } from 'express';
import type { z } from 'zod';
import { AppError } from '../lib/errors.js';

type Schemas = {
  body?: z.ZodType;
  query?: z.ZodType;
  params?: z.ZodType;
};

function formatIssues(error: z.ZodError): string {
  return error.issues
    .map((issue) => (issue.path.length > 0 ? `${issue.path.join('.')}: ${issue.message}` : issue.message))
    .join('; ');
}

/**
 * Validates and replaces req.body / req.query / req.params with the parsed values.
 * Express 5 exposes req.query as a getter, so it is redefined instead of assigned.
 */
export function validate(schemas: Schemas): RequestHandler {
  return (req, _res, next) => {
    for (const part of ['body', 'query', 'params'] as const) {
      const schema = schemas[part];
      if (!schema) continue;

      const result = schema.safeParse(req[part]);
      if (!result.success) {
        throw new AppError('VALIDATION_ERROR', formatIssues(result.error));
      }

      if (part === 'query') {
        Object.defineProperty(req, 'query', { value: result.data, writable: true, enumerable: true });
      } else {
        req[part] = result.data as never;
      }
    }
    next();
  };
}
