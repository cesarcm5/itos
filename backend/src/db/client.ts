import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { config } from '../config.js';
import * as schema from './schema.js';

// `prepare: false` keeps this compatible with Supabase's transaction pooler (port 6543).
export const sql = postgres(config.DATABASE_URL, { prepare: false, max: 10 });

export const db = drizzle(sql, { schema });

export type Database = typeof db;
