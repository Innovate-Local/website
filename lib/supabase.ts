import { createClient, type SupabaseClient } from '@supabase/supabase-js'

/**
 * Supabase client factory.
 *
 * Returns a configured client if SUPABASE_URL + SUPABASE_ANON_KEY are set in the
 * environment, otherwise returns null. Callers should handle the null case
 * (e.g. fall back to logging server-side) so the app continues to work in
 * development without Supabase configured.
 *
 * Env vars expected (configure in the deploy workflow or .env.local):
 *   SUPABASE_URL         — https://<project>.supabase.co
 *   SUPABASE_ANON_KEY    — anon (public) key, paired with RLS policies
 *
 * For the inquiries form to work, create this table in Supabase:
 *
 *   create table inquiries (
 *     id uuid primary key default gen_random_uuid(),
 *     type text not null check (type in ('join', 'start', 'partner')),
 *     payload jsonb not null,
 *     reference text unique not null,
 *     created_at timestamptz default now()
 *   );
 *
 *   alter table inquiries enable row level security;
 *
 *   create policy "allow anon insert"
 *     on inquiries for insert
 *     to anon
 *     with check (true);
 */
export function getSupabaseClient(): SupabaseClient | null {
  const url = process.env.SUPABASE_URL
  const anonKey = process.env.SUPABASE_ANON_KEY

  if (!url || !anonKey) {
    return null
  }

  return createClient(url, anonKey, {
    auth: { persistSession: false },
  })
}
