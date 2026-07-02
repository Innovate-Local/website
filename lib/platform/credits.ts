// Innovation Credits service — the per-org credit ledger and everything derived
// from it. Server-only (Drizzle). An org's available balance is the signed sum
// of its own credit_transactions rows; nothing is cached. Reads here are the
// one definition of "what does this org's credit position look like", reused by
// the home, the credits console, and the org views.
import { and, desc, eq, ne, sql } from 'drizzle-orm'
import { getDb } from '@/lib/db'
import {
  creditTransactions,
  organizations,
  organizationMembers,
  projects,
  profiles,
} from '@/lib/db/schema'
import { getActAs, getProfile } from '@/lib/auth/session'
import type { OrgRole } from './roles'
import type { ProjectStatus } from './project-status'
import type { CreditKind } from './credit-kinds'

// Re-export pure constants so server callers import from one place.
export { CREDIT_KINDS, CREDIT_KIND_LABEL, creditDirection } from './credit-kinds'
export type { CreditKind } from './credit-kinds'
export { ENGAGEMENT_TYPES, ENGAGEMENT_LABEL, engagementLabel } from './engagement-types'

const ct = creditTransactions

// ---------------------------------------------------------------------------
// Balances
// ---------------------------------------------------------------------------
export type OrgBalance = {
  available: number // what the org can still spend or transfer
  granted: number // total ever allocated to the org by the hub
  transferredIn: number // received from other orgs
  transferredOut: number // sent to other orgs (positive magnitude)
  spent: number // committed/redeemed on projects (positive magnitude)
  reclaimed: number
  committed: number // spent + transferredOut — credits put to work
}

const ZERO_BALANCE: OrgBalance = {
  available: 0,
  granted: 0,
  transferredIn: 0,
  transferredOut: 0,
  spent: 0,
  reclaimed: 0,
  committed: 0,
}

export async function getOrgBalance(orgId: string): Promise<OrgBalance> {
  const db = getDb()
  const [row] = await db
    .select({
      available: sql<number>`coalesce(sum(${ct.delta}), 0)::int`,
      granted: sql<number>`coalesce(sum(${ct.delta}) filter (where ${ct.kind} = 'grant'), 0)::int`,
      transferredIn: sql<number>`coalesce(sum(${ct.delta}) filter (where ${ct.kind} = 'transfer_in'), 0)::int`,
      transferredOut: sql<number>`coalesce(-sum(${ct.delta}) filter (where ${ct.kind} = 'transfer_out'), 0)::int`,
      spent: sql<number>`coalesce(-sum(${ct.delta}) filter (where ${ct.kind} = 'spend'), 0)::int`,
      reclaimed: sql<number>`coalesce(sum(${ct.delta}) filter (where ${ct.kind} = 'reclaim'), 0)::int`,
    })
    .from(ct)
    .where(eq(ct.orgId, orgId))

  if (!row) return ZERO_BALANCE
  return { ...row, committed: row.spent + row.transferredOut }
}

// ---------------------------------------------------------------------------
// Ledger
// ---------------------------------------------------------------------------
export type LedgerEntry = {
  id: string
  kind: CreditKind
  delta: number
  engagementType: string | null
  note: string | null
  createdAt: Date
  counterpartyName: string | null
  projectId: string | null
  projectTitle: string | null
  authorizedByName: string | null
}

export async function getOrgLedger(orgId: string, limit = 200): Promise<LedgerEntry[]> {
  const db = getDb()
  return db
    .select({
      id: ct.id,
      kind: sql<CreditKind>`${ct.kind}`,
      delta: ct.delta,
      engagementType: ct.engagementType,
      note: ct.note,
      createdAt: ct.createdAt,
      counterpartyName: organizations.name,
      projectId: ct.projectId,
      projectTitle: projects.title,
      authorizedByName: sql<string | null>`coalesce(${profiles.fullName}, ${profiles.email})`,
    })
    .from(ct)
    .leftJoin(organizations, eq(organizations.id, ct.counterpartyOrgId))
    .leftJoin(projects, eq(projects.id, ct.projectId))
    .leftJoin(profiles, eq(profiles.id, ct.authorizedBy))
    .where(eq(ct.orgId, orgId))
    .orderBy(desc(ct.createdAt))
    .limit(limit)
}

