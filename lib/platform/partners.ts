// Community Innovation Partner (CIP) service — the partner credit ledger and
// everything derived from it. Server-only (Drizzle). A partner's available
// balance is DERIVED, never cached:
//   available = annual_allocation − Σ(assign+transfer) + Σ(reclaim)
// Per recipient: assigned = Σ(assign+transfer) − Σ(reclaim); redeemed = Σ(redeem).
// These reads are the single definition of "what does this partner's credit
// position look like", reused by the console, staff views, and the redeem page.
import { randomBytes } from 'crypto'
import { and, desc, eq, ilike, sql } from 'drizzle-orm'
import { getDb } from '@/lib/db'
import {
  organizations,
  organizationMembers,
  partners,
  partnerCreditEvents,
  partnerMembers,
  partnerRecipients,
  partnerRedemptionCodes,
  profiles,
  projects,
} from '@/lib/db/schema'
import type {
  PartnerEventType,
  PartnerRole,
  RecipientKind,
  RecipientStatus,
} from './partner-constants'

// Re-export the pure constants so server callers import from one place.
export * from './partner-constants'

const ev = partnerCreditEvents
const rc = partnerRecipients

// ---------------------------------------------------------------------------
// Partner + membership
// ---------------------------------------------------------------------------
export type PartnerContext = {
  partnerId: string
  partnerRole: PartnerRole
  orgId: string
  orgName: string
  tier: string
  annualAllocation: number
  cycleStart: string | null
  cycleEnd: string | null
  footprint: string | null
  redemptionWindowDays: number
  drafterLimit: number
  approverLimit: number
  dualSignoffThreshold: number
  status: 'active' | 'inactive'
}

// The partner console the signed-in user can access (their membership + config).
// A user belongs to at most one partner today.
export async function getPartnerForUser(userId: string): Promise<PartnerContext | null> {
  const db = getDb()
  const [row] = await db
    .select({
      partnerId: partners.id,
      partnerRole: partnerMembers.partnerRole,
      orgId: partners.orgId,
      orgName: organizations.name,
      tier: partners.tier,
      annualAllocation: partners.annualAllocation,
      cycleStart: partners.cycleStart,
      cycleEnd: partners.cycleEnd,
      footprint: partners.footprint,
      redemptionWindowDays: partners.redemptionWindowDays,
      drafterLimit: partners.drafterLimit,
      approverLimit: partners.approverLimit,
      dualSignoffThreshold: partners.dualSignoffThreshold,
      status: partners.status,
    })
    .from(partnerMembers)
    .innerJoin(partners, eq(partners.id, partnerMembers.partnerId))
    .innerJoin(organizations, eq(organizations.id, partners.orgId))
    .where(eq(partnerMembers.userId, userId))
    .limit(1)
  return row ?? null
}

// Same shape, addressed by partner id (staff views, where there's no membership).
export async function getPartnerById(partnerId: string): Promise<PartnerContext | null> {
  const db = getDb()
  const [row] = await db
    .select({
      partnerId: partners.id,
      partnerRole: sql<PartnerRole>`'admin'`,
      orgId: partners.orgId,
      orgName: organizations.name,
      tier: partners.tier,
      annualAllocation: partners.annualAllocation,
      cycleStart: partners.cycleStart,
      cycleEnd: partners.cycleEnd,
      footprint: partners.footprint,
      redemptionWindowDays: partners.redemptionWindowDays,
      drafterLimit: partners.drafterLimit,
      approverLimit: partners.approverLimit,
      dualSignoffThreshold: partners.dualSignoffThreshold,
      status: partners.status,
    })
    .from(partners)
    .innerJoin(organizations, eq(organizations.id, partners.orgId))
    .where(eq(partners.id, partnerId))
    .limit(1)
  return row ?? null
}

