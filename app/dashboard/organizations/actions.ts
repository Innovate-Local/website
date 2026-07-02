'use server'

import { revalidatePath } from 'next/cache'
import { and, eq } from 'drizzle-orm'
import { requireProfile, requireRole } from '@/lib/auth/session'
import { getDb } from '@/lib/db'
import { organizations, organizationMembers, profiles } from '@/lib/db/schema'
import { viewerCanAdminOrg } from '@/lib/platform/credits'
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'

export type ActionResult = { ok: true; id?: string } | { ok: false; error: string }
export type AddMemberResult = { ok: true; invited: boolean } | { ok: false; error: string }

const ORG_TYPES = ['business', 'nonprofit', 'municipality', 'other'] as const
const ORG_ROLES = ['admin', 'member'] as const

// May the current user manage this org's people — effective hub staff (staff
// console), or an admin of the org itself. "Act as"-faithful via viewerCanAdminOrg:
// impersonating a plain member no longer grants management rights.
async function orgManager(orgId: string): Promise<{ id: string } | null> {
  const profile = await requireProfile()
  return (await viewerCanAdminOrg(orgId)) ? profile : null
}

// Count of admins on an org — used to prevent removing the last one (lockout).
async function adminCount(orgId: string): Promise<number> {
  const db = getDb()
  const rows = await db
    .select({ id: organizationMembers.id })
    .from(organizationMembers)
    .where(and(eq(organizationMembers.orgId, orgId), eq(organizationMembers.roleInOrg, 'admin')))
  return rows.length
}

// Staff-only: create an organization.
export async function createOrganization(formData: FormData): Promise<ActionResult> {
  await requireRole('hub_staff')

  const name = String(formData.get('name') ?? '').trim()
  if (!name) return { ok: false, error: 'Organization name is required.' }

  const rawType = String(formData.get('orgType') ?? '')
  const orgType = (ORG_TYPES as readonly string[]).includes(rawType)
    ? (rawType as (typeof ORG_TYPES)[number])
    : null

  const db = getDb()
  const [org] = await db
    .insert(organizations)
    .values({
      name,
      orgType,
      location: String(formData.get('location') ?? '').trim() || null,
      industry: String(formData.get('industry') ?? '').trim() || null,
      size: String(formData.get('size') ?? '').trim() || null,
    })
    .returning({ id: organizations.id })

  revalidatePath('/dashboard/organizations')
  return { ok: true, id: org.id }
}

// Staff or org admin: add a person to an organization by email. If they have no
// account yet, sends a Supabase invite email (they click through to sign in);
// existing accounts are linked silently. Either way they're promoted to
// org_member (unless already staff) and linked to the org.
export async function addOrgMember(orgId: string, formData: FormData): Promise<AddMemberResult> {
  if (!(await orgManager(orgId))) return { ok: false, error: 'Not allowed.' }

  const email = String(formData.get('email') ?? '').trim().toLowerCase()
  if (!email.includes('@')) return { ok: false, error: 'Enter a valid email address.' }

  const rawRole = String(formData.get('roleInOrg') ?? 'member')
  const roleInOrg = (ORG_ROLES as readonly string[]).includes(rawRole)
    ? (rawRole as (typeof ORG_ROLES)[number])
    : 'member'

  const db = getDb()

  // Find the account; invite (which creates it) if it doesn't exist. The signup
  // trigger makes the matching profile row on creation.
  let [profile] = await db.select().from(profiles).where(eq(profiles.email, email)).limit(1)
  let invited = false
  if (!profile) {
    const admin = getSupabaseAdmin()
    // No redirectTo: the Invite email template links straight to our app with a
    // token_hash (see docs/database-migrations.md → auth), which the callback
    // verifies. Invite also creates the auth user.
    const { error } = await admin.auth.admin.inviteUserByEmail(email)
    if (error) return { ok: false, error: `Could not send invite: ${error.message}` }
    invited = true
    ;[profile] = await db.select().from(profiles).where(eq(profiles.email, email)).limit(1)
    if (!profile) return { ok: false, error: 'Invite sent but profile not found — try again.' }
  }

  // Promote to org_member unless already staff (don't demote staff).
  if (profile.role !== 'hub_staff' && profile.role !== 'org_member') {
    await db.update(profiles).set({ role: 'org_member' }).where(eq(profiles.id, profile.id))
  }

  // Link to the org (idempotent on the unique org_id+user_id).
  const existing = await db
    .select({ id: organizationMembers.id })
    .from(organizationMembers)
    .where(and(eq(organizationMembers.orgId, orgId), eq(organizationMembers.userId, profile.id)))
    .limit(1)

  if (existing[0]) {
    await db
      .update(organizationMembers)
      .set({ roleInOrg })
      .where(eq(organizationMembers.id, existing[0].id))
  } else {
    await db.insert(organizationMembers).values({ orgId, userId: profile.id, roleInOrg })
  }

  revalidatePath(`/dashboard/organizations/${orgId}`)
  revalidatePath('/dashboard/organization')
  return { ok: true, invited }
}

// Staff or org admin: change a member's in-org role. Guards against demoting the
// last admin (which would lock the org out of managing itself).
export async function setMemberRole(
  orgId: string,
  membershipId: string,
  role: string,
): Promise<ActionResult> {
  if (!(await orgManager(orgId))) return { ok: false, error: 'Not allowed.' }
  const roleInOrg = (ORG_ROLES as readonly string[]).includes(role)
    ? (role as (typeof ORG_ROLES)[number])
    : null
  if (!roleInOrg) return { ok: false, error: 'Invalid role.' }

  const db = getDb()
  const [member] = await db
    .select({ role: organizationMembers.roleInOrg })
    .from(organizationMembers)
    .where(and(eq(organizationMembers.id, membershipId), eq(organizationMembers.orgId, orgId)))
    .limit(1)
  if (!member) return { ok: false, error: 'Member not found.' }

  if (member.role === 'admin' && roleInOrg === 'member' && (await adminCount(orgId)) <= 1) {
    return { ok: false, error: 'An organization needs at least one admin.' }
  }

  await db.update(organizationMembers).set({ roleInOrg }).where(eq(organizationMembers.id, membershipId))
  revalidatePath(`/dashboard/organizations/${orgId}`)
  revalidatePath('/dashboard/organization')
  return { ok: true }
}

// Staff or org admin: remove a member from the organization (the account and its
// profile are untouched — only the membership link is dropped).
export async function removeMember(orgId: string, membershipId: string): Promise<ActionResult> {
  if (!(await orgManager(orgId))) return { ok: false, error: 'Not allowed.' }

  const db = getDb()
  const [member] = await db
    .select({ role: organizationMembers.roleInOrg })
    .from(organizationMembers)
    .where(and(eq(organizationMembers.id, membershipId), eq(organizationMembers.orgId, orgId)))
    .limit(1)
  if (!member) return { ok: false, error: 'Member not found.' }

  if (member.role === 'admin' && (await adminCount(orgId)) <= 1) {
    return { ok: false, error: 'Remove the last admin by promoting another member first.' }
  }

  await db.delete(organizationMembers).where(eq(organizationMembers.id, membershipId))
  revalidatePath(`/dashboard/organizations/${orgId}`)
  revalidatePath('/dashboard/organization')
  return { ok: true }
}
