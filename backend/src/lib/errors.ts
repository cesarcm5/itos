export const errorStatus = {
  VALIDATION_ERROR: 400,
  UNAUTHORIZED: 401,
  INVALID_CREDENTIALS: 401,
  NOT_FOUND: 404,
  EMAIL_TAKEN: 409,
  ALERT_LIMIT: 422,
  TOO_MANY_REQUESTS: 429,
  UPSTREAM_ERROR: 502,
  RATE_LIMITED: 503,
  INTERNAL_ERROR: 500,
} as const;

export type ErrorCode = keyof typeof errorStatus;

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly status: number;
  readonly retryAfter: number | undefined;

  constructor(code: ErrorCode, message: string, options: { retryAfter?: number } = {}) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.status = errorStatus[code];
    this.retryAfter = options.retryAfter;
  }
}
