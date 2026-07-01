'use server'

import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { ACT_AS_COOKIE, getRealProfile } from '@/lib/auth/session'
import type { UserRole } from '@/lib/db/schema'

export type ActionResult = { ok: true } | { ok: false; error: string }

const ROLES: UserRole[] = ['apprentice', 'org_member', 'hub_staff']

// Set the current developer's "act as" persona. Real hub_staff only.
export async function setActAs(formData: FormData): Promise<ActionResult> {
  const real = await getRealProfile()
  if (real?.role !== 'hub_staff') return { ok: false, error: 'Not allowed.' }

  const rawRole = String(formData.get('role') ?? '')
  const role = (ROLES as string[]).includes(rawRole) ? (rawRole as UserRole) : null
  if (!role) return { ok: false, error: 'Choose a role.' }

  const orgId = String(formData.get('orgId') ?? '').trim() || null
  const partnerId = String(formData.get('partnerId') ?? '').trim() || null

  // Acting as hub_staff with no context is just the real view — clear instead.
  if (role === 'hub_staff' && !orgId && !partnerId) {
    ;(await cookies()).delete(ACT_AS_COOKIE)
  } else {
    ;(await cookies()).set(ACT_AS_COOKIE, JSON.stringify({ role, orgId, partnerId }), {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 8, // 8 hours — a working session
    })
  }
  revalidatePath('/dashboard', 'layout')
  return { ok: true }
}

// Drop the persona and return to the real hub_staff view.
export async function clearActAs(): Promise<ActionResult> {
  const real = await getRealProfile()
  if (real?.role !== 'hub_staff') return { ok: false, error: 'Not allowed.' }
  ;(await cookies()).delete(ACT_AS_COOKIE)
  revalidatePath('/dashboard', 'layout')
  return { ok: true }
}
