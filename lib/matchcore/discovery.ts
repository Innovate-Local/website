// Discovery / complexity service (Phase B). Server-only (Drizzle). One or more
// discovery runs per project; persists the transcript, the scored
// ComplexityResult, and the staff approval gate.
import { and, desc, eq, ne } from 'drizzle-orm'
import { getDb } from '@/lib/db'
import { projectDiscoveries, type ProjectDiscovery } from '@/lib/db/schema'
import { activeComplexityRubric } from './config'
import type { InterviewMessage } from './agents'
import type { ComplexityResult } from './types'

export type { ProjectDiscovery } from '@/lib/db/schema'

export function transcriptOf(d: ProjectDiscovery): InterviewMessage[] {
  return (d.transcript as InterviewMessage[]) ?? []
}
export function resultOf(d: ProjectDiscovery): ComplexityResult | null {
  const r = d.result as ComplexityResult
  return r && typeof r.pcs === 'number' ? r : null
}

export async function getCurrentDiscovery(projectId: string): Promise<ProjectDiscovery | null> {
  const [row] = await getDb()
    .select()
    .from(projectDiscoveries)
    .where(and(eq(projectDiscoveries.projectId, projectId), ne(projectDiscoveries.status, 'archived')))
    .orderBy(desc(projectDiscoveries.createdAt))
    .limit(1)
  return row ?? null
}

export async function getDiscoveryById(id: string): Promise<ProjectDiscovery | null> {
  const [row] = await getDb().select().from(projectDiscoveries).where(eq(projectDiscoveries.id, id)).limit(1)
  return row ?? null
}

export async function startDiscovery(projectId: string): Promise<string> {
  const db = getDb()
  await db
    .update(projectDiscoveries)
    .set({ status: 'archived' })
    .where(and(eq(projectDiscoveries.projectId, projectId), eq(projectDiscoveries.status, 'in_progress')))
  const [row] = await db
    .insert(projectDiscoveries)
    .values({ projectId, rubricVersion: activeComplexityRubric().version, status: 'in_progress' })
    .returning({ id: projectDiscoveries.id })
  return row.id
}

// --- Request-linked discovery (org "Describe with MatchCore" flow) -----------
// Discovery runs against a project_request before any project exists; convert
// relinks it to the new project (see convertRequest).
export async function startRequestDiscovery(requestId: string): Promise<string> {
  const db = getDb()
  await db
    .update(projectDiscoveries)
    .set({ status: 'archived' })
    .where(and(eq(projectDiscoveries.requestId, requestId), eq(projectDiscoveries.status, 'in_progress')))
  const [row] = await db
    .insert(projectDiscoveries)
    .values({ requestId, rubricVersion: activeComplexityRubric().version, status: 'in_progress' })
    .returning({ id: projectDiscoveries.id })
  return row.id
}

export async function getRequestDiscovery(requestId: string): Promise<ProjectDiscovery | null> {
  const [row] = await getDb()
    .select()
    .from(projectDiscoveries)
    .where(and(eq(projectDiscoveries.requestId, requestId), ne(projectDiscoveries.status, 'archived')))
    .orderBy(desc(projectDiscoveries.createdAt))
    .limit(1)
  return row ?? null
}

export async function saveTranscript(id: string, messages: InterviewMessage[]): Promise<void> {
  await getDb().update(projectDiscoveries).set({ transcript: messages }).where(eq(projectDiscoveries.id, id))
}

export async function saveScore(id: string, result: ComplexityResult, transcript: InterviewMessage[]): Promise<void> {
  await getDb()
    .update(projectDiscoveries)
    .set({
      status: 'scored',
      source: 'ai_interview',
      transcript,
      result,
      signals: result,
      pcs: result.pcs,
      complexity: result.complexity,
      projectType: result.projectType,
      secondaryType: result.secondaryType,
      summary: result.summary,
      scoredAt: new Date(),
    })
    .where(eq(projectDiscoveries.id, id))
}

export async function approveDiscovery(id: string, approverId: string): Promise<boolean> {
  const updated = await getDb()
    .update(projectDiscoveries)
    .set({ status: 'approved', approvedBy: approverId, approvedAt: new Date() })
    .where(and(eq(projectDiscoveries.id, id), eq(projectDiscoveries.status, 'scored')))
    .returning({ id: projectDiscoveries.id })
  return updated.length > 0
}
