import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// Server-only Supabase client using the SECRET (service-role) key. It bypasses
// RLS, so it must NEVER be imported into client code — keep it to route handlers
// and server actions. We use it to write to the private `resumes` Storage bucket
// (relational rows go through the Drizzle client in lib/db).
let cached: SupabaseClient | null = null

export function getSupabaseAdmin(): SupabaseClient {
  if (cached) return cached

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SECRET_KEY

  if (!url || !key) {
    throw new Error(
      'Supabase admin client requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY.',
    )
  }

  cached = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  return cached
}
