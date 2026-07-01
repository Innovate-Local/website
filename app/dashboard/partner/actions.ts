'use server'

import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'
import { eq } from 'drizzle-orm'
import { requireProfile } from '@/lib/auth/session'
import { getDb } from '@/lib/db'
import { profiles } from '@/lib/db/schema'
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'
import { engagementLabel } from '@/lib/platform/engagement-types'
import {
  adjustAllocation,
  assignInternal,
  getPartnerAvailable,
  getPartnerForUser,
  removePartnerMember,
  setPartnerMemberRole,
  transferExternal,
  updatePartnerPolicies,
  upsertPartnerMember,
  type PartnerContext,
} from '@/lib/platform/partners'
import {
  EXTERNAL_RECIPIENT_KINDS,
  PARTNER_ROLES,
  type PartnerRole,
  type RecipientKind,
} from '@/lib/platform/partner-constants'
import { assignmentEmail, transferEmail } from '@/lib/emails/partner'
import { sendEmail } from '@/lib/email'

export type ActionResult = { ok: true; message?: string } | { ok: false; error: string }

// The current user's partner console context + display name, or null if they
// aren't an authorized user on any partner.
async function actor(): Promise<{ partner: PartnerContext; userId: string; name: string } | null> {
  const profile = await requireProfile()
  const partner = await getPartnerForUser(profile.id)
  if (!partner) return null
  return { partner, userId: profile.id, name: profile.fullName || profile.email || 'A partner user' }
}

// Single-movement authorization ceiling by partner role (see partners policy).
function withinLimit(partner: PartnerContext, role: PartnerRole, amount: number): boolean {
  if (role === 'admin') return true
  const limit = role === 'approver' ? partner.approverLimit : partner.drafterLimit
  return amount <= limit
}

function parseAmount(raw: FormDataEntryValue | null): number {
  const n = Math.floor(Number(raw))
  return Number.isFinite(n) ? n : 0
}

async function originFromRequest(): Promise<string> {
  const h = await headers()
  const host = h.get('x-forwarded-host') ?? h.get('host') ?? 'localhost:8080'
  const proto = h.get('x-forwarded-proto') ?? (host.includes('localhost') ? 'http' : 'https')
  return `${proto}://${host}`
}

// --- Assign credits to an internal department -------------------------------
export async function assignInternalAction(formData: FormData): Promise<ActionResult> {
  const a = await actor()
  if (!a) return { ok: false, error: 'Not allowed.' }
  const { partner, userId, name } = a

  const department = String(formData.get('department') ?? '').trim()
  const amount = parseAmount(formData.get('amount'))
  const managerName = String(formData.get('managerName') ?? '').trim() || null
  const managerEmail = String(formData.get('managerEmail') ?? '').trim().toLowerCase() || null
  const engKey = String(formData.get('engagementKey') ?? '').trim() || null
  const note = String(formData.get('note') ?? '').trim() || null

  if (!department) return { ok: false, error: 'A department is required.' }
  if (amount <= 0) return { ok: false, error: 'Enter a credit amount greater than zero.' }
  if (!withinLimit(partner, partner.partnerRole, amount)) {
    return { ok: false, error: `That exceeds your ${partner.partnerRole} limit. Ask a Program Admin to authorize it.` }
  }
  const available = await getPartnerAvailable(partner.partnerId, partner.annualAllocation)
  if (amount > available) return { ok: false, error: `Only ${available} credits available this cycle.` }

  const engLabel = engagementLabel(engKey)
  await assignInternal({
    partnerId: partner.partnerId,
    departmentName: department,
    managerName,
    managerEmail,
    amount,
    engagementKey: engKey,
    engagementLabel: engLabel,
    note,
    authorizedBy: userId,
    authorizedByName: name,
  })

  if (managerEmail) {
    const origin = await originFromRequest()
    const { subject, html } = assignmentEmail({
      partnerName: partner.orgName,
      department,
      managerName,
      amount,
      engagementSuggestion: engLabel,
      note,
      consoleUrl: `${origin}/dashboard/partner`,
    })
    await sendEmail({ to: managerEmail, subject, html })
  }

  revalidatePath('/dashboard/partner')
  return { ok: true, message: `${amount} credits assigned to ${department}.` }
}