export async function getPartnerMemberRole(
  userId: string,
  partnerId: string,
): Promise<PartnerRole | null> {
  const db = getDb()
  const [m] = await db
    .select({ role: partnerMembers.partnerRole })
    .from(partnerMembers)
    .where(and(eq(partnerMembers.userId, userId), eq(partnerMembers.partnerId, partnerId)))
    .limit(1)
  return m?.role ?? null
}

// ---------------------------------------------------------------------------
// Overview metrics
// ---------------------------------------------------------------------------
export type PartnerOverview = {
  annualAllocation: number
  available: number
  committed: number
  internalAssigned: number
  internalDeptCount: number
  externalTransferred: number
  externalOrgCount: number
  redeemed: number
  redemptionRate: number // % of committed that's been redeemed
  recipientCount: number
  allocationByType: { kind: RecipientKind; amount: number }[]
}

export async function getPartnerOverview(
  partnerId: string,
  annualAllocation: number,
): Promise<PartnerOverview> {
  const db = getDb()

  // Net assigned (assign+transfer − reclaim) and redeemed, partitioned by the
  // recipient's kind so we get the internal/external split + the type breakdown.
  const rows = await db
    .select({
      kind: sql<RecipientKind>`${rc.kind}`,
      assigned: sql<number>`coalesce(sum(${ev.amount}) filter (where ${ev.eventType} in ('assign','transfer')), 0)::int`,
      reclaimed: sql<number>`coalesce(sum(${ev.amount}) filter (where ${ev.eventType} = 'reclaim'), 0)::int`,
      redeemed: sql<number>`coalesce(sum(${ev.amount}) filter (where ${ev.eventType} = 'redeem'), 0)::int`,
      recipients: sql<number>`count(distinct ${rc.id})::int`,
    })
    .from(rc)
    .leftJoin(ev, eq(ev.recipientId, rc.id))
    .where(eq(rc.partnerId, partnerId))
    .groupBy(rc.kind)

  let internalAssigned = 0
  let internalDeptCount = 0
  let externalTransferred = 0
  let externalOrgCount = 0
  let committed = 0
  let redeemed = 0
  let recipientCount = 0
  const allocationByType: { kind: RecipientKind; amount: number }[] = []

  for (const r of rows) {
    const net = r.assigned - r.reclaimed
    committed += net
    redeemed += r.redeemed
    recipientCount += r.recipients
    if (net > 0) allocationByType.push({ kind: r.kind, amount: net })
    if (r.kind === 'internal') {
      internalAssigned += net
      internalDeptCount += r.recipients
    } else {
      externalTransferred += net
      externalOrgCount += r.recipients
    }
  }

  const redemptionRate = committed > 0 ? Math.round((redeemed / committed) * 100) : 0
  return {
    annualAllocation,
    available: annualAllocation - committed,
    committed,
    internalAssigned,
    internalDeptCount,
    externalTransferred,
    externalOrgCount,
    redeemed,
    redemptionRate,
    recipientCount,
    allocationByType,
  }
}

// The partner's available balance alone (cheap; used to validate mutations).
export async function getPartnerAvailable(
  partnerId: string,
  annualAllocation: number,
): Promise<number> {
  const db = getDb()
  const [row] = await db
    .select({
      committed: sql<number>`coalesce(sum(${ev.amount}) filter (where ${ev.eventType} in ('assign','transfer')), 0)::int - coalesce(sum(${ev.amount}) filter (where ${ev.eventType} = 'reclaim'), 0)::int`,
    })
    .from(ev)
    .where(eq(ev.partnerId, partnerId))
  return annualAllocation - (row?.committed ?? 0)
}

// ---------------------------------------------------------------------------
// Recipients (with derived assigned / redeemed / remaining / status)
// ---------------------------------------------------------------------------
export type RecipientRow = {
  id: string
  kind: RecipientKind
  name: string
  contactName: string | null
  contactEmail: string | null
  relationshipManager: string | null
  linkedOrgId: string | null
  assigned: number
  redeemed: number
  remaining: number
  nextExpiry: string | null
  status: RecipientStatus
}

