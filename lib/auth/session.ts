// Server-side auth/session helpers. One place to answer "who is this request,
// what's their profile, and are they allowed here". Import only from server
// code (server components, route handlers, server actions).
import { cache } from 'react'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { eq } from 'drizzle-orm'
import { createClient } from '@/lib/supabase/server'
import { getDb } from '@/lib/db'
import { profiles, type Profile, type UserRole } from '@/lib/db/schema'

// The authenticated Supabase user (or null). Uses getUser(), which revalidates
// the token with Supabase rather than trusting the cookie blindly. Wrapped in
// React cache() so the several session lookups a request now makes (real profile,
// act-as, context resolvers) share one Supabase round-trip.
export const getUser = cache(async () => {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user
})

// ---------------------------------------------------------------------------
// "Act as" — a hub_staff-only developer tool to view/use the app as another
// persona (role + org/partner context) without logging into a separate account.
// Stored in a cookie; only ever honoured when the REAL user is hub_staff, so a
// tampered cookie from a non-staff account does nothing. See app/dashboard/
// act-as and components/platform/ActAsBar.
// ---------------------------------------------------------------------------
export const ACT_AS_COOKIE = 'il_act_as'
const ACT_AS_ROLES: UserRole[] = ['apprentice', 'org_member', 'hub_staff']

export type ActAsState = {
  role: UserRole
  orgId: string | null
  partnerId: string | null
}

// Raw cookie read — no authorization. Use getActAs() to get the guarded value.
async function readActAsCookie(): Promise<ActAsState | null> {
  const raw = (await cookies()).get(ACT_AS_COOKIE)?.value
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as Partial<ActAsState>
    if (!parsed.role || !ACT_AS_ROLES.includes(parsed.role)) return null
    return {
      role: parsed.role,
      orgId: parsed.orgId ?? null,
      partnerId: parsed.partnerId ?? null,
    }
  } catch {
    return null
  }
}

// The real (unimpersonated) profile row for the signed-in user. Cached per
// request (dedupes the repeated lookups from getProfile/getActAs/isRealStaff).
export const getRealProfile = cache(async (): Promise<Profile | null> => {
  const user = await getUser()
  if (!user) return null
  const db = getDb()
  const rows = await db.select().from(profiles).where(eq(profiles.id, user.id)).limit(1)
  return rows[0] ?? null
})

// The active "act as" persona, or null. Honoured only for real hub_staff.
export async function getActAs(): Promise<ActAsState | null> {
  const real = await getRealProfile()
  if (real?.role !== 'hub_staff') return null
  return readActAsCookie()
}

// True when the real signed-in user is hub_staff, regardless of any active
// persona. Use for authorization bypasses so staff keep their powers while
// acting as another role.
export async function isRealStaff(): Promise<boolean> {
  const real = await getRealProfile()
  return real?.role === 'hub_staff'
}

// The EFFECTIVE profile: the real profile, with its role overridden by an active
// "act as" persona (staff only). Drives nav, page routing, and role gates so the
// persona is faithful. The id stays the real user's id.
export async function getProfile(): Promise<Profile | null> {
  const real = await getRealProfile()
  if (!real || real.role !== 'hub_staff') return real
  const actAs = await readActAsCookie()
  if (!actAs) return real
  return { ...real, role: actAs.role }
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
