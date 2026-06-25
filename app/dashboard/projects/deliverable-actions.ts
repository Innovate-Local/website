'use server'

import { revalidatePath } from 'next/cache'
import { and, eq } from 'drizzle-orm'
import { requireProfile } from '@/lib/auth/session'
import { getDb } from '@/lib/db'
import { projectAssignments } from '@/lib/db/schema'
import {
  createDeliverable,
  deleteDeliverable,
  getDeliverableProjectId,
  setDeliverableStatus,
  DELIVERABLE_STATUSES,
  type DeliverableStatus,
} from '@/lib/platform/deliverables'

export type ActionResult = { ok: true } | { ok: false; error: string }

// Staff or an assigned apprentice (the people doing the work) manage deliverables.
async function canManage(projectId: string): Promise<boolean> {
  const me = await requireProfile()
  if (me.role === 'hub_staff') return true
  if (me.role !== 'apprentice') return false
  const db = getDb()
  const [a] = await db
    .select({ id: projectAssignments.id })
    .from(projectAssignments)
    .where(and(eq(projectAssignments.projectId, projectId), eq(projectAssignments.userId, me.id)))
    .limit(1)
  return !!a
}

export async function addDeliverable(projectId: string, formData: FormData): Promise<ActionResult> {
  if (!(await canManage(projectId))) return { ok: false, error: 'Not allowed.' }
  const title = String(formData.get('title') ?? '').trim()
  if (!title) return { ok: false, error: 'A title is required.' }

  await createDeliverable({
    projectId,
    title,
    description: String(formData.get('description') ?? '').trim() || null,
    dueDate: String(formData.get('dueDate') ?? '').trim() || null,
  })
  revalidatePath(`/dashboard/projects/${projectId}`)
  return { ok: true }
}

export async function changeDeliverableStatus(
  deliverableId: string,
  status: string,
): Promise<ActionResult> {
  const projectId = await getDeliverableProjectId(deliverableId)
  if (!projectId) return { ok: false, error: 'Deliverable not found.' }
  if (!(await canManage(projectId))) return { ok: false, error: 'Not allowed.' }
  if (!(DELIVERABLE_STATUSES as readonly string[]).includes(status)) {
    return { ok: false, error: 'Unknown status.' }
  }

  await setDeliverableStatus(deliverableId, status as DeliverableStatus)
  revalidatePath(`/dashboard/projects/${projectId}`)
  return { ok: true }
}

export async function removeDeliverable(deliverableId: string): Promise<ActionResult> {
  const projectId = await getDeliverableProjectId(deliverableId)
  if (!projectId) return { ok: false, error: 'Deliverable not found.' }
  if (!(await canManage(projectId))) return { ok: false, error: 'Not allowed.' }

  await deleteDeliverable(deliverableId)
  revalidatePath(`/dashboard/projects/${projectId}`)
  return { ok: true }
}
