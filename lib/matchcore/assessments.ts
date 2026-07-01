// Competency-assessment service (Phase A). Server-only (Drizzle). Persists the
// interview transcript, the scored CompetencyResult, and the staff approval
// gate. The AI/scoring specifics live in agents.ts + scoring.ts; this module is
// just storage + lifecycle.
import { and, desc, eq, ne } from 'drizzle-orm'
import { getDb } from '@/lib/db'
import { apprenticeAssessments, profiles, type ApprenticeAssessment } from '@/lib/db/schema'
import { activeCompetencyRubric } from './config'
import type { InterviewMessage } from './agents'
import type { CompetencyResult } from './types'

export type { ApprenticeAssessment } from '@/lib/db/schema'

// Typed views over the jsonb columns.
export function transcriptOf(a: ApprenticeAssessment): InterviewMessage[] {
  return (a.transcript as InterviewMessage[]) ?? []
}
export function resultOf(a: ApprenticeAssessment): CompetencyResult | null {
  const r = a.result as CompetencyResult
  return r && typeof r.crr === 'number' ? r : null
}

// The apprentice's latest non-archived assessment (their "current" profile).
export async function getCurrentAssessment(userId: string): Promise<ApprenticeAssessment | null> {
  const [row] = await getDb()
    .select()
    .from(apprenticeAssessments)
    .where(and(eq(apprenticeAssessments.userId, userId), ne(apprenticeAssessments.status, 'archived')))
    .orderBy(desc(apprenticeAssessments.createdAt))
    .limit(1)
  return row ?? null
}

export async function getAssessmentById(id: string): Promise<ApprenticeAssessment | null> {
  const [row] = await getDb().select().from(apprenticeAssessments).where(eq(apprenticeAssessments.id, id)).limit(1)
  return row ?? null
}

// Start a fresh interview, archiving any prior in-progress attempt so there's
// only ever one live draft per apprentice.
export async function startAssessment(userId: string): Promise<string> {
  const db = getDb()
  await db
    .update(apprenticeAssessments)
    .set({ status: 'archived' })
    .where(and(eq(apprenticeAssessments.userId, userId), eq(apprenticeAssessments.status, 'in_progress')))
  const [row] = await db
    .insert(apprenticeAssessments)
    .values({ userId, rubricVersion: activeCompetencyRubric().version, status: 'in_progress' })
    .returning({ id: apprenticeAssessments.id })
  return row.id
}

// Persist the running transcript after each turn (enables resume).
export async function saveTranscript(id: string, userId: string, messages: InterviewMessage[]): Promise<void> {
  await getDb()
    .update(apprenticeAssessments)
    .set({ transcript: messages })
    .where(and(eq(apprenticeAssessments.id, id), eq(apprenticeAssessments.userId, userId)))
}

// Persist a scored result. Denormalizes crr / tier / section points for matching.
export async function saveScore(
  id: string,
  userId: string,
  result: CompetencyResult,
  transcript: InterviewMessage[],
): Promise<void> {
  await getDb()
    .update(apprenticeAssessments)
    .set({
      status: 'scored',
      source: 'ai_interview',
      transcript,
      result,
      signals: result,
      crr: result.crr,
      crrTier: result.crrTier,
      sectionPoints: result.sectionPoints,
      summary: result.summary,
      scoredAt: new Date(),
    })
    .where(and(eq(apprenticeAssessments.id, id), eq(apprenticeAssessments.userId, userId)))
}

// Staff: approve a scored assessment (the gate before it counts for matching).
export async function approveAssessment(id: string, approverId: string): Promise<boolean> {
  const updated = await getDb()
    .update(apprenticeAssessments)
    .set({ status: 'approved', approvedBy: approverId, approvedAt: new Date() })
    .where(and(eq(apprenticeAssessments.id, id), eq(apprenticeAssessments.status, 'scored')))
    .returning({ id: apprenticeAssessments.id })
  return updated.length > 0
}

// Staff overview: every apprentice's current assessment state.
export type AssessmentOverviewRow = {
  userId: string
  name: string | null
  email: string | null
  assessmentId: string | null
  status: ApprenticeAssessment['status'] | null
  crr: number | null
  crrTier: string | null
}

export async function listAssessmentsForStaff(): Promise<AssessmentOverviewRow[]> {
  const db = getDb()
  // Latest non-archived assessment per apprentice, joined to the roster.
  const rows = await db
    .select({
      userId: profiles.id,
      name: profiles.fullName,
      email: profiles.email,
      assessmentId: apprenticeAssessments.id,
      status: apprenticeAssessments.status,
      crr: apprenticeAssessments.crr,
      crrTier: apprenticeAssessments.crrTier,
      createdAt: apprenticeAssessments.createdAt,
    })
    .from(profiles)
    .leftJoin(
      apprenticeAssessments,
      and(eq(apprenticeAssessments.userId, profiles.id), ne(apprenticeAssessments.status, 'archived')),
    )
    .where(eq(profiles.role, 'apprentice'))
    .orderBy(profiles.fullName, desc(apprenticeAssessments.createdAt))

  // Collapse to one row per apprentice (the newest assessment wins).
  const seen = new Set<string>()
  const out: AssessmentOverviewRow[] = []
  for (const r of rows) {
    if (seen.has(r.userId)) continue
    seen.add(r.userId)
    out.push({
      userId: r.userId,
      name: r.name,
      email: r.email,
      assessmentId: r.assessmentId,
      status: r.status,
      crr: r.crr,
      crrTier: r.crrTier,
    })
  }
  return out
}