function deriveStatus(assigned: number, redeemed: number, nextExpiry: string | null): RecipientStatus {
  const remaining = assigned - redeemed
  if (assigned > 0 && remaining <= 0) return 'redeemed'
  if (assigned > 0 && redeemed === 0) return 'pending'
  if (remaining > 0 && nextExpiry) {
    const days = (new Date(nextExpiry + 'T00:00:00').getTime() - Date.now()) / 86_400_000
    if (days <= 14) return 'expiring'
  }
  return 'active'
}

export async function listRecipients(partnerId: string): Promise<RecipientRow[]> {
  const db = getDb()
  const rows = await db
    .select({
      id: rc.id,
      kind: sql<RecipientKind>`${rc.kind}`,
      name: rc.name,
      contactName: rc.contactName,
      contactEmail: rc.contactEmail,
      relationshipManager: rc.relationshipManager,
      linkedOrgId: rc.linkedOrgId,
      assigned: sql<number>`(
        coalesce((select sum(amount) from ${ev} e where e.recipient_id = ${rc.id} and e.event_type in ('assign','transfer')), 0)
        - coalesce((select sum(amount) from ${ev} e where e.recipient_id = ${rc.id} and e.event_type = 'reclaim'), 0)
      )::int`,
      redeemed: sql<number>`coalesce((select sum(amount) from ${ev} e where e.recipient_id = ${rc.id} and e.event_type = 'redeem'), 0)::int`,
      nextExpiry: sql<string | null>`(select min(expires_at) from ${partnerRedemptionCodes} c where c.recipient_id = ${rc.id} and c.status in ('issued','partially_redeemed') and c.remaining > 0)`,
    })
    .from(rc)
    .where(eq(rc.partnerId, partnerId))
    .orderBy(rc.kind, rc.name)

  return rows.map((r) => ({
    ...r,
    remaining: r.assigned - r.redeemed,
    status: deriveStatus(r.assigned, r.redeemed, r.nextExpiry),
  }))
}

export async function getRecipient(recipientId: string): Promise<RecipientRow | null> {
  const db = getDb()
  const [base] = await db.select().from(rc).where(eq(rc.id, recipientId)).limit(1)
  if (!base) return null
  const list = await listRecipients(base.partnerId)
  return list.find((r) => r.id === recipientId) ?? null
}

// ---------------------------------------------------------------------------
// Ledger
// ---------------------------------------------------------------------------
export type PartnerLedgerRow = {
  id: string
  eventType: PartnerEventType
  amount: number
  eventDate: string
  recipientName: string | null
  recipientKind: RecipientKind | null
  redemptionType: string | null
  authorizedByName: string | null
  note: string | null
}

export async function listLedger(partnerId: string, limit = 300): Promise<PartnerLedgerRow[]> {
  const db = getDb()
  return db
    .select({
      id: ev.id,
      eventType: sql<PartnerEventType>`${ev.eventType}`,
      amount: ev.amount,
      eventDate: ev.eventDate,
      recipientName: rc.name,
      recipientKind: sql<RecipientKind | null>`${rc.kind}`,
      redemptionType: ev.redemptionType,
      authorizedByName: sql<string | null>`coalesce(${ev.authorizedByName}, ${profiles.fullName}, ${profiles.email})`,
      note: ev.note,
    })
    .from(ev)
    .leftJoin(rc, eq(rc.id, ev.recipientId))
    .leftJoin(profiles, eq(profiles.id, ev.authorizedBy))
    .where(eq(ev.partnerId, partnerId))
    .orderBy(desc(ev.eventDate), desc(ev.createdAt))
    .limit(limit)
}

// ---------------------------------------------------------------------------
// Redemptions
// ---------------------------------------------------------------------------
export type RedemptionRow = {
  id: string
  eventDate: string
  recipientName: string | null
  recipientKind: RecipientKind | null
  engagementKey: string | null
  redemptionType: string | null
  projectLabel: string | null
  status: string | null
  amount: number
}