// --- Transfer credits to an external organization ---------------------------
export async function transferExternalAction(formData: FormData): Promise<ActionResult> {
  const a = await actor()
  if (!a) return { ok: false, error: 'Not allowed.' }
  const { partner, userId, name } = a

  const rawKind = String(formData.get('kind') ?? '')
  const kind = (EXTERNAL_RECIPIENT_KINDS as string[]).includes(rawKind)
    ? (rawKind as RecipientKind)
    : 'business'
  const orgName = String(formData.get('orgName') ?? '').trim()
  const contactName = String(formData.get('contactName') ?? '').trim() || null
  const contactEmail = String(formData.get('contactEmail') ?? '').trim().toLowerCase() || null
  const rm = String(formData.get('relationshipManager') ?? '').trim() || null
  const amount = parseAmount(formData.get('amount'))
  const engKey = String(formData.get('engagementKey') ?? '').trim() || null
  const message = String(formData.get('message') ?? '').trim() || null

  if (!orgName) return { ok: false, error: 'An organization name is required.' }
  if (amount <= 0) return { ok: false, error: 'Enter a credit amount greater than zero.' }
  if (!withinLimit(partner, partner.partnerRole, amount)) {
    return { ok: false, error: `That exceeds your ${partner.partnerRole} limit. Ask a Program Admin to authorize it.` }
  }
  const available = await getPartnerAvailable(partner.partnerId, partner.annualAllocation)
  if (amount > available) return { ok: false, error: `Only ${available} credits available this cycle.` }

  const engLabel = engagementLabel(engKey)
  const result = await transferExternal({
    partnerId: partner.partnerId,
    partnerName: partner.orgName,
    kind,
    orgName,
    contactName,
    contactEmail,
    relationshipManager: rm,
    amount,
    engagementKey: engKey,
    engagementLabel: engLabel,
    message,
    redemptionWindowDays: partner.redemptionWindowDays,
    authorizedBy: userId,
    authorizedByName: name,
  })

  let emailed = false
  if (contactEmail) {
    const origin = await originFromRequest()
    const { subject, html } = transferEmail({
      partnerName: partner.orgName,
      recipientOrg: orgName,
      contactName,
      amount,
      code: result.code,
      redeemUrl: `${origin}/redeem/${result.code}`,
      engagementSuggestion: engLabel,
      message,
      relationshipManager: rm,
      expiresAt: result.expiresAt,
    })
    const sent = await sendEmail({ to: contactEmail, subject, html })
    emailed = sent.ok
  }

  revalidatePath('/dashboard/partner')
  return {
    ok: true,
    message: emailed
      ? `${amount} credits sent to ${orgName}. Redemption code emailed.`
      : `${amount} credits sent to ${orgName}. Code: ${result.code}`,
  }
}

// --- Add more / reclaim unused for an existing recipient --------------------
export async function adjustAllocationAction(formData: FormData): Promise<ActionResult> {
  const a = await actor()
  if (!a) return { ok: false, error: 'Not allowed.' }
  const { partner, userId, name } = a

  const recipientId = String(formData.get('recipientId') ?? '')
  const recipientKind = String(formData.get('recipientKind') ?? 'business') as RecipientKind
  const mode = String(formData.get('mode') ?? 'add') === 'reclaim' ? 'reclaim' : 'add'
  const amount = parseAmount(formData.get('amount'))
  const note = String(formData.get('note') ?? '').trim() || null

  if (!recipientId) return { ok: false, error: 'Recipient is required.' }
  if (amount <= 0) return { ok: false, error: 'Enter a credit amount greater than zero.' }

  if (mode === 'add') {
    if (!withinLimit(partner, partner.partnerRole, amount)) {
      return { ok: false, error: `That exceeds your ${partner.partnerRole} limit. Ask a Program Admin.` }
    }
    const available = await getPartnerAvailable(partner.partnerId, partner.annualAllocation)
    if (amount > available) return { ok: false, error: `Only ${available} credits available.` }
  }

  await adjustAllocation({
    partnerId: partner.partnerId,
    recipientId,
    recipientKind,
    mode,
    amount,
    note,
    authorizedBy: userId,
    authorizedByName: name,
  })

  revalidatePath('/dashboard/partner')
  return {
    ok: true,
    message: mode === 'add' ? `Added ${amount} credits.` : `Reclaimed ${amount} credits.`,
  }
}