// ---------------------------------------------------------------------------
// Staff: program-wide views
// ---------------------------------------------------------------------------
export type OrgCreditSummary = {
  id: string
  name: string
  orgType: string | null
  available: number
  granted: number
  committed: number
  memberCount: number
}

export async function listOrgCreditSummaries(): Promise<OrgCreditSummary[]> {
  const db = getDb()
  return db
    .select({
      id: organizations.id,
      name: organizations.name,
      orgType: organizations.orgType,
      available: sql<number>`coalesce(sum(${ct.delta}), 0)::int`,
      granted: sql<number>`coalesce(sum(${ct.delta}) filter (where ${ct.kind} = 'grant'), 0)::int`,
      committed: sql<number>`coalesce(-sum(${ct.delta}) filter (where ${ct.kind} in ('spend', 'transfer_out')), 0)::int`,
      memberCount: sql<number>`(select count(*)::int from ${organizationMembers} m where m.org_id = ${organizations.id})`,
    })
    .from(organizations)
    .leftJoin(ct, eq(ct.orgId, organizations.id))
    .groupBy(organizations.id)
    .orderBy(organizations.name)
}

export type ProgramTotals = {
  orgCount: number
  granted: number
  available: number
  committed: number
}

export async function getProgramTotals(): Promise<ProgramTotals> {
  const db = getDb()
  const [orgRow] = await db.select({ n: sql<number>`count(*)::int` }).from(organizations)
  const [row] = await db
    .select({
      granted: sql<number>`coalesce(sum(${ct.delta}) filter (where ${ct.kind} = 'grant'), 0)::int`,
      available: sql<number>`coalesce(sum(${ct.delta}), 0)::int`,
      committed: sql<number>`coalesce(-sum(${ct.delta}) filter (where ${ct.kind} in ('spend', 'transfer_out')), 0)::int`,
    })
    .from(ct)
  return {
    orgCount: orgRow?.n ?? 0,
    granted: row?.granted ?? 0,
    available: row?.available ?? 0,
    committed: row?.committed ?? 0,
  }
}

// ---------------------------------------------------------------------------
// Org membership / hierarchy
// ---------------------------------------------------------------------------
export type OrgMembership = {
  orgId: string
  name: string
  roleInOrg: 'admin' | 'member'
  orgType: string | null
  location: string | null
  industry: string | null
  size: string | null
}

export async function getOrgsForUser(userId: string): Promise<OrgMembership[]> {
  const db = getDb()
  return db
    .select({
      orgId: organizations.id,
      name: organizations.name,
      roleInOrg: organizationMembers.roleInOrg,
      orgType: organizations.orgType,
      location: organizations.location,
      industry: organizations.industry,
      size: organizations.size,
    })
    .from(organizationMembers)
    .innerJoin(organizations, eq(organizations.id, organizationMembers.orgId))
    .where(eq(organizationMembers.userId, userId))
    .orderBy(organizations.name)
}

// The org_member's main organization (first by name). Most members belong to
// one; a switcher can come later if that changes.
export async function getPrimaryOrgForUser(userId: string): Promise<OrgMembership | null> {
  const [first] = await getOrgsForUser(userId)
  return first ?? null
}