export async function listRedemptions(partnerId: string, limit = 200): Promise<RedemptionRow[]> {
  const db = getDb()
  return db
    .select({
      id: ev.id,
      eventDate: ev.eventDate,
      recipientName: rc.name,
      recipientKind: sql<RecipientKind | null>`${rc.kind}`,
      engagementKey: ev.engagementKey,
      redemptionType: ev.redemptionType,
      projectLabel: ev.projectLabel,
      status: ev.status,
      amount: ev.amount,
    })
    .from(ev)
    .leftJoin(rc, eq(rc.id, ev.recipientId))
    .where(and(eq(ev.partnerId, partnerId), eq(ev.eventType, 'redeem')))
    .orderBy(desc(ev.eventDate), desc(ev.createdAt))
    .limit(limit)
}

export type RedemptionSummary = {
  sprintCount: number
  sprintCredits: number
  prototypeCount: number
  prototypeCredits: number
  workshopSeats: number
  workshopCredits: number
}

export async function getRedemptionSummary(partnerId: string): Promise<RedemptionSummary> {
  const db = getDb()
  const [row] = await db
    .select({
      sprintCount: sql<number>`count(*) filter (where ${ev.engagementKey} = 'sprint')::int`,
      sprintCredits: sql<number>`coalesce(sum(${ev.amount}) filter (where ${ev.engagementKey} = 'sprint'), 0)::int`,
      prototypeCount: sql<number>`count(*) filter (where ${ev.engagementKey} = 'prototype')::int`,
      prototypeCredits: sql<number>`coalesce(sum(${ev.amount}) filter (where ${ev.engagementKey} = 'prototype'), 0)::int`,
      workshopSeats: sql<number>`coalesce(sum(${ev.amount}) filter (where ${ev.engagementKey} = 'workshop_seat'), 0)::int`,
      workshopCredits: sql<number>`coalesce(sum(${ev.amount}) filter (where ${ev.engagementKey} = 'workshop_seat'), 0)::int`,
    })
    .from(ev)
    .where(and(eq(ev.partnerId, partnerId), eq(ev.eventType, 'redeem')))
  return (
    row ?? {
      sprintCount: 0,
      sprintCredits: 0,
      prototypeCount: 0,
      prototypeCredits: 0,
      workshopSeats: 0,
      workshopCredits: 0,
    }
  )
}

// ---------------------------------------------------------------------------
// Members
// ---------------------------------------------------------------------------
export type PartnerMemberRow = {
  membershipId: string
  userId: string
  partnerRole: PartnerRole
  fullName: string | null
  email: string | null
}

export async function listPartnerMembers(partnerId: string): Promise<PartnerMemberRow[]> {
  const db = getDb()
  return db
    .select({
      membershipId: partnerMembers.id,
      userId: partnerMembers.userId,
      partnerRole: partnerMembers.partnerRole,
      fullName: profiles.fullName,
      email: profiles.email,
    })
    .from(partnerMembers)
    .leftJoin(profiles, eq(profiles.id, partnerMembers.userId))
    .where(eq(partnerMembers.partnerId, partnerId))
    .orderBy(partnerMembers.partnerRole) // admin, approver, drafter
}

// ---------------------------------------------------------------------------
// Staff: list all partners with a headline metric
// ---------------------------------------------------------------------------
export type PartnerSummary = {
  id: string
  orgId: string
  orgName: string
  tier: string
  annualAllocation: number
  committed: number
  available: number
  memberCount: number
}

