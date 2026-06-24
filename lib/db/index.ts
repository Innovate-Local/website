// Drizzle client — server-side Postgres access for the platform.
//
// Connects directly to Postgres via the Supabase connection pooler, so this must
// only ever run on the server (server actions, route handlers). It uses the
// DATABASE_URL secret (the pooler string from Supabase → Settings → Database →
// Connection pooling, port 6543), NOT the publishable key — keep it server-only.
//
// This is separate from `lib/supabase.ts`, which uses the publishable key for
// Storage uploads and Edge Function calls. Use this Drizzle client for typed
// relational reads/writes; use the supabase-js client for Storage and Functions.

import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

let cached: PostgresJsDatabase<typeof schema> | null = null

export function getDb(): PostgresJsDatabase<typeof schema> {
  if (cached) return cached

  const url = process.env.DATABASE_URL
  if (!url) {
    throw new Error('DATABASE_URL is not set — required for the Drizzle/Postgres client.')
  }

  // `prepare: false` is required when using Supabase's transaction-mode pooler
  // (port 6543), which does not support prepared statements.
  const client = postgres(url, { prepare: false })
  cached = drizzle(client, { schema })
  return cached
}

export { schema }
