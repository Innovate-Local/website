'use server'

import { revalidatePath } from 'next/cache'
import { requireProfile, requireRole } from '@/lib/auth/session'
import {
  getOrgBalance,
  recordGrant,
  recordReclaim,
  recordSpend,
  recordTransfer,
  viewerCanAdminOrg,
} from '@/lib/platform/credits'

export type ActionResult = { ok: true } | { ok: false; error: string }

// Parse a positive whole number of credits from a form field.
function parseAmount(raw: FormDataEntryValue | null): number | null {
  const n = Number(String(raw ?? '').trim())
  if (!Number.isInteger(n) || n <= 0) return null
  return n
}

function nullableText(raw: FormDataEntryValue | null): string | null {
  const s = String(raw ?? '').trim()
  return s || null
}

function revalidateCredits(orgId?: string) {
  revalidatePath('/dashboard/credits')
  revalidatePath('/dashboard')
  revalidatePath('/dashboard/organization')
  if (orgId) revalidatePath(`/dashboard/organizations/${orgId}`)
}

// Allowed to move an org's credits: effective hub staff, or an admin of that
// org — resolved "act as"-aware so the persona is faithful (see viewerCanAdminOrg).
async function canManageOrgCredits(orgId: string): Promise<boolean> {
  return viewerCanAdminOrg(orgId)
}

// Staff-only: allocate credits to an organization (the source of the pool).
export async function grantCredits(formData: FormData): Promise<ActionResult> {
  const me = await requireRole('hub_staff')
  const orgId = String(formData.get('orgId') ?? '').trim()
  if (!orgId) return { ok: false, error: 'Choose an organization.' }
  const amount = parseAmount(formData.get('amount'))
  if (!amount) return { ok: false, error: 'Enter a credit amount greater than zero.' }

  await recordGrant({ orgId, amount, note: nullableText(formData.get('note')), authorizedBy: me.id })
  revalidateCredits(orgId)
  return { ok: true }
}

// Org admin or staff: commit credits to one of the org's own projects.
export async function spendCredits(formData: FormData): Promise<ActionResult> {
  const me = await requireProfile()
  const orgId = String(formData.get('orgId') ?? '').trim()
  if (!orgId) return { ok: false, error: 'Missing organization.' }
  if (!(await canManageOrgCredits(orgId))) return { ok: false, error: 'Not allowed.' }

  const amount = parseAmount(formData.get('amount'))
  if (!amount) return { ok: false, error: 'Enter a credit amount greater than zero.' }

  const { available } = await getOrgBalance(orgId)
  if (amount > available) return { ok: false, error: `Only ${available} credits available.` }

  await recordSpend({
    orgId,
    projectId: nullableText(formData.get('projectId')),
    amount,
    engagementType: nullableText(formData.get('engagementType')),
    note: nullableText(formData.get('note')),
    authorizedBy: me.id,
  })
  revalidateCredits(orgId)
  return { ok: true }
}

// Org admin or staff: transfer credits to another organization.
export async function transferCredits(formData: FormData): Promise<ActionResult> {
  const me = await requireProfile()
  const fromOrgId = String(formData.get('fromOrgId') ?? '').trim()
  const toOrgId = String(formData.get('toOrgId') ?? '').trim()
  if (!fromOrgId || !toOrgId) return { ok: false, error: 'Choose a recipient organization.' }
  if (fromOrgId === toOrgId) return { ok: false, error: 'Pick a different organization.' }
  if (!(await canManageOrgCredits(fromOrgId))) return { ok: false, error: 'Not allowed.' }

  const amount = parseAmount(formData.get('amount'))
  if (!amount) return { ok: false, error: 'Enter a credit amount greater than zero.' }

  const { available } = await getOrgBalance(fromOrgId)
  if (amount > available) return { ok: false, error: `Only ${available} credits available.` }

  await recordTransfer({
    fromOrgId,
    toOrgId,
    amount,
    engagementType: nullableText(formData.get('engagementType')),
    note: nullableText(formData.get('note')),
    authorizedBy: me.id,
  })
  revalidateCredits(fromOrgId)
  revalidatePath(`/dashboard/organizations/${toOrgId}`)
  return { ok: true }
}

// Staff-only: return unused credits to an org's balance (e.g. an expired
// allocation), logged to the ledger.
export async function reclaimCredits(formData: FormData): Promise<ActionResult> {
  const me = await requireRole('hub_staff')
  const orgId = String(formData.get('orgId') ?? '').trim()
  if (!orgId) return { ok: false, error: 'Missing organization.' }
  const amount = parseAmount(formData.get('amount'))
  if (!amount) return { ok: false, error: 'Enter a credit amount greater than zero.' }

  await recordReclaim({ orgId, amount, note: nullableText(formData.get('note')), authorizedBy: me.id })
  revalidateCredits(orgId)
  return { ok: true }
}