export async function listPartners(): Promise<PartnerSummary[]> {
  const db = getDb()
  const rows = await db
    .select({
      id: partners.id,
      orgId: partners.orgId,
      orgName: organizations.name,
      tier: partners.tier,
      annualAllocation: partners.annualAllocation,
      committed: sql<number>`(
        coalesce((select sum(amount) from ${ev} e where e.partner_id = ${partners.id} and e.event_type in ('assign','transfer')), 0)
        - coalesce((select sum(amount) from ${ev} e where e.partner_id = ${partners.id} and e.event_type = 'reclaim'), 0)
      )::int`,
      memberCount: sql<number>`(select count(*)::int from ${partnerMembers} m where m.partner_id = ${partners.id})`,
    })
    .from(partners)
    .innerJoin(organizations, eq(organizations.id, partners.orgId))
    .orderBy(organizations.name)
  return rows.map((r) => ({ ...r, available: r.annualAllocation - r.committed }))
}

// Organizations not yet designated as partners (for the staff create form).
export async function listOrgsWithoutPartner(): Promise<{ id: string; name: string }[]> {
  const db = getDb()
  return db
    .select({ id: organizations.id, name: organizations.name })
    .from(organizations)
    .where(sql`not exists (select 1 from ${partners} p where p.org_id = ${organizations.id})`)
    .orderBy(organizations.name)
}

// ---------------------------------------------------------------------------
// Mutations. Callers (server actions) validate authz + balance first.
// ---------------------------------------------------------------------------

// Find an existing recipient by (partner, kind, name) or create it. Auto-links
// to a platform organization when the name matches one.
async function findOrCreateRecipient(input: {
  partnerId: string
  kind: RecipientKind
  name: string
  contactName?: string | null
  contactEmail?: string | null
  relationshipManager?: string | null
}): Promise<{ id: string; linkedOrgId: string | null }> {
  const db = getDb()
  const [existing] = await db
    .select({ id: rc.id, linkedOrgId: rc.linkedOrgId })
    .from(rc)
    .where(
      and(
        eq(rc.partnerId, input.partnerId),
        eq(rc.kind, input.kind),
        ilike(rc.name, input.name),
      ),
    )
    .limit(1)

  if (existing) {
    // Refresh contact info if newly provided.
    if (input.contactName || input.contactEmail || input.relationshipManager) {
      await db
        .update(rc)
        .set({
          contactName: input.contactName ?? undefined,
          contactEmail: input.contactEmail ?? undefined,
          relationshipManager: input.relationshipManager ?? undefined,
          updatedAt: new Date(),
        })
        .where(eq(rc.id, existing.id))
    }
    return existing
  }

  // Auto-link to a platform organization for external recipients.
  let linkedOrgId: string | null = null
  if (input.kind !== 'internal') {
    const [org] = await db
      .select({ id: organizations.id })
      .from(organizations)
      .where(ilike(organizations.name, input.name))
      .limit(1)
    linkedOrgId = org?.id ?? null
  }

  const [created] = await db
    .insert(rc)
    .values({
      partnerId: input.partnerId,
      kind: input.kind,
      name: input.name,
      contactName: input.contactName ?? null,
      contactEmail: input.contactEmail ?? null,
      relationshipManager: input.relationshipManager ?? null,
      linkedOrgId,
    })
    .returning({ id: rc.id, linkedOrgId: rc.linkedOrgId })
  return created
}

type Actor = { authorizedBy?: string | null; authorizedByName?: string | null }

// Assign credits to an internal department.
export async function assignInternal(
  input: {
    partnerId: string
    departmentName: string
    managerName?: string | null
    managerEmail?: string | null
    amount: number
    engagementKey?: string | null
    engagementLabel?: string | null
    note?: string | null
  } & Actor,
): Promise<{ recipientId: string }> {
  const db = getDb()
  const recipient = await findOrCreateRecipient({
    partnerId: input.partnerId,
    kind: 'internal',
    name: input.departmentName,
    contactName: input.managerName,
    contactEmail: input.managerEmail,
  })
  await db.insert(ev).values({
    partnerId: input.partnerId,
    recipientId: recipient.id,
    eventType: 'assign',
    amount: input.amount,
    engagementKey: input.engagementKey ?? null,
    redemptionType: input.engagementLabel ?? null,
    note: input.note ?? null,
    authorizedBy: input.authorizedBy ?? null,
    authorizedByName: input.authorizedByName ?? null,
  })
  return { recipientId: recipient.id }
}

