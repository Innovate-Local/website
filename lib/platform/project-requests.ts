// Project requests service — org members propose work, staff convert to a real
// project or decline. Server-only (Drizzle).
import { and, desc, eq, sql } from 'drizzle-orm'
import { getDb } from '@/lib/db'
import { projectRequests, projects, organizations, profiles } from '@/lib/db/schema'
import { getDefaultHubId } from './projects'
import type { RequestStatus } from './request-status'

export { REQUEST_STATUSES, REQUEST_STATUS_LABEL } from './request-status'
export type { RequestStatus } from './request-status'

export type RequestRow = {
  id: string
  title: string
  summary: string | null
  problemStatement: string | null
  status: RequestStatus
  declineReason: string | null
  projectId: string | null
  submittedByName: string | null
  orgName: string | null
  createdAt: Date
}

export async function listOrgRequests(orgId: string): Promise<RequestRow[]> {
  const db = getDb()
  return db
    .select({
      id: projectRequests.id,
      title: projectRequests.title,
      summary: projectRequests.summary,
      problemStatement: projectRequests.problemStatement,
      status: sqlStatus(),
      declineReason: projectRequests.declineReason,
      projectId: projectRequests.projectId,
      submittedByName: profiles.fullName,
      orgName: organizations.name,
      createdAt: projectRequests.createdAt,
    })
    .from(projectRequests)
    .leftJoin(profiles, eq(profiles.id, projectRequests.submittedBy))
    .leftJoin(organizations, eq(organizations.id, projectRequests.orgId))
    .where(eq(projectRequests.orgId, orgId))
    .orderBy(desc(projectRequests.createdAt))
}

export async function listOpenRequests(): Promise<RequestRow[]> {
  const db = getDb()
  return db
    .select({
      id: projectRequests.id,
      title: projectRequests.title,
      summary: projectRequests.summary,
      problemStatement: projectRequests.problemStatement,
      status: sqlStatus(),
      declineReason: projectRequests.declineReason,
      projectId: projectRequests.projectId,
      submittedByName: profiles.fullName,
      orgName: organizations.name,
      createdAt: projectRequests.createdAt,
    })
    .from(projectRequests)
    .leftJoin(profiles, eq(profiles.id, projectRequests.submittedBy))
    .leftJoin(organizations, eq(organizations.id, projectRequests.orgId))
    .where(eq(projectRequests.status, 'open'))
    .orderBy(desc(projectRequests.createdAt))
}

export async function createRequest(input: {
  orgId: string
  submittedBy: string
  title: string
  summary?: string | null
  problemStatement?: string | null
}): Promise<void> {
  await getDb().insert(projectRequests).values({
    orgId: input.orgId,
    submittedBy: input.submittedBy,
    title: input.title,
    summary: input.summary ?? null,
    problemStatement: input.problemStatement ?? null,
  })
}

export async function getRequestOrgId(id: string): Promise<string | null> {
  const db = getDb()
  const [r] = await db
    .select({ orgId: projectRequests.orgId })
    .from(projectRequests)
    .where(eq(projectRequests.id, id))
    .limit(1)
  return r?.orgId ?? null
}

// Staff: turn an open request into a project (starts in 'intake'). Returns the
// new project id, or null if the request is missing / already handled.
export async function convertRequest(requestId: string, reviewedBy: string): Promise<string | null> {
  const db = getDb()
  const [req] = await db
    .select()
    .from(projectRequests)
    .where(eq(projectRequests.id, requestId))
    .limit(1)
  if (!req || req.status !== 'open') return null

  const hubId = await getDefaultHubId()
  const [proj] = await db
    .insert(projects)
    .values({
      organizationId: req.orgId,
      title: req.title,
      summary: req.summary,
      problemStatement: req.problemStatement,
      hubId,
      createdBy: reviewedBy,
    })
    .returning({ id: projects.id })

  await db
    .update(projectRequests)
    .set({ status: 'converted', projectId: proj.id, reviewedBy })
    .where(eq(projectRequests.id, requestId))
  return proj.id
}

export async function declineRequest(
  requestId: string,
  reviewedBy: string,
  reason: string | null,
): Promise<boolean> {
  const db = getDb()
  const updated = await db
    .update(projectRequests)
    .set({ status: 'declined', declineReason: reason, reviewedBy })
    .where(and(eq(projectRequests.id, requestId), eq(projectRequests.status, 'open')))
    .returning({ id: projectRequests.id })
  return updated.length > 0
}

// Small helper so the two list queries share the status cast.
function sqlStatus() {
  return sql<RequestStatus>`${projectRequests.status}`
}
