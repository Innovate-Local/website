'use server'

import { revalidatePath } from 'next/cache'
import { requireRole } from '@/lib/auth/session'
import { createPartner, updatePartnerConfig } from '@/lib/platform/partners'

export type ActionResult = { ok: true; id?: string } | { ok: false; error: string }

function parseInt0(raw: FormDataEntryValue | null): number {
  const n = Math.floor(Number(raw))
  return Number.isFinite(n) ? n : 0
}

// Staff-only: designate an organization as a Community Innovation Partner and set
// its annual allocation + cycle. Seeds the org's members as authorized users.
export async function createPartnerAction(formData: FormData): Promise<ActionResult> {
  const profile = await requireRole('hub_staff')

  const orgId = String(formData.get('orgId') ?? '').trim()
  if (!orgId) return { ok: false, error: 'Choose an organization.' }
  const annualAllocation = parseInt0(formData.get('annualAllocation'))
  if (annualAllocation <= 0) return { ok: false, error: 'Annual allocation must be greater than zero.' }

  const tier = String(formData.get('tier') ?? '').trim() || undefined
  const cycleStart = String(formData.get('cycleStart') ?? '').trim() || null
  const cycleEnd = String(formData.get('cycleEnd') ?? '').trim() || null
  const footprint = String(formData.get('footprint') ?? '').trim() || null
  const redemptionWindowDays = parseInt0(formData.get('redemptionWindowDays')) || undefined

  try {
    const { partnerId } = await createPartner({
      orgId,
      tier,
      annualAllocation,
      cycleStart,
      cycleEnd,
      footprint,
      redemptionWindowDays,
      authorizedBy: profile.id,
      authorizedByName: profile.fullName || profile.email || 'Hub staff',
    })
    revalidatePath('/dashboard/partners')
    return { ok: true, id: partnerId }
  } catch (e) {
    // The org_id unique constraint fires if it's already a partner.
    const msg = e instanceof Error ? e.message : 'Could not create partner.'
    if (msg.includes('unique') || msg.includes('duplicate')) {
      return { ok: false, error: 'That organization is already a partner.' }
    }
    return { ok: false, error: msg }
  }
}

// Staff-only: update a partner's allocation / cycle / details.
export async function updatePartnerAction(partnerId: string, formData: FormData): Promise<ActionResult> {
  await requireRole('hub_staff')
  if (!partnerId) return { ok: false, error: 'Missing partner.' }

  const annualAllocation = parseInt0(formData.get('annualAllocation'))
  if (annualAllocation <= 0) return { ok: false, error: 'Annual allocation must be greater than zero.' }

  await updatePartnerConfig({
    partnerId,
    tier: String(formData.get('tier') ?? '').trim() || undefined,
    annualAllocation,
    cycleStart: String(formData.get('cycleStart') ?? '').trim() || null,
    cycleEnd: String(formData.get('cycleEnd') ?? '').trim() || null,
    footprint: String(formData.get('footprint') ?? '').trim() || null,
  })
  revalidatePath('/dashboard/partners')
  revalidatePath(`/dashboard/partners/${partnerId}`)
  return { ok: true }
}
