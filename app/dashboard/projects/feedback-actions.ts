'use server'

import { revalidatePath } from 'next/cache'
import { and, eq, inArray } from 'drizzle-orm'
import { requireProfile } from '@/lib/auth/session'
import { getDb } from '@/lib/db'
import {
  projects,
  projectAssignments,
  projectFeedback,
  organizationMembers,
} from '@/lib/db/schema'
import { isFeedbackOpen } from '@/lib/platform/feedback'
import type { ProjectStatus } from '@/lib/platform/project-status'

export type ActionResult = { ok: true } | { ok: false; error: string }

function parseRating(raw: FormDataEntryValue | null): number | null {
  const n = Number(String(raw ?? '').trim())
  return Number.isInteger(n) && n >= 1 && n <= 5 ? n : null
}

// Submit (or update) feedback on a completed project. Two flows:
//   • org member / staff rate an apprentice on the team
//   • apprentice (or staff) reflects on the organization
// Idempotent per (project, author, subject) — re-submitting edits the existing.
export async function submitFeedback(formData: FormData): Promise<ActionResult> {
  const me = await requireProfile()

  const projectId = String(formData.get('projectId') ?? '').trim()
  const subjectType = String(formData.get('subjectType') ?? '').trim()
  const rating = parseRating(formData.get('rating'))
  const comment = String(formData.get('comment') ?? '').trim() || null
  if (!projectId) return { ok: false, error: 'Missing project.' }
  if (!rating) return { ok: false, error: 'Choose a rating from 1 to 5.' }

  const db = getDb()
  const [proj] = await db
    .select({ status: projects.status, organizationId: projects.organizationId })
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1)
  if (!proj) return { ok: false, error: 'Project not found.' }
  if (!isFeedbackOpen(proj.status as ProjectStatus)) {
    return { ok: false, error: 'Feedback opens once the project is delivered.' }
  }

  let subjectUserId: string | null = null
  let subjectOrgId: string | null = null

  if (subjectType === 'apprentice') {
    // Only the employer (org members of this project's org) or staff rate the team.
    const allowed = me.role === 'hub_staff' || (me.role === 'org_member' && (await inOrg(me.id, proj.organizationId)))
    if (!allowed) return { ok: false, error: 'Not allowed.' }

    subjectUserId = String(formData.get('subjectUserId') ?? '').trim() || null
    if (!subjectUserId) return { ok: false, error: 'Missing apprentice.' }
    if (!(await onTeam(projectId, subjectUserId))) {
      return { ok: false, error: 'That apprentice isn’t on this team.' }
    }
  } else if (subjectType === 'organization') {
    // Only an apprentice who worked on it (or staff) reflects on the engagement.
    const allowed = me.role === 'hub_staff' || (me.role === 'apprentice' && (await onTeam(projectId, me.id)))
    if (!allowed) return { ok: false, error: 'Not allowed.' }
    if (!proj.organizationId) return { ok: false, error: 'This project has no organization to review.' }
    subjectOrgId = proj.organizationId
  } else {
    return { ok: false, error: 'Unknown feedback type.' }
  }

  // Upsert on (project, author, subject).
  const existing = await db
    .select({ id: projectFeedback.id })
    .from(projectFeedback)
    .where(
      and(
        eq(projectFeedback.projectId, projectId),
        eq(projectFeedback.authorId, me.id),
        eq(projectFeedback.subjectType, subjectType),
        subjectType === 'apprentice'
          ? eq(projectFeedback.subjectUserId, subjectUserId as string)
          : eq(projectFeedback.subjectOrgId, subjectOrgId as string),
      ),
    )
    .limit(1)

  if (existing[0]) {
    await db
      .update(projectFeedback)
      .set({ rating, comment, status: 'submitted' })
      .where(eq(projectFeedback.id, existing[0].id))
  } else {
    await db.insert(projectFeedback).values({
      projectId,
      authorId: me.id,
      authorRole: me.role,
      subjectType: subjectType as 'apprentice' | 'organization',
      subjectUserId,
      subjectOrgId,
      rating,
      comment,
    })
  }

  revalidatePath(`/dashboard/projects/${projectId}`)
  revalidatePath('/dashboard/portfolio')
  return { ok: true }
}

async function inOrg(userId: string, orgId: string | null): Promise<boolean> {
  if (!orgId) return false
  const db = getDb()
  const [m] = await db
    .select({ id: organizationMembers.id })
    .from(organizationMembers)
    .where(and(eq(organizationMembers.orgId, orgId), eq(organizationMembers.userId, userId)))
    .limit(1)
  return !!m
}

async function onTeam(projectId: string, userId: string): Promise<boolean> {
  const db = getDb()
  const [a] = await db
    .select({ id: projectAssignments.id })
    .from(projectAssignments)
    .where(
      and(
        eq(projectAssignments.projectId, projectId),
        eq(projectAssignments.userId, userId),
        inArray(projectAssignments.status, ['active', 'completed']),
      ),
    )
    .limit(1)
  return !!a
}
