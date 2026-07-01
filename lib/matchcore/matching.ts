// Matching engine (Phase C). PURE — no DB, no AI. Given a project's complexity
// + type and a pool of scored candidates, it filters for eligibility, computes
// each candidate's Skills Alignment Score (SAS) under the project-type weighting,
// ranks them, and assembles a complementary team. Deterministic by design: no
// model call, so a match run is reproducible and cheap. Match rationales are
// generated from templates here, not by an LLM.

import { activeCompetencyRubric, activeMatchingRubric, tierFor } from './config'
import type { MatchCandidate, MatchResult, MatchingRubric, ProjectType, RankedMatch, RecommendedTeam } from './types'

const round1 = (n: number) => Math.round(n * 10) / 10

// SAS = Σ(sectionPoints × weightForType) / 20 × 100. Section scores are out of
// 20 and weights sum to 1, so raw ∈ [0,20] and SAS ∈ [0,100].
function computeSas(candidate: MatchCandidate, projectType: ProjectType): number {
  const rubric = activeCompetencyRubric()
  let raw = 0
  for (const section of rubric.sections) {
    const pts = candidate.sectionPoints[section.key] ?? 0
    raw += pts * (section.weightByType[projectType] ?? 0)
  }
  return round1((raw / 20) * 100)
}

// The section label a candidate is strongest / second-strongest in.
function strengthProfile(candidate: MatchCandidate): { primary: string; secondary: string } {
  const rubric = activeCompetencyRubric()
  const ranked = [...rubric.sections]
    .map((s) => ({ label: s.label, pts: candidate.sectionPoints[s.key] ?? 0 }))
    .sort((a, b) => b.pts - a.pts)
  return { primary: ranked[0]?.label ?? '—', secondary: ranked[1]?.label ?? '—' }
}

function eligibility(
  candidate: MatchCandidate,
  rubric: MatchingRubric,
  memberMinCrr: number,
): { eligible: boolean; reason: string | null } {
  if (candidate.availability === 'unavailable') return { eligible: false, reason: 'Opted out / unavailable' }
  if (candidate.activeProjects >= rubric.maxActiveProjects)
    return { eligible: false, reason: `On ${candidate.activeProjects} active projects (max ${rubric.maxActiveProjects})` }
  if (candidate.crr < memberMinCrr)
    return { eligible: false, reason: `CRR ${candidate.crr} below floor of ${memberMinCrr}` }
  return { eligible: true, reason: null }
}

function rationaleFor(m: Omit<RankedMatch, 'rationale'>): string {
  if (!m.eligible) return m.ineligibleReason ?? 'Not eligible for this project.'
  return `${m.matchQuality} (SAS ${m.sas}). Strongest in ${m.strengthProfile}; ${m.crrTier} overall (CRR ${m.crr}).`
}

/**
 * Rank a candidate pool against a project and propose a team.
 * @param complexity a complexity tier key OR label (e.g. 'moderate' / 'Moderate')
 */
export function runMatch(
  input: { complexity: string; projectType: ProjectType },
  candidates: MatchCandidate[],
  rubric: MatchingRubric = activeMatchingRubric(),
): MatchResult {
  const complexityKey = input.complexity.trim().toLowerCase()
  const rule =
    rubric.teamRules.find((r) => r.complexity === complexityKey) ?? rubric.teamRules[0]

  // Score + classify every candidate.
  const ranked: RankedMatch[] = candidates
    .map((c) => {
      const sas = computeSas(c, input.projectType)
      const { primary, secondary } = strengthProfile(c)
      const elig = eligibility(c, rubric, rule.memberMinCrr)
      const base: Omit<RankedMatch, 'rationale'> = {
        userId: c.userId,
        name: c.name,
        crr: c.crr,
        crrTier: c.crrTier,
        sas,
        matchQuality: tierFor(rubric.sasTiers, sas).label,
        strengthProfile: primary,
        secondaryStrength: secondary,
        eligible: elig.eligible,
        ineligibleReason: elig.reason,
      }
      return { ...base, rationale: rationaleFor(base) }
    })
    // Eligible first, then by SAS desc.
    .sort((a, b) => Number(b.eligible) - Number(a.eligible) || b.sas - a.sas)

  const team = assembleTeam(ranked, candidates, rule, rubric)
  return { rubricVersion: rubric.version, teamSize: rule.teamSize, ranked, team }
}

function assembleTeam(
  ranked: RankedMatch[],
  candidates: MatchCandidate[],
  rule: { teamSize: number; leadMinCrr: number; memberMinCrr: number },
  rubric: MatchingRubric,
): RecommendedTeam {
  const notes: string[] = []
  const byId = new Map(candidates.map((c) => [c.userId, c]))
  const eligible = ranked.filter((r) => r.eligible)

  // Lead: highest-SAS eligible candidate meeting the lead CRR floor.
  const lead = eligible.find((r) => r.crr >= rule.leadMinCrr) ?? null
  if (!lead && rule.teamSize > 0) {
    notes.push(`No eligible candidate meets the lead CRR floor of ${rule.leadMinCrr}.`)
  }

  const selected: RankedMatch[] = lead ? [lead] : []
  const pool = eligible.filter((r) => r.userId !== lead?.userId && r.crr >= rule.memberMinCrr)

  // Greedily fill remaining slots, preferring a candidate whose primary strength
  // isn't already on the team (complementarity), else the next-highest SAS.
  while (selected.length < rule.teamSize && pool.length) {
    const covered = new Set(selected.map((s) => s.strengthProfile))
    const fresh = pool.find((r) => !covered.has(r.strengthProfile))
    const pick = fresh ?? pool[0]
    selected.push(pick)
    pool.splice(pool.indexOf(pick), 1)
    if (!fresh) notes.push(`Team shares a top strength (${pick.strengthProfile}) — no complementary candidate available.`)
  }

  if (selected.length < rule.teamSize) {
    notes.push(`Only ${selected.length} eligible candidate(s) for a team of ${rule.teamSize}.`)
  }

  // Coverage: every section should have >=1 member scoring at/above the floor.
  const coverageGaps: string[] = []
  for (const section of activeCompetencyRubric().sections) {
    const covered = selected.some((s) => (byId.get(s.userId)?.sectionPoints[section.key] ?? 0) >= rubric.coverageSectionFloor)
    if (!covered) coverageGaps.push(section.label)
  }

  const uniqueStrengths = new Set(selected.map((s) => s.strengthProfile)).size
  const complementarityScore = selected.length ? round1(uniqueStrengths / selected.length) : 0

  return {
    leadUserId: lead?.userId ?? null,
    memberUserIds: selected.filter((s) => s.userId !== lead?.userId).map((s) => s.userId),
    complementarityScore,
    coverageGaps,
    notes,
  }
}
