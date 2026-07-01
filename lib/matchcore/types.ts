// MatchCore shared domain types. PURE data types only — no DB, no AI, no server
// imports — so client components, config, scoring, and services can all share
// one vocabulary. The three phases (A competency, B complexity, C matching) are
// modelled here; the numbers behind them live in ./config.

// ---------------------------------------------------------------------------
// Common
// ---------------------------------------------------------------------------

// A named threshold band. `min` is the inclusive floor; bands are evaluated
// highest-first so the first whose floor is met wins.
export type Tier = { key: string; label: string; min: number }

// One turn of an interview transcript. The interviewer is the 'assistant'.
// Lives here (pure) so client components can type transcripts without importing
// the server-only agent module.
export type InterviewMessage = { role: 'assistant' | 'user'; content: string }

// The four project archetypes. Determines the SAS weighting scheme (Phase C)
// and is classified during discovery (Phase B).
export const PROJECT_TYPES = ['technical', 'data', 'process_automation', 'marketing_content'] as const
export type ProjectType = (typeof PROJECT_TYPES)[number]

export const PROJECT_TYPE_LABEL: Record<ProjectType, string> = {
  technical: 'Technical',
  data: 'Data',
  process_automation: 'Process / Automation',
  marketing_content: 'Marketing / Content',
}

// A single scorable line item within a section/dimension. `max` is its point
// ceiling; `guidance` is prose the extraction prompt uses to score it.
export type Criterion = { key: string; label: string; max: number; guidance: string }

// ---------------------------------------------------------------------------
// Phase A — Competency (CRR)
// ---------------------------------------------------------------------------

export type CompetencySection = {
  key: string // e.g. '1A'
  label: string
  focus: string // one-line description used in prompts
  criteria: Criterion[]
  // SAS weight (0..1) this section carries for each project type. Weights within
  // a project type sum to 1 across sections.
  weightByType: Record<ProjectType, number>
}

export type CompetencyRubric = {
  version: string
  agentName: string // conversational persona (e.g. 'MatchCore Compass')
  sections: CompetencySection[]
  crrTiers: Tier[] // overall 0–100 bands
  sectionTiers: Tier[] // per-section bands (share the same shape)
}

// ---------------------------------------------------------------------------
// Phase B — Complexity (PCS)
// ---------------------------------------------------------------------------

// The five discovery briefs (2A–2E). Stored as structured prose the team reads.
export type DiscoveryBrief = { key: string; title: string; content: string }

export type ComplexityDimension = { key: string; label: string; max: number; guidance: string }

export type ComplexityRubric = {
  version: string
  agentName: string // e.g. 'MatchCore Scout'
  briefs: { key: string; title: string; focus: string }[] // 2A–2E interview topics
  dimensions: ComplexityDimension[]
  complexityTiers: Tier[] // Simple / Moderate / Complex over PCS 0–100
}

// ---------------------------------------------------------------------------
// Phase C — Matching (SAS + team)
// ---------------------------------------------------------------------------

// Per-complexity-tier staffing rule: how many apprentices and the CRR floor.
export type TeamRule = {
  complexity: string // matches a ComplexityRubric tier key
  teamSize: number
  leadMinCrr: number // CRR floor for the lead
  memberMinCrr: number // CRR floor for any member
}

export type MatchingRubric = {
  version: string
  teamRules: TeamRule[]
  sasTiers: Tier[] // match-quality bands over SAS 0–100
  maxActiveProjects: number // a candidate on this many active projects is ineligible
  coverageSectionFloor: number // a team should have >=1 member at/above this section score
}

// ---------------------------------------------------------------------------
// Computed score shapes (what scoring.ts returns and services persist)
// ---------------------------------------------------------------------------

export type CriterionScore = { criterion: string; points: number; max: number; evidence: string }
export type SectionScore = { section: string; label: string; points: number; max: number; tier: string; criteria: CriterionScore[] }

export type CompetencyResult = {
  rubricVersion: string
  sections: SectionScore[]
  sectionPoints: Record<string, number> // section key -> points, for matching
  crr: number
  crrMax: number
  crrTier: string
  strengths: string[]
  growthAreas: string[]
  summary: string
}

export type DimensionScore = { dimension: string; label: string; points: number; max: number; rationale: string }

export type ComplexityResult = {
  rubricVersion: string
  dimensions: DimensionScore[]
  pcs: number
  pcsMax: number
  complexity: string
  projectType: ProjectType
  secondaryType: ProjectType | null
  classificationConfidence: 'high' | 'medium' | 'low'
  briefs: DiscoveryBrief[]
  summary: string
}

// One candidate's evaluation against a project (Phase C).
export type MatchCandidate = {
  userId: string
  name: string | null
  crr: number
  crrTier: string
  sectionPoints: Record<string, number>
  activeProjects: number
  availability: string | null
}

export type RankedMatch = {
  userId: string
  name: string | null
  crr: number
  crrTier: string
  sas: number
  matchQuality: string
  strengthProfile: string // top section label
  secondaryStrength: string
  eligible: boolean
  ineligibleReason: string | null
  rationale: string
}

export type RecommendedTeam = {
  leadUserId: string | null
  memberUserIds: string[]
  complementarityScore: number // unique strengths / team size
  coverageGaps: string[] // section labels with no member at/above the proficiency floor
  notes: string[]
}

export type MatchResult = {
  rubricVersion: string
  teamSize: number
  ranked: RankedMatch[]
  team: RecommendedTeam
}
