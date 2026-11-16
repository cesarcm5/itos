// Minimal valid env so config.ts doesn't exit. No test opens a DB connection.
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL ??= 'postgresql://test:test@localhost:5432/test';
process.env.JWT_SECRET ??= 'test-secret-test-secret-test-secret-123';
process.env.TWELVE_DATA_API_KEY ??= 'test';
process.env.RESEND_API_KEY ??= 'test';
process.env.EMAIL_FROM ??= 'ITOS <test@example.com>';
process.env.CRON_SECRET ??= 'test-cron-secret-123';
process.env.ALERTS_CRON_ENABLED = 'false';
