// Server-side auth/session helpers. One place to answer "who is this request,
// what's their profile, and are they allowed here". Import only from server
// code (server components, route handlers, server actions).
import { redirect } from 'next/navigation'
import { eq } from 'drizzle-orm'
import { createClient } from '@/lib/supabase/server'
import { getDb } from '@/lib/db'
import { profiles, type Profile, type UserRole } from '@/lib/db/schema'

// The authenticated Supabase user (or null). Uses getUser(), which revalidates
// the token with Supabase rather than trusting the cookie blindly.
export async function getUser() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user
}

// The current user's profile row (or null if signed out / not yet provisioned).
export async function getProfile(): Promise<Profile | null> {
  const user = await getUser()
  if (!user) return null

  const db = getDb()
  const rows = await db.select().from(profiles).where(eq(profiles.id, user.id)).limit(1)
  return rows[0] ?? null
}

// Require a signed-in user; otherwise bounce to /login (preserving destination).
export async function requireUser(next = '/dashboard') {
  const user = await getUser()
  if (!user) redirect(`/login?next=${encodeURIComponent(next)}`)
  return user
}

// Require a provisioned profile. If the auth user exists but the profile row is
// missing (e.g. trigger hasn't run yet), treat as signed out.
export async function requireProfile(next = '/dashboard'): Promise<Profile> {
  const profile = await getProfile()
  if (!profile) redirect(`/login?next=${encodeURIComponent(next)}`)
  return profile
}

// Require one of the given roles; send mismatches to their own dashboard home.
export async function requireRole(...roles: UserRole[]): Promise<Profile> {
  const profile = await requireProfile()
  if (!roles.includes(profile.role)) redirect('/dashboard')
  return profile
}
