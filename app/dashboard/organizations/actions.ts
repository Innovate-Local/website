'use server'

import { revalidatePath } from 'next/cache'
import { and, eq } from 'drizzle-orm'
import { requireRole } from '@/lib/auth/session'
import { getDb } from '@/lib/db'
import { organizations, organizationMembers, profiles } from '@/lib/db/schema'
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'

export type ActionResult = { ok: true; id?: string } | { ok: false; error: string }

const ORG_TYPES = ['business', 'nonprofit', 'municipality', 'other'] as const
const ORG_ROLES = ['owner', 'member'] as const

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

// Staff-only: add a person to an organization by email. Creates the account if
// it doesn't exist yet (they can magic-link in later), promotes them to
// org_member unless they're already staff, and links them to the org.
export async function addOrgMember(orgId: string, formData: FormData): Promise<ActionResult> {
  await requireRole('hub_staff')

  const email = String(formData.get('email') ?? '').trim().toLowerCase()
  if (!email.includes('@')) return { ok: false, error: 'Enter a valid email address.' }

  const rawRole = String(formData.get('roleInOrg') ?? 'member')
  const roleInOrg = (ORG_ROLES as readonly string[]).includes(rawRole)
    ? (rawRole as (typeof ORG_ROLES)[number])
    : 'member'

  const db = getDb()

  // Find the account, creating it (service role) if needed — the signup trigger
  // makes the matching profile row.
  let [profile] = await db.select().from(profiles).where(eq(profiles.email, email)).limit(1)
  if (!profile) {
    const admin = getSupabaseAdmin()
    const { error } = await admin.auth.admin.createUser({ email, email_confirm: true })
    if (error) return { ok: false, error: `Could not create account: ${error.message}` }
    ;[profile] = await db.select().from(profiles).where(eq(profiles.email, email)).limit(1)
    if (!profile) return { ok: false, error: 'Account created but profile not found — try again.' }
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
  return { ok: true }
}
