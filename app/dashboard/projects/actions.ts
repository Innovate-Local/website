'use server'

import { revalidatePath } from 'next/cache'
import { and, eq } from 'drizzle-orm'
import { requireProfile, requireRole } from '@/lib/auth/session'
import { getDb } from '@/lib/db'
import { projects, projectAssignments, projectInterests } from '@/lib/db/schema'
import {
  PROJECT_STATUSES,
  getDefaultHubId,
  type ProjectStatus,
} from '@/lib/platform/projects'
import { getPrimaryOrgForUser, isOrgAdmin } from '@/lib/platform/credits'
import { parseTags } from '@/lib/platform/apprentice-fields'
import { PROJECT_LINK_FIELDS } from '@/lib/platform/project-fields'

export type ActionResult = { ok: true; id?: string } | { ok: false; error: string }

const PROJECT_ROLES = ['lead', 'member'] as const

function nullable(raw: FormDataEntryValue | null): string | null {
  return String(raw ?? '').trim() || null
}

function parseIntOrNull(raw: FormDataEntryValue | null): number | null {
  const s = String(raw ?? '').trim()
  if (!s) return null
  const n = Number(s)
  return Number.isInteger(n) && n >= 0 ? n : null
}

// The editable scoping fields shared by create + update.
function parseProjectFields(formData: FormData) {
  const links: Record<string, string> = {}
  for (const { key } of PROJECT_LINK_FIELDS) {
    const v = nullable(formData.get(`link_${key}`))
    if (v) links[key] = v
  }
  return {
    summary: nullable(formData.get('summary')),
    description: nullable(formData.get('description')),
    problemStatement: nullable(formData.get('problemStatement')),
    skillsNeeded: parseTags(String(formData.get('skillsNeeded') ?? '')),
    startDate: nullable(formData.get('startDate')),
    dueDate: nullable(formData.get('dueDate')),
    estimatedCredits: parseIntOrNull(formData.get('estimatedCredits')),
    links,
  }
}

// Staff-only: create a project (starts in 'intake').
export async function createProject(formData: FormData): Promise<ActionResult> {
  const me = await requireRole('hub_staff')

  const title = String(formData.get('title') ?? '').trim()
  if (!title) return { ok: false, error: 'A project title is required.' }

  const organizationId = nullable(formData.get('organizationId'))
  const hubId = await getDefaultHubId()

  const db = getDb()
  const [proj] = await db
    .insert(projects)
    .values({ title, organizationId, hubId, createdBy: me.id, ...parseProjectFields(formData) })
    .returning({ id: projects.id })

  revalidatePath('/dashboard/projects')
  return { ok: true, id: proj.id }
}

// Org admin (or staff): create a project for the acting user's own organization
// (starts in 'intake'). The org is server-derived — never taken from the form.
export async function createOrgProject(formData: FormData): Promise<ActionResult> {
  const me = await requireProfile()
  const org = await getPrimaryOrgForUser(me.id)
  if (!org) return { ok: false, error: 'You’re not part of an organization yet.' }
  const allowed = me.role === 'hub_staff' || (await isOrgAdmin(me.id, org.orgId))
  if (!allowed) return { ok: false, error: 'Only organization admins can create projects.' }

  const title = String(formData.get('title') ?? '').trim()
  if (!title) return { ok: false, error: 'A project title is required.' }

  const db = getDb()
  const hubId = await getDefaultHubId()
  const [proj] = await db
    .insert(projects)
    .values({ organizationId: org.orgId, title, hubId, createdBy: me.id, ...parseProjectFields(formData) })
    .returning({ id: projects.id })

  revalidatePath('/dashboard/organization')
  revalidatePath('/dashboard/projects')
  return { ok: true, id: proj.id }
}

// Staff-only: edit a project's scoping detail.
export async function updateProject(projectId: string, formData: FormData): Promise<ActionResult> {
  await requireRole('hub_staff')

  const title = String(formData.get('title') ?? '').trim()
  if (!title) return { ok: false, error: 'A project title is required.' }

  const db = getDb()
  await db
    .update(projects)
    .set({
      title,
      organizationId: nullable(formData.get('organizationId')),
      ...parseProjectFields(formData),
    })
    .where(eq(projects.id, projectId))

  revalidatePath(`/dashboard/projects/${projectId}`)
  revalidatePath('/dashboard/projects')
  return { ok: true }
}

