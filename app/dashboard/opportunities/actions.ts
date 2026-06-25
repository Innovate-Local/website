'use server'

import { revalidatePath } from 'next/cache'
import { and, eq, ne } from 'drizzle-orm'
import { requireRole } from '@/lib/auth/session'
import { getDb } from '@/lib/db'
import { projects, projectAssignments, projectInterests } from '@/lib/db/schema'

export type ActionResult = { ok: true } | { ok: false; error: string }

const OPEN_STATUSES = ['intake', 'scoping', 'active']

// Apprentice: raise (or re-raise) interest in joining an open project, with an
// optional note for the hub team. Idempotent on (project, user).
export async function expressInterest(projectId: string, formData: FormData): Promise<ActionResult> {
  const me = await requireRole('apprentice')
  if (!projectId) return { ok: false, error: 'Missing project.' }
  const message = String(formData.get('message') ?? '').trim() || null

  const db = getDb()
  const [proj] = await db
    .select({ status: projects.status })
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1)
  if (!proj) return { ok: false, error: 'Project not found.' }
  if (!OPEN_STATUSES.includes(proj.status)) return { ok: false, error: 'This project isn’t open to join.' }

  const [assigned] = await db
    .select({ id: projectAssignments.id })
    .from(projectAssignments)
    .where(
      and(
        eq(projectAssignments.projectId, projectId),
        eq(projectAssignments.userId, me.id),
        ne(projectAssignments.status, 'removed'),
      ),
    )
    .limit(1)
  if (assigned) return { ok: false, error: 'You’re already on this team.' }

  await db
    .insert(projectInterests)
    .values({ projectId, userId: me.id, message, status: 'interested' })
    .onConflictDoUpdate({
      target: [projectInterests.projectId, projectInterests.userId],
      set: { status: 'interested', message },
    })

  revalidatePath('/dashboard/opportunities')
  revalidatePath(`/dashboard/projects/${projectId}`)
  return { ok: true }
}

// Apprentice: withdraw their interest.
export async function withdrawInterest(projectId: string): Promise<ActionResult> {
  const me = await requireRole('apprentice')
  const db = getDb()
  await db
    .update(projectInterests)
    .set({ status: 'withdrawn' })
    .where(and(eq(projectInterests.projectId, projectId), eq(projectInterests.userId, me.id)))

  revalidatePath('/dashboard/opportunities')
  revalidatePath(`/dashboard/projects/${projectId}`)
  return { ok: true }
}
