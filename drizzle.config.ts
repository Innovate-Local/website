import { defineConfig } from 'drizzle-kit'

// Drizzle Kit is used here for tooling only — `db:studio` (browse data) and
// `db:pull` (introspect the live DB to verify lib/db/schema.ts). DDL/migrations
// are owned by `supabase/migrations/`, so we do NOT use `drizzle-kit migrate`.
export default defineConfig({
  schema: './lib/db/schema.ts',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  // Keep generated artifacts out of the way; we don't apply Drizzle migrations.
  out: './lib/db/.drizzle',
})