// --- Settings: policies (admin only) ----------------------------------------
export async function updatePoliciesAction(formData: FormData): Promise<ActionResult> {
  const a = await actor()
  if (!a) return { ok: false, error: 'Not allowed.' }
  if (a.partner.partnerRole !== 'admin') return { ok: false, error: 'Only a Program Admin can change policies.' }

  const redemptionWindowDays = parseAmount(formData.get('redemptionWindowDays'))
  const drafterLimit = parseAmount(formData.get('drafterLimit'))
  const approverLimit = parseAmount(formData.get('approverLimit'))
  const dualSignoffThreshold = parseAmount(formData.get('dualSignoffThreshold'))
  if (redemptionWindowDays <= 0) return { ok: false, error: 'Redemption window must be positive.' }

  await updatePartnerPolicies({
    partnerId: a.partner.partnerId,
    redemptionWindowDays,
    drafterLimit,
    approverLimit,
    dualSignoffThreshold,
  })
  revalidatePath('/dashboard/partner')
  return { ok: true, message: 'Policies updated.' }
}

// --- Settings: authorized users (admin only) --------------------------------
export async function invitePartnerMemberAction(formData: FormData): Promise<ActionResult> {
  const a = await actor()
  if (!a) return { ok: false, error: 'Not allowed.' }
  if (a.partner.partnerRole !== 'admin') return { ok: false, error: 'Only a Program Admin can invite users.' }

  const email = String(formData.get('email') ?? '').trim().toLowerCase()
  if (!email.includes('@')) return { ok: false, error: 'Enter a valid email address.' }
  const rawRole = String(formData.get('partnerRole') ?? 'drafter')
  const role = (PARTNER_ROLES as string[]).includes(rawRole) ? (rawRole as PartnerRole) : 'drafter'

  const db = getDb()
  let [profile] = await db.select().from(profiles).where(eq(profiles.email, email)).limit(1)
  let invited = false
  if (!profile) {
    const { error } = await getSupabaseAdmin().auth.admin.inviteUserByEmail(email)
    if (error) return { ok: false, error: `Could not send invite: ${error.message}` }
    invited = true
    ;[profile] = await db.select().from(profiles).where(eq(profiles.email, email)).limit(1)
    if (!profile) return { ok: false, error: 'Invite sent but profile not found — try again.' }
  }

  await upsertPartnerMember({ partnerId: a.partner.partnerId, userId: profile.id, role })
  revalidatePath('/dashboard/partner')
  return {
    ok: true,
    message: invited ? `Invite sent to ${email}.` : `${email} added as ${role}.`,
  }
}

export async function setPartnerMemberRoleAction(
  membershipId: string,
  role: string,
): Promise<ActionResult> {
  const a = await actor()
  if (!a) return { ok: false, error: 'Not allowed.' }
  if (a.partner.partnerRole !== 'admin') return { ok: false, error: 'Only a Program Admin can change roles.' }
  const partnerRole = (PARTNER_ROLES as string[]).includes(role) ? (role as PartnerRole) : null
  if (!partnerRole) return { ok: false, error: 'Invalid role.' }

  await setPartnerMemberRole(membershipId, partnerRole)
  revalidatePath('/dashboard/partner')
  return { ok: true }
}

export async function removePartnerMemberAction(membershipId: string): Promise<ActionResult> {
  const a = await actor()
  if (!a) return { ok: false, error: 'Not allowed.' }
  if (a.partner.partnerRole !== 'admin') return { ok: false, error: 'Only a Program Admin can remove users.' }

  await removePartnerMember(membershipId)
  revalidatePath('/dashboard/partner')
  return { ok: true }
}