// Transfer credits to an external org: creates/updates the recipient, mints a
// redemption code, and logs the transfer. Returns everything the caller needs to
// email the recipient.
export async function transferExternal(
  input: {
    partnerId: string
    partnerName: string
    kind: RecipientKind
    orgName: string
    contactName?: string | null
    contactEmail?: string | null
    relationshipManager?: string | null
    amount: number
    engagementKey?: string | null
    engagementLabel?: string | null
    message?: string | null
    note?: string | null
    redemptionWindowDays: number
  } & Actor,
): Promise<{
  recipientId: string
  linkedOrgId: string | null
  code: string
  codeId: string
  expiresAt: string
}> {
  const db = getDb()
  const recipient = await findOrCreateRecipient({
    partnerId: input.partnerId,
    kind: input.kind,
    name: input.orgName,
    contactName: input.contactName,
    contactEmail: input.contactEmail,
    relationshipManager: input.relationshipManager,
  })

  const code = generateCode(input.partnerName)
  const expires = new Date(Date.now() + input.redemptionWindowDays * 86_400_000)
  const expiresAt = expires.toISOString().slice(0, 10)

  const result = await db.transaction(async (tx) => {
    const [codeRow] = await tx
      .insert(partnerRedemptionCodes)
      .values({
        partnerId: input.partnerId,
        recipientId: recipient.id,
        code,
        amount: input.amount,
        remaining: input.amount,
        engagementSuggestion: input.engagementLabel ?? null,
        message: input.message ?? null,
        relationshipManager: input.relationshipManager ?? null,
        expiresAt,
      })
      .returning({ id: partnerRedemptionCodes.id })
    await tx.insert(ev).values({
      partnerId: input.partnerId,
      recipientId: recipient.id,
      eventType: 'transfer',
      amount: input.amount,
      engagementKey: input.engagementKey ?? null,
      redemptionType: input.engagementLabel ?? null,
      note: input.note ?? null,
      codeId: codeRow.id,
      authorizedBy: input.authorizedBy ?? null,
      authorizedByName: input.authorizedByName ?? null,
    })
    return { codeId: codeRow.id }
  })

  return {
    recipientId: recipient.id,
    linkedOrgId: recipient.linkedOrgId,
    code,
    codeId: result.codeId,
    expiresAt,
  }
}

// Add more credits to an existing recipient, or reclaim unused ones.
export async function adjustAllocation(
  input: {
    partnerId: string
    recipientId: string
    recipientKind: RecipientKind
    mode: 'add' | 'reclaim'
    amount: number
    note?: string | null
  } & Actor,
): Promise<void> {
  const db = getDb()
  if (input.mode === 'add') {
    await db.insert(ev).values({
      partnerId: input.partnerId,
      recipientId: input.recipientId,
      eventType: input.recipientKind === 'internal' ? 'assign' : 'transfer',
      amount: input.amount,
      redemptionType: 'Top-up',
      note: input.note ?? null,
      authorizedBy: input.authorizedBy ?? null,
      authorizedByName: input.authorizedByName ?? null,
    })
  } else {
    await db.insert(ev).values({
      partnerId: input.partnerId,
      recipientId: input.recipientId,
      eventType: 'reclaim',
      amount: input.amount,
      redemptionType: 'Manual reclaim',
      note: input.note ?? null,
      authorizedBy: input.authorizedBy ?? null,
      authorizedByName: input.authorizedByName ?? null,
    })
  }
}

