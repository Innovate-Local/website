'use server'

import { revalidatePath } from 'next/cache'
import { eq } from 'drizzle-orm'
import { requireRole } from '@/lib/auth/session'
import { getDb } from '@/lib/db'
import { profiles, type UserRole } from '@/lib/db/schema'

const ROLES: UserRole[] = ['apprentice', 'org_member', 'hub_staff']

export type ActionResult = { ok: true } | { ok: false; error: string }

// Staff-only: change a user's platform role. Runs over Drizzle (service-side),
// so the profiles privileged-field guard — which blocks self-service role
// changes — doesn't apply here, by design.
export async function setUserRole(userId: string, role: UserRole): Promise<ActionResult> {
  const me = await requireRole('hub_staff')

  if (!ROLES.includes(role)) return { ok: false, error: 'Unknown role.' }
  if (userId === me.id && role !== 'hub_staff') {
    return { ok: false, error: 'You can’t remove your own staff access.' }
  }

  const db = getDb()
  await db.update(profiles).set({ role }).where(eq(profiles.id, userId))
  revalidatePath('/dashboard/people')
  return { ok: true }
}