// An organization addressed by id, shaped as an OrgMembership. Used when a
// hub_staff developer is "acting as" a member of that org — roleInOrg lets the
// persona be an admin or a plain member, so both experiences are testable.
export async function getOrgContext(
  orgId: string,
  roleInOrg: OrgRole = 'admin',
): Promise<OrgMembership | null> {
  const db = getDb()
  const [org] = await db
    .select({
      orgId: organizations.id,
      name: organizations.name,
      orgType: organizations.orgType,
      location: organizations.location,
      industry: organizations.industry,
      size: organizations.size,
    })
    .from(organizations)
    .where(eq(organizations.id, orgId))
    .limit(1)
  if (!org) return null
  return { ...org, roleInOrg }
}

// The organization the current viewer should see: the "act as" org for a staff
// developer, otherwise the user's own primary org. While a staff dev is
// impersonating a persona WITHOUT an org context, they see no org — the real
// account's own membership must not leak into every persona.
export async function resolveViewerOrg(userId: string): Promise<OrgMembership | null> {
  const actAs = await getActAs()
  if (actAs) return actAs.orgId ? getOrgContext(actAs.orgId, actAs.orgRole) : null
  return getPrimaryOrgForUser(userId)
}

export async function isOrgAdmin(userId: string, orgId: string): Promise<boolean> {
  const db = getDb()
  const [m] = await db
    .select({ role: organizationMembers.roleInOrg })
    .from(organizationMembers)
    .where(and(eq(organizationMembers.userId, userId), eq(organizationMembers.orgId, orgId)))
    .limit(1)
  return m?.role === 'admin'
}

// Act-as-aware authorization: may the current viewer administer this org?
// Keys off EFFECTIVE identity so the persona is faithful:
//   • effective hub_staff (real staff not impersonating a lesser role, incl.
//     "act as staff") → true, so the staff console can manage any org;
//   • otherwise the viewer's RESOLVED org (the "act as" org for a staff dev,
//     else their own) must be this org, as admin.
// A staff dev acting as a plain member is therefore denied admin actions — that
// is the point: under "act as", capability matches the persona, not the real
// account. Staff regain full power by exiting "act as".
export async function viewerCanAdminOrg(orgId: string): Promise<boolean> {
  const profile = await getProfile()
  if (!profile) return false
  if (profile.role === 'hub_staff') return true
  const org = await resolveViewerOrg(profile.id)
  return !!org && org.orgId === orgId && org.roleInOrg === 'admin'
}

export type OrgMemberRow = {
  membershipId: string
  userId: string
  roleInOrg: 'admin' | 'member'
  fullName: string | null
  email: string | null
}

export async function getOrgMembers(orgId: string): Promise<OrgMemberRow[]> {
  const db = getDb()
  return db
    .select({
      membershipId: organizationMembers.id,
      userId: organizationMembers.userId,
      roleInOrg: organizationMembers.roleInOrg,
      fullName: profiles.fullName,
      email: profiles.email,
    })
    .from(organizationMembers)
    .leftJoin(profiles, eq(profiles.id, organizationMembers.userId))
    .where(eq(organizationMembers.orgId, orgId))
    .orderBy(organizationMembers.roleInOrg) // 'admin' before 'member'
}

// ---------------------------------------------------------------------------
// Org projects (with credits committed to each)
// ---------------------------------------------------------------------------
export type OrgProjectRow = {
  id: string
  title: string
  status: ProjectStatus
  creditsSpent: number
}

export async function getOrgProjects(orgId: string): Promise<OrgProjectRow[]> {
  const db = getDb()
  return db
    .select({
      id: projects.id,
      title: projects.title,
      status: sql<ProjectStatus>`${projects.status}`,
      creditsSpent: sql<number>`coalesce(-sum(${ct.delta}) filter (where ${ct.kind} = 'spend'), 0)::int`,
    })
    .from(projects)
    .leftJoin(ct, eq(ct.projectId, projects.id))
    .where(eq(projects.organizationId, orgId))
    .groupBy(projects.id)
    .orderBy(desc(projects.createdAt))
}