// Record a redemption against a code (used by the public /redeem flow). Logs the
// redeem event and decrements the code's remaining balance.
export async function recordRedemption(input: {
  codeId: string
  partnerId: string
  recipientId: string | null
  amount: number
  engagementKey?: string | null
  redemptionType?: string | null
  projectLabel?: string | null
  authorizedByName?: string | null
}): Promise<void> {
  const db = getDb()
  await db.transaction(async (tx) => {
    await tx.insert(ev).values({
      partnerId: input.partnerId,
      recipientId: input.recipientId,
      eventType: 'redeem',
      amount: input.amount,
      engagementKey: input.engagementKey ?? null,
      redemptionType: input.redemptionType ?? null,
      projectLabel: input.projectLabel ?? null,
      status: 'in_progress',
      codeId: input.codeId,
      authorizedByName: input.authorizedByName ?? null,
    })
    const [code] = await tx
      .select({ remaining: partnerRedemptionCodes.remaining })
      .from(partnerRedemptionCodes)
      .where(eq(partnerRedemptionCodes.id, input.codeId))
      .limit(1)
    const nextRemaining = Math.max(0, (code?.remaining ?? 0) - input.amount)
    await tx
      .update(partnerRedemptionCodes)
      .set({
        remaining: nextRemaining,
        status: nextRemaining <= 0 ? 'redeemed' : 'partially_redeemed',
      })
      .where(eq(partnerRedemptionCodes.id, input.codeId))
  })
}

// Public lookup for the redeem page (server-side; RLS bypassed via Drizzle).
export type RedemptionCodeView = {
  id: string
  partnerId: string
  recipientId: string | null
  partnerName: string
  recipientName: string | null
  code: string
  amount: number
  remaining: number
  engagementSuggestion: string | null
  message: string | null
  relationshipManager: string | null
  expiresAt: string | null
  status: string
}

export async function getRedemptionByCode(code: string): Promise<RedemptionCodeView | null> {
  const db = getDb()
  const [row] = await db
    .select({
      id: partnerRedemptionCodes.id,
      partnerId: partnerRedemptionCodes.partnerId,
      recipientId: partnerRedemptionCodes.recipientId,
      partnerName: organizations.name,
      recipientName: rc.name,
      code: partnerRedemptionCodes.code,
      amount: partnerRedemptionCodes.amount,
      remaining: partnerRedemptionCodes.remaining,
      engagementSuggestion: partnerRedemptionCodes.engagementSuggestion,
      message: partnerRedemptionCodes.message,
      relationshipManager: partnerRedemptionCodes.relationshipManager,
      expiresAt: partnerRedemptionCodes.expiresAt,
      status: partnerRedemptionCodes.status,
    })
    .from(partnerRedemptionCodes)
    .innerJoin(partners, eq(partners.id, partnerRedemptionCodes.partnerId))
    .innerJoin(organizations, eq(organizations.id, partners.orgId))
    .leftJoin(rc, eq(rc.id, partnerRedemptionCodes.recipientId))
    .where(eq(partnerRedemptionCodes.code, code))
    .limit(1)
  return row ?? null
}

// ---------------------------------------------------------------------------
// Settings mutations
// ---------------------------------------------------------------------------
export async function updatePartnerPolicies(input: {
  partnerId: string
  redemptionWindowDays: number
  drafterLimit: number
  approverLimit: number
  dualSignoffThreshold: number
}): Promise<void> {
  await getDb()
    .update(partners)
    .set({
      redemptionWindowDays: input.redemptionWindowDays,
      drafterLimit: input.drafterLimit,
      approverLimit: input.approverLimit,
      dualSignoffThreshold: input.dualSignoffThreshold,
      updatedAt: new Date(),
    })
    .where(eq(partners.id, input.partnerId))
}

export async function updatePartnerConfig(input: {
  partnerId: string
  tier?: string
  annualAllocation?: number
  cycleStart?: string | null
  cycleEnd?: string | null
  footprint?: string | null
}): Promise<void> {
  await getDb()
    .update(partners)
    .set({
      tier: input.tier,
      annualAllocation: input.annualAllocation,
      cycleStart: input.cycleStart ?? undefined,
      cycleEnd: input.cycleEnd ?? undefined,
      footprint: input.footprint ?? undefined,
      updatedAt: new Date(),
    })
    .where(eq(partners.id, input.partnerId))
}

