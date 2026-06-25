// Browser Supabase client (publishable key, RLS-enforced). Use inside client
// components — e.g. the login form calling signInWithOtp. For server code use
// lib/supabase/server.ts; for privileged server writes use lib/supabaseAdmin.ts.
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  )
}
