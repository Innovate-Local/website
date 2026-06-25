// Deliverables service — the concrete pieces of work on a project. Server-only
// (Drizzle). Pure status constants live in ./deliverable-status.
import { asc, eq } from 'drizzle-orm'
import { getDb } from '@/lib/db'
import { projectDeliverables, type ProjectDeliverable } from '@/lib/db/schema'
import type { DeliverableStatus } from './deliverable-status'

export { DELIVERABLE_STATUSES, DELIVERABLE_STATUS_LABEL } from './deliverable-status'
export type { DeliverableStatus } from './deliverable-status'

export async function listDeliverables(projectId: string): Promise<ProjectDeliverable[]> {
  const db = getDb()
  return db
    .select()
    .from(projectDeliverables)
    .where(eq(projectDeliverables.projectId, projectId))
    .orderBy(asc(projectDeliverables.position), asc(projectDeliverables.createdAt))
}

export async function createDeliverable(input: {
  projectId: string
  title: string
  description?: string | null
  dueDate?: string | null
}): Promise<void> {
  await getDb().insert(projectDeliverables).values({
    projectId: input.projectId,
    title: input.title,
    description: input.description ?? null,
    dueDate: input.dueDate ?? null,
  })
}

export async function setDeliverableStatus(id: string, status: DeliverableStatus): Promise<void> {
  await getDb().update(projectDeliverables).set({ status }).where(eq(projectDeliverables.id, id))
}

export async function deleteDeliverable(id: string): Promise<void> {
  await getDb().delete(projectDeliverables).where(eq(projectDeliverables.id, id))
}

// The project a deliverable belongs to — for authorization + revalidation.
export async function getDeliverableProjectId(id: string): Promise<string | null> {
  const db = getDb()
  const [row] = await db
    .select({ projectId: projectDeliverables.projectId })
    .from(projectDeliverables)
    .where(eq(projectDeliverables.id, id))
    .limit(1)
  return row?.projectId ?? null
}