export async function setPartnerMemberRole(
  membershipId: string,
  role: PartnerRole,
): Promise<void> {
  await getDb()
    .update(partnerMembers)
    .set({ partnerRole: role })
    .where(eq(partnerMembers.id, membershipId))
}

export async function removePartnerMember(membershipId: string): Promise<void> {
  await getDb().delete(partnerMembers).where(eq(partnerMembers.id, membershipId))
}

// Add (or promote) a user onto a partner console.
export async function upsertPartnerMember(input: {
  partnerId: string
  userId: string
  role: PartnerRole
}): Promise<void> {
  const db = getDb()
  const [existing] = await db
    .select({ id: partnerMembers.id })
    .from(partnerMembers)
    .where(
      and(eq(partnerMembers.partnerId, input.partnerId), eq(partnerMembers.userId, input.userId)),
    )
    .limit(1)
  if (existing) {
    await db
      .update(partnerMembers)
      .set({ partnerRole: input.role })
      .where(eq(partnerMembers.id, existing.id))
  } else {
    await db
      .insert(partnerMembers)
      .values({ partnerId: input.partnerId, userId: input.userId, partnerRole: input.role })
  }
}

// ---------------------------------------------------------------------------
// Staff: create a partner
// ---------------------------------------------------------------------------
export async function createPartner(input: {
  orgId: string
  tier?: string
  annualAllocation: number
  cycleStart?: string | null
  cycleEnd?: string | null
  footprint?: string | null
  redemptionWindowDays?: number
  authorizedBy?: string | null
  authorizedByName?: string | null
}): Promise<{ partnerId: string }> {
  const db = getDb()
  return db.transaction(async (tx) => {
    const [partner] = await tx
      .insert(partners)
      .values({
        orgId: input.orgId,
        tier: input.tier ?? undefined,
        annualAllocation: input.annualAllocation,
        cycleStart: input.cycleStart ?? undefined,
        cycleEnd: input.cycleEnd ?? undefined,
        footprint: input.footprint ?? undefined,
        redemptionWindowDays: input.redemptionWindowDays ?? undefined,
      })
      .returning({ id: partners.id })

    // Seed authorized users from the org's members: admins → partner admins,
    // members → drafters. So the org can use the console immediately.
    const members = await tx
      .select({ userId: organizationMembers.userId, roleInOrg: organizationMembers.roleInOrg })
      .from(organizationMembers)
      .where(eq(organizationMembers.orgId, input.orgId))
    if (members.length > 0) {
      await tx.insert(partnerMembers).values(
        members.map((m) => ({
          partnerId: partner.id,
          userId: m.userId,
          partnerRole: (m.roleInOrg === 'admin' ? 'admin' : 'drafter') as PartnerRole,
        })),
      )
    }

    // Opening allocation entry for the ledger (display-only; balance is derived
    // from annual_allocation, not from allocation events).
    await tx.insert(ev).values({
      partnerId: partner.id,
      eventType: 'allocation',
      amount: input.annualAllocation,
      redemptionType: 'Annual allocation',
      authorizedBy: input.authorizedBy ?? null,
      authorizedByName: input.authorizedByName ?? null,
    })

    return { partnerId: partner.id }
  })
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function generateCode(partnerName: string): string {
  const prefix =
    (partnerName || 'CIP')
      .replace(/[^a-zA-Z]/g, '')
      .slice(0, 4)
      .toUpperCase() || 'CIP'
  const raw = randomBytes(6).toString('hex').toUpperCase()
  return `${prefix}-${raw.slice(0, 4)}-${raw.slice(4, 8)}-${raw.slice(8, 12)}`
}
