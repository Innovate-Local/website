'use server'

import { revalidatePath } from 'next/cache'
import { requireProfile, requireRole } from '@/lib/auth/session'
import { getPrimaryOrgForUser } from '@/lib/platform/credits'
import {
  createRequest,
  convertRequest,
  declineRequest,
} from '@/lib/platform/project-requests'

export type ActionResult = { ok: true; id?: string } | { ok: false; error: string }

function revalidate() {
  revalidatePath('/dashboard/organization')
  revalidatePath('/dashboard/projects')
}

// Org member: submit a project request for their organization (staff review it).
export async function submitProjectRequest(formData: FormData): Promise<ActionResult> {
  const me = await requireProfile()
  const org = await getPrimaryOrgForUser(me.id)
  if (!org) return { ok: false, error: 'You’re not part of an organization yet.' }

  const title = String(formData.get('title') ?? '').trim()
  if (!title) return { ok: false, error: 'A title is required.' }

  await createRequest({
    orgId: org.orgId,
    submittedBy: me.id,
    title,
    summary: String(formData.get('summary') ?? '').trim() || null,
    problemStatement: String(formData.get('problemStatement') ?? '').trim() || null,
  })
  revalidate()
  return { ok: true }
}

// Staff: convert an open request into a project.
export async function convertProjectRequest(requestId: string): Promise<ActionResult> {
  const me = await requireRole('hub_staff')
  const projectId = await convertRequest(requestId, me.id)
  if (!projectId) return { ok: false, error: 'This request has already been handled.' }
  revalidate()
  return { ok: true, id: projectId }
}

// Staff: decline an open request, with an optional reason.
export async function declineProjectRequest(requestId: string, reason: string): Promise<ActionResult> {
  const me = await requireRole('hub_staff')
  const ok = await declineRequest(requestId, me.id, reason.trim() || null)
  if (!ok) return { ok: false, error: 'This request has already been handled.' }
  revalidate()
  return { ok: true }
}
