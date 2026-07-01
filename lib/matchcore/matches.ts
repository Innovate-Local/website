// Matching service (Phase C). Server-only (Drizzle). Builds the candidate pool
// from approved competency assessments, runs the pure engine (matching.ts), and
// persists a match run. Approving a run writes the proposed team into the real
// project_assignments table — the bridge from "recommendation" to "staffed".
import { and, desc, eq, inArray, ne, sql } from 'drizzle-orm'
import { getDb } from '@/lib/db'
import {
  apprenticeAssessments,
  apprenticeProfiles,
  projectAssignments,
  projectMatches,
  profiles,
  type ProjectMatch,
} from '@/lib/db/schema'
import { runMatch } from './matching'
import type { MatchCandidate, MatchResult, ProjectType, RankedMatch, RecommendedTeam } from './types'

export type { ProjectMatch } from '@/lib/db/schema'

export function rankedOf(m: ProjectMatch): RankedMatch[] {
  return (m.ranked as RankedMatch[]) ?? []
}
export function teamOf(m: ProjectMatch): RecommendedTeam {
  return (m.team as RecommendedTeam) ?? { leadUserId: null, memberUserIds: [], complementarityScore: 0, coverageGaps: [], notes: [] }
}

// The matchable pool: each apprentice's newest scored/approved assessment, with
// live availability and active-project load. `approvedOnly` gates on the staff
// approval step (recommended for real matching).
export async function buildCandidatePool(approvedOnly = true): Promise<MatchCandidate[]> {
  const db = getDb()
  const statuses = approvedOnly ? (['approved'] as const) : (['approved', 'scored'] as const)

  const rows = await db
    .select({
      userId: apprenticeAssessments.userId,
      name: profiles.fullName,
      crr: apprenticeAssessments.crr,
      crrTier: apprenticeAssessments.crrTier,
      sectionPoints: apprenticeAssessments.sectionPoints,
      availability: apprenticeProfiles.availability,
      createdAt: apprenticeAssessments.createdAt,
      activeProjects: sql<number>`(
        select count(distinct pa.project_id)::int
        from project_assignments pa
        join projects pr on pr.id = pa.project_id
        where pa.user_id = ${apprenticeAssessments.userId}
          and pa.status = 'active' and pr.status = 'active'
      )`,
    })
    .from(apprenticeAssessments)
    .leftJoin(profiles, eq(profiles.id, apprenticeAssessments.userId))
    .leftJoin(apprenticeProfiles, eq(apprenticeProfiles.userId, apprenticeAssessments.userId))
    .where(
      and(
        sql`${apprenticeAssessments.crr} is not null`,
        inArray(apprenticeAssessments.status, [...statuses]),
      ),
    )
    .orderBy(apprenticeAssessments.userId, desc(apprenticeAssessments.createdAt))

  // Newest assessment per apprentice wins.
  const seen = new Set<string>()
  const pool: MatchCandidate[] = []
  for (const r of rows) {
    if (seen.has(r.userId)) continue
    seen.add(r.userId)
    pool.push({
      userId: r.userId,
      name: r.name,
      crr: r.crr ?? 0,
      crrTier: r.crrTier ?? 'Beginner',
      sectionPoints: (r.sectionPoints as Record<string, number>) ?? {},
      availability: r.availability,
      activeProjects: r.activeProjects ?? 0,
    })
  }
  return pool
}

// Run the engine against a project's discovery result and save the run,
// superseding any prior 'proposed' run for the project.
export async function runAndSaveMatch(
  input: { projectId: string; complexity: string; projectType: ProjectType; pcs: number; generatedBy: string; approvedOnly?: boolean },
): Promise<{ match: MatchResult; id: string }> {
  const pool = await buildCandidatePool(input.approvedOnly ?? true)
  const match = runMatch({ complexity: input.complexity, projectType: input.projectType }, pool)

  const db = getDb()
  await db
    .update(projectMatches)
    .set({ status: 'superseded' })
    .where(and(eq(projectMatches.projectId, input.projectId), eq(projectMatches.status, 'proposed')))

  const [row] = await db
    .insert(projectMatches)
    .values({
      projectId: input.projectId,
      rubricVersion: match.rubricVersion,
      pcs: input.pcs,
      complexity: input.complexity,
      projectType: input.projectType,
      teamSize: match.teamSize,
      ranked: match.ranked,
      team: match.team,
      generatedBy: input.generatedBy,
    })
    .returning({ id: projectMatches.id })

  return { match, id: row.id }
}

export async function getLatestMatch(projectId: string): Promise<ProjectMatch | null> {
  const [row] = await getDb()
    .select()
    .from(projectMatches)
    .where(and(eq(projectMatches.projectId, projectId), ne(projectMatches.status, 'superseded')))
    .orderBy(desc(projectMatches.createdAt))
    .limit(1)
  return row ?? null
}

// Approve a proposed run: staff the project with the recommended team, then mark
// the run approved. Idempotent per member (updates an existing assignment).
export async function approveMatch(matchId: string, approverId: string): Promise<{ ok: boolean; projectId?: string }> {
  const db = getDb()
  const [m] = await db.select().from(projectMatches).where(eq(projectMatches.id, matchId)).limit(1)
  if (!m || m.status !== 'proposed') return { ok: false }

  const team = teamOf(m)
  const assignments: { userId: string; role: 'lead' | 'member' }[] = []
  if (team.leadUserId) assignments.push({ userId: team.leadUserId, role: 'lead' })
  for (const uid of team.memberUserIds) assignments.push({ userId: uid, role: 'member' })

  for (const a of assignments) {
    const [existing] = await db
      .select({ id: projectAssignments.id })
      .from(projectAssignments)
      .where(and(eq(projectAssignments.projectId, m.projectId), eq(projectAssignments.userId, a.userId)))
      .limit(1)
    if (existing) {
      await db
        .update(projectAssignments)
        .set({ roleOnProject: a.role, status: 'active', removalReason: null })
        .where(eq(projectAssignments.id, existing.id))
    } else {
      await db.insert(projectAssignments).values({ projectId: m.projectId, userId: a.userId, roleOnProject: a.role })
    }
  }

  await db
    .update(projectMatches)
    .set({ status: 'approved', approvedBy: approverId, approvedAt: new Date() })
    .where(eq(projectMatches.id, matchId))

  return { ok: true, projectId: m.projectId }
}
