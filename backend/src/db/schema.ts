import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';

export const horizonEnum = pgEnum('horizon', ['short', 'medium', 'long']);
export const riskEnum = pgEnum('risk', ['low', 'medium', 'high']);
export const alertConditionEnum = pgEnum('alert_condition', ['above', 'below']);
export const alertStatusEnum = pgEnum('alert_status', ['active', 'triggered', 'cancelled']);

// RLS is enabled on every table with no policies: this blocks Supabase's public
// (PostgREST) API. The Express API connects as the table owner via DATABASE_URL.

export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    email: text('email').notNull().unique(),
    passwordHash: text('password_hash').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [check('users_email_lowercase', sql`${t.email} = lower(${t.email})`)],
).enableRLS();

// Opaque refresh tokens, stored as SHA-256. Each login starts a family; rotation keeps the family.
export const refreshTokens = pgTable(
  'refresh_tokens',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    familyId: uuid('family_id').notNull(),
    tokenHash: text('token_hash').notNull().unique(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('refresh_tokens_user_id_idx').on(t.userId), index('refresh_tokens_family_id_idx').on(t.familyId)],
).enableRLS();

export const profiles = pgTable(
  'profiles',
  {
    userId: uuid('user_id')
      .primaryKey()
      .references(() => users.id, { onDelete: 'cascade' }),
    monthlyIncomeMxn: numeric('monthly_income_mxn', { precision: 12, scale: 2, mode: 'number' }).notNull(),
    monthlyExpensesMxn: numeric('monthly_expenses_mxn', { precision: 12, scale: 2, mode: 'number' }).notNull(),
    hasEmergencyFund: boolean('has_emergency_fund').notNull(),
    horizon: horizonEnum('horizon').notNull(),
    risk: riskEnum('risk').notNull(),
  },
  (t) => [
    check('profiles_income_non_negative', sql`${t.monthlyIncomeMxn} >= 0`),
    check('profiles_expenses_non_negative', sql`${t.monthlyExpensesMxn} >= 0`),
  ],
).enableRLS();

export const watchlist = pgTable(
  'watchlist',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    symbol: text('symbol').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.symbol] })],
).enableRLS();

export const alerts = pgTable(
  'alerts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    symbol: text('symbol').notNull(),
    condition: alertConditionEnum('condition').notNull(),
    targetPrice: numeric('target_price', { precision: 14, scale: 4, mode: 'number' }).notNull(),
    status: alertStatusEnum('status').notNull().default('active'),
    triggeredPrice: numeric('triggered_price', { precision: 14, scale: 4, mode: 'number' }),
    triggeredAt: timestamp('triggered_at', { withTimezone: true }),
  },
  (t) => [
    index('alerts_user_id_idx').on(t.userId),
    index('alerts_status_symbol_idx').on(t.status, t.symbol),
    check('alerts_target_price_positive', sql`${t.targetPrice} > 0`),
  ],
).enableRLS();

export const marketCache = pgTable('market_cache', {
  key: text('key').primaryKey(),
  payload: jsonb('payload').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
}).enableRLS();

export const apiUsage = pgTable('api_usage', {
  date: date('date').primaryKey(),
  creditsUsed: integer('credits_used').notNull().default(0),
}).enableRLS();
