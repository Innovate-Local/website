'use server'

import { revalidatePath } from 'next/cache'
import { and, eq } from 'drizzle-orm'
import { requireRole } from '@/lib/auth/session'
import { getDb } from '@/lib/db'
import { projects, projectAssignments } from '@/lib/db/schema'
import {
  PROJECT_STATUSES,
  getDefaultHubId,
  type ProjectStatus,
} from '@/lib/platform/projects'

export type ActionResult = { ok: true; id?: string } | { ok: false; error: string }

const PROJECT_ROLES = ['lead', 'member'] as const

// Staff-only: create a project (starts in 'intake').
export async function createProject(formData: FormData): Promise<ActionResult> {
  const me = await requireRole('hub_staff')

  const title = String(formData.get('title') ?? '').trim()
  if (!title) return { ok: false, error: 'A project title is required.' }

  const organizationId = String(formData.get('organizationId') ?? '').trim() || null
  const problemStatement = String(formData.get('problemStatement') ?? '').trim() || null
  const hubId = await getDefaultHubId()

  const db = getDb()
  const [proj] = await db
    .insert(projects)
    .values({ title, organizationId, problemStatement, hubId, createdBy: me.id })
    .returning({ id: projects.id })

  revalidatePath('/dashboard/projects')
  return { ok: true, id: proj.id }
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

// Staff-only: remove someone from the team.
export async function removeAssignment(assignmentId: string, projectId: string): Promise<ActionResult> {
  await requireRole('hub_staff')

  const db = getDb()
  await db.delete(projectAssignments).where(eq(projectAssignments.id, assignmentId))
  revalidatePath(`/dashboard/projects/${projectId}`)
  return { ok: true }
}
