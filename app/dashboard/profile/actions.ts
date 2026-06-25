'use server'

import { revalidatePath } from 'next/cache'
import { eq } from 'drizzle-orm'
import { requireUser, requireRole } from '@/lib/auth/session'
import { getDb } from '@/lib/db'
import { profiles } from '@/lib/db/schema'
import { upsertApprenticeProfile } from '@/lib/platform/apprentice-profile'
import { AVAILABILITY_OPTIONS, LINK_FIELDS, parseTags, type Availability } from '@/lib/platform/apprentice-fields'

export type UpdateProfileResult = { ok: true } | { ok: false; error: string }

// Update the signed-in user's own self-editable profile fields. Scoped to the
// user's id, and only touches full_name — role/status/hub assignment are
// privileged and never settable here (also enforced at the DB by the
// guard_profile_privileged_fields trigger).
export async function updateProfile(formData: FormData): Promise<UpdateProfileResult> {
  const user = await requireUser()

  const fullName = String(formData.get('fullName') ?? '').trim()
  if (fullName.length > 200) {
    return { ok: false, error: 'Name is too long.' }
  }

  const db = getDb()
  await db
    .update(profiles)
    .set({ fullName: fullName || null })
    .where(eq(profiles.id, user.id))

  revalidatePath('/dashboard/profile')
  return { ok: true }
}

// Apprentice-only: their matching/portfolio detail (skills, availability, bio,
// links). Stored in apprentice_profiles, keyed to their account.
export async function updateApprenticeProfile(formData: FormData): Promise<UpdateProfileResult> {
  const me = await requireRole('apprentice')

  const rawAvailability = String(formData.get('availability') ?? 'available')
  const availability = (AVAILABILITY_OPTIONS as readonly string[]).includes(rawAvailability)
    ? (rawAvailability as Availability)
    : 'available'

  const hoursRaw = String(formData.get('hoursPerWeek') ?? '').trim()
  const hours = hoursRaw ? Number(hoursRaw) : null
  if (hours != null && (!Number.isInteger(hours) || hours < 0 || hours > 168)) {
    return { ok: false, error: 'Hours per week must be between 0 and 168.' }
  }

  // Collect known links from link_<key> fields; keep only non-empty ones.
  const links: Record<string, string> = {}
  for (const { key } of LINK_FIELDS) {
    const v = String(formData.get(`link_${key}`) ?? '').trim()
    if (v) links[key] = v
  }

  await upsertApprenticeProfile(me.id, {
    headline: String(formData.get('headline') ?? '').trim() || null,
    bio: String(formData.get('bio') ?? '').trim() || null,
    skills: parseTags(String(formData.get('skills') ?? '')),
    availability,
    hoursPerWeek: hours,
    location: String(formData.get('location') ?? '').trim() || null,
    links,
  })

  revalidatePath('/dashboard/profile')
  revalidatePath('/dashboard/portfolio')
  return { ok: true }
}