export async function getProjectCreditsSpent(projectId: string): Promise<number> {
  const db = getDb()
  const [row] = await db
    .select({
      spent: sql<number>`coalesce(-sum(${ct.delta}) filter (where ${ct.kind} = 'spend'), 0)::int`,
    })
    .from(ct)
    .where(eq(ct.projectId, projectId))
  return row?.spent ?? 0
}

// Every organization as { id, name } — used by the staff "act as" picker.
export async function listAllOrgs(): Promise<{ id: string; name: string }[]> {
  const db = getDb()
  return db
    .select({ id: organizations.id, name: organizations.name })
    .from(organizations)
    .orderBy(organizations.name)
}

// Other organizations a transfer can target (everything but the sender).
export async function listOtherOrgs(excludeOrgId: string): Promise<{ id: string; name: string }[]> {
  const db = getDb()
  return db
    .select({ id: organizations.id, name: organizations.name })
    .from(organizations)
    .where(ne(organizations.id, excludeOrgId))
    .orderBy(organizations.name)
}

// ---------------------------------------------------------------------------
// Mutations — append-only ledger writes. Callers validate authz + balance.
// ---------------------------------------------------------------------------
export async function recordGrant(input: {
  orgId: string
  amount: number
  note?: string | null
  authorizedBy?: string | null
}): Promise<void> {
  await getDb().insert(ct).values({
    orgId: input.orgId,
    kind: 'grant',
    delta: input.amount,
    note: input.note ?? null,
    authorizedBy: input.authorizedBy ?? null,
  })
}

// Credits bought (one-time top-up or a subscription invoice). Called from the
// payments service after Stripe confirms payment.
export async function recordPurchase(input: {
  orgId: string
  amount: number
  note?: string | null
  authorizedBy?: string | null
}): Promise<void> {
  await getDb().insert(ct).values({
    orgId: input.orgId,
    kind: 'purchase',
    delta: input.amount,
    note: input.note ?? null,
    authorizedBy: input.authorizedBy ?? null,
  })
}

export async function recordSpend(input: {
  orgId: string
  projectId?: string | null
  amount: number
  engagementType?: string | null
  note?: string | null
  authorizedBy?: string | null
}): Promise<void> {
  await getDb()
    .insert(ct)
    .values({
      orgId: input.orgId,
      projectId: input.projectId ?? null,
      kind: 'spend',
      delta: -input.amount,
      engagementType: input.engagementType ?? null,
      note: input.note ?? null,
      authorizedBy: input.authorizedBy ?? null,
    })
}

export async function recordReclaim(input: {
  orgId: string
  amount: number
  note?: string | null
  authorizedBy?: string | null
}): Promise<void> {
  await getDb().insert(ct).values({
    orgId: input.orgId,
    kind: 'reclaim',
    delta: input.amount,
    note: input.note ?? null,
    authorizedBy: input.authorizedBy ?? null,
  })
}

// A transfer writes one row on each side so both orgs' balances derive from
// their own ledger. Wrapped in a transaction so it's all-or-nothing.
export async function recordTransfer(input: {
  fromOrgId: string
  toOrgId: string
  amount: number
  engagementType?: string | null
  note?: string | null
  authorizedBy?: string | null
}): Promise<void> {
  const db = getDb()
  await db.transaction(async (tx) => {
    await tx.insert(ct).values({
      orgId: input.fromOrgId,
      counterpartyOrgId: input.toOrgId,
      kind: 'transfer_out',
      delta: -input.amount,
      engagementType: input.engagementType ?? null,
      note: input.note ?? null,
      authorizedBy: input.authorizedBy ?? null,
    })
    await tx.insert(ct).values({
      orgId: input.toOrgId,
      counterpartyOrgId: input.fromOrgId,
      kind: 'transfer_in',
      delta: input.amount,
      engagementType: input.engagementType ?? null,
      note: input.note ?? null,
      authorizedBy: input.authorizedBy ?? null,
    })
  })
}
