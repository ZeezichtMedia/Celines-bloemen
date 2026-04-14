import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';

const connectionString =
  process.env.DATABASE_URL ??
  (import.meta.env as Record<string, string | undefined>).DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL environment variable is required');
const sql = neon(connectionString);
export const db = drizzle(sql, { schema });
export { schema };
