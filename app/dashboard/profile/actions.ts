'use server'

import { revalidatePath } from 'next/cache'
import { eq } from 'drizzle-orm'
import { requireUser } from '@/lib/auth/session'
import { getDb } from '@/lib/db'
import { profiles } from '@/lib/db/schema'

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