// Staff-only: move a project to a different status.
export async function setProjectStatus(projectId: string, status: ProjectStatus): Promise<ActionResult> {
  await requireRole('hub_staff')
  if (!(PROJECT_STATUSES as readonly string[]).includes(status)) {
    return { ok: false, error: 'Unknown status.' }
  }

  const db = getDb()
  await db.update(projects).set({ status }).where(eq(projects.id, projectId))
  revalidatePath(`/dashboard/projects/${projectId}`)
  revalidatePath('/dashboard/projects')
  return { ok: true }
}

// Staff-only: add an apprentice to the team (or update their role if already on
// it).
export async function assignApprentice(projectId: string, formData: FormData): Promise<ActionResult> {
  await requireRole('hub_staff')

  const userId = String(formData.get('userId') ?? '').trim()
  if (!userId) return { ok: false, error: 'Select an apprentice to add.' }

  const rawRole = String(formData.get('roleOnProject') ?? 'member')
  const roleOnProject = (PROJECT_ROLES as readonly string[]).includes(rawRole)
    ? (rawRole as (typeof PROJECT_ROLES)[number])
    : 'member'

  const db = getDb()
  const existing = await db
    .select({ id: projectAssignments.id })
    .from(projectAssignments)
    .where(and(eq(projectAssignments.projectId, projectId), eq(projectAssignments.userId, userId)))
    .limit(1)

  if (existing[0]) {
    await db
      .update(projectAssignments)
      .set({ roleOnProject, status: 'active' })
      .where(eq(projectAssignments.id, existing[0].id))
  } else {
    await db.insert(projectAssignments).values({ projectId, userId, roleOnProject })
  }

  revalidatePath(`/dashboard/projects/${projectId}`)
  return { ok: true }
}

// Staff-only: remove someone from the team, capturing why. Soft-remove (keep the
// row, mark it 'removed' with the reason) so the decision is on the record and
// the person can be re-added later.
export async function removeAssignment(
  assignmentId: string,
  projectId: string,
  reason: string,
): Promise<ActionResult> {
  await requireRole('hub_staff')

  const trimmed = reason.trim()
  if (!trimmed) return { ok: false, error: 'A reason for removing them is required.' }

  const db = getDb()
  await db
    .update(projectAssignments)
    .set({ status: 'removed', removalReason: trimmed })
    .where(eq(projectAssignments.id, assignmentId))
  revalidatePath(`/dashboard/projects/${projectId}`)
  return { ok: true }
}

// Staff-only: add an interested apprentice to the team and mark their interest
// accepted (re-activates a prior soft-removed assignment if one exists).
export async function addInterestedToTeam(projectId: string, userId: string): Promise<ActionResult> {
  await requireRole('hub_staff')
  if (!userId) return { ok: false, error: 'Missing apprentice.' }

  const db = getDb()
  const existing = await db
    .select({ id: projectAssignments.id })
    .from(projectAssignments)
    .where(and(eq(projectAssignments.projectId, projectId), eq(projectAssignments.userId, userId)))
    .limit(1)

  if (existing[0]) {
    await db
      .update(projectAssignments)
      .set({ status: 'active', removalReason: null })
      .where(eq(projectAssignments.id, existing[0].id))
  } else {
    await db.insert(projectAssignments).values({ projectId, userId, roleOnProject: 'member' })
  }

  await db
    .update(projectInterests)
    .set({ status: 'accepted' })
    .where(and(eq(projectInterests.projectId, projectId), eq(projectInterests.userId, userId)))

  revalidatePath(`/dashboard/projects/${projectId}`)
  revalidatePath('/dashboard/opportunities')
  return { ok: true }
}

// Staff-only: pass on an apprentice's interest (without adding them).
export async function declineInterest(projectId: string, userId: string): Promise<ActionResult> {
  await requireRole('hub_staff')

  const db = getDb()
  await db
    .update(projectInterests)
    .set({ status: 'declined' })
    .where(and(eq(projectInterests.projectId, projectId), eq(projectInterests.userId, userId)))
  revalidatePath(`/dashboard/projects/${projectId}`)
  revalidatePath('/dashboard/opportunities')
  return { ok: true }
}
