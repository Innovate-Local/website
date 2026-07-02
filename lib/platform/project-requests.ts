// Project requests service — org members propose work, staff convert to a real
// project or decline. Server-only (Drizzle).
import { and, desc, eq, sql } from 'drizzle-orm'
import { getDb } from '@/lib/db'
import { projectRequests, projects, projectDiscoveries, organizations, profiles, type ProjectRequest } from '@/lib/db/schema'
import { getDefaultHubId } from './projects'
import type { RequestStatus } from './request-status'
import type { ProjectDraft } from '@/lib/matchcore/types'

export { REQUEST_STATUSES, REQUEST_STATUS_LABEL } from './request-status'
export type { RequestStatus } from './request-status'

export type RequestRow = {
  id: string
  title: string
  summary: string | null
  problemStatement: string | null
  description: string | null
  skillsNeeded: string[]
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
      description: projectRequests.description,
      skillsNeeded: projectRequests.skillsNeeded,
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
      description: projectRequests.description,
      skillsNeeded: projectRequests.skillsNeeded,
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

// --- Org "Describe with MatchCore" draft lifecycle ---------------------------
// A request built via the Scout chat starts in 'drafting' (hidden from the staff
// open-queue), gets AI-filled, and is flipped to 'open' when the org submits.

export async function createDraftingRequest(orgId: string, submittedBy: string): Promise<string> {
  const [row] = await getDb()
    .insert(projectRequests)
    .values({ orgId, submittedBy, title: 'Untitled project', status: 'drafting' })
    .returning({ id: projectRequests.id })
  return row.id
}

export async function getDraftingRequestForOrg(orgId: string): Promise<string | null> {
  const [row] = await getDb()
    .select({ id: projectRequests.id })
    .from(projectRequests)
    .where(and(eq(projectRequests.orgId, orgId), eq(projectRequests.status, 'drafting')))
    .orderBy(desc(projectRequests.createdAt))
    .limit(1)
  return row?.id ?? null
}

export async function getRequestById(id: string): Promise<ProjectRequest | null> {
  const [row] = await getDb().select().from(projectRequests).where(eq(projectRequests.id, id)).limit(1)
  return row ?? null
}

// Write the AI draft onto the request (title/summary/problem/description/skills).
export async function applyDraftToRequest(requestId: string, draft: ProjectDraft): Promise<void> {
  await getDb()
    .update(projectRequests)
    .set({
      title: draft.title || 'Untitled project',
      summary: draft.summary || null,
      problemStatement: draft.problemStatement || null,
      description: draft.description || null,
      skillsNeeded: draft.skillsNeeded ?? [],
    })
    .where(eq(projectRequests.id, requestId))
}

// Manual edits to a draft request (the "or type it yourself" path).
export async function updateDraftFields(
  requestId: string,
  input: { title: string; summary: string | null; problemStatement: string | null; description: string | null; skillsNeeded: string[] },
): Promise<void> {
  await getDb()
    .update(projectRequests)
    .set({
      title: input.title,
      summary: input.summary,
      problemStatement: input.problemStatement,
      description: input.description,
      skillsNeeded: input.skillsNeeded,
    })
    .where(and(eq(projectRequests.id, requestId), eq(projectRequests.status, 'drafting')))
}

// Submit a drafting request to the hub (drafting → open).
export async function submitRequest(requestId: string): Promise<boolean> {
  const updated = await getDb()
    .update(projectRequests)
    .set({ status: 'open' })
    .where(and(eq(projectRequests.id, requestId), eq(projectRequests.status, 'drafting')))
    .returning({ id: projectRequests.id })
  return updated.length > 0
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
      // Carry the AI-drafted / manually-entered scoping fields into the project.
      description: req.description,
      skillsNeeded: req.skillsNeeded,
      hubId,
      createdBy: reviewedBy,
    })
    .returning({ id: projects.id })

  await db
    .update(projectRequests)
    .set({ status: 'converted', projectId: proj.id, reviewedBy })
    .where(eq(projectRequests.id, requestId))

  // Relink any discovery built against the request to the new project so the
  // matching engine can use it without redoing discovery.
  await db
    .update(projectDiscoveries)
    .set({ projectId: proj.id })
    .where(eq(projectDiscoveries.requestId, requestId))
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
