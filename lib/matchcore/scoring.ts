// Deterministic scoring. PURE — no DB, no AI, no I/O. Takes the *raw signals*
// an LLM extracted from an interview and turns them into a CRR / PCS result by
// clamping every point to its rubric ceiling and summing in code. The model
// never decides a final score; it only supplies evidence-backed per-item points
// that this module validates and aggregates. That separation is what keeps
// scores reproducible and auditable.

import {
  activeCompetencyRubric,
  activeComplexityRubric,
  sectionMax,
  tierFor,
} from './config'
import { PROJECT_TYPES } from './types'
import type {
  CompetencyResult,
  CompetencyRubric,
  ComplexityResult,
  ComplexityRubric,
  DiscoveryBrief,
  ProjectType,
  SectionScore,
} from './types'

const clamp = (n: number, max: number) => Math.max(0, Math.min(Math.round(Number.isFinite(n) ? n : 0), max))

// ---------------------------------------------------------------------------
// Raw extraction contracts (what the AI layer produces; see agents.ts)
// ---------------------------------------------------------------------------
export type RawCriterionSignal = { section: string; criterion: string; points: number; evidence: string }
export type RawCompetencySignals = {
  scores: RawCriterionSignal[]
  strengths: string[]
  growthAreas: string[]
  summary: string
}

export type RawDimensionSignal = { dimension: string; points: number; rationale: string }
export type RawComplexitySignals = {
  dimensionScores: RawDimensionSignal[]
  briefs: { key: string; title: string; content: string }[]
  projectType: string
  secondaryType: string | null
  classificationConfidence: string
  summary: string
}

// ---------------------------------------------------------------------------
// Phase A — CRR
// ---------------------------------------------------------------------------
export function scoreCompetency(
  raw: RawCompetencySignals,
  rubric: CompetencyRubric = activeCompetencyRubric(),
): CompetencyResult {
  const find = (section: string, criterion: string) =>
    raw.scores?.find((s) => s.section === section && s.criterion === criterion)

  const sections: SectionScore[] = rubric.sections.map((section) => {
    const criteria = section.criteria.map((c) => {
      const hit = find(section.key, c.key)
      return {
        criterion: c.key,
        points: clamp(hit?.points ?? 0, c.max),
        max: c.max,
        evidence: hit?.evidence?.trim() || '—',
      }
    })
    const points = criteria.reduce((s, c) => s + c.points, 0)
    const max = sectionMax(section.criteria)
    return {
      section: section.key,
      label: section.label,
      points,
      max,
      tier: tierFor(rubric.sectionTiers, points).label,
      criteria,
    }
  })

  const crr = sections.reduce((s, sec) => s + sec.points, 0)
  const crrMax = sections.reduce((s, sec) => s + sec.max, 0)
  const sectionPoints = Object.fromEntries(sections.map((s) => [s.section, s.points]))

  // Fall back to deriving strengths/growth from the numbers if the model didn't
  // supply them, so the card is always populated.
  const ranked = [...sections].sort((a, b) => b.points - a.points)
  const strengths = raw.strengths?.length ? raw.strengths : ranked.slice(0, 2).map((s) => s.label)
  const growthAreas = raw.growthAreas?.length ? raw.growthAreas : ranked.slice(-1).map((s) => s.label)

  return {
    rubricVersion: rubric.version,
    sections,
    sectionPoints,
    crr,
    crrMax,
    crrTier: tierFor(rubric.crrTiers, crr).label,
    strengths,
    growthAreas,
    summary: raw.summary?.trim() || '',
  }
}

// ---------------------------------------------------------------------------
// Phase B — PCS
// ---------------------------------------------------------------------------
function normalizeProjectType(raw: string | null | undefined): ProjectType | null {
  if (!raw) return null
  const v = raw.trim().toLowerCase().replace(/[\s/-]+/g, '_')
  return (PROJECT_TYPES as readonly string[]).includes(v) ? (v as ProjectType) : null
}

export function scoreComplexity(
  raw: RawComplexitySignals,
  rubric: ComplexityRubric = activeComplexityRubric(),
): ComplexityResult {
  const dimensions = rubric.dimensions.map((d) => {
    const hit = raw.dimensionScores?.find((x) => x.dimension === d.key)
    return {
      dimension: d.key,
      label: d.label,
      points: clamp(hit?.points ?? 0, d.max),
      max: d.max,
      rationale: hit?.rationale?.trim() || '—',
    }
  })

  const pcs = dimensions.reduce((s, d) => s + d.points, 0)
  const pcsMax = dimensions.reduce((s, d) => s + d.max, 0)

  const briefs: DiscoveryBrief[] = rubric.briefs.map((b) => {
    const hit = raw.briefs?.find((x) => x.key === b.key)
    return { key: b.key, title: b.title, content: hit?.content?.trim() || '—' }
  })

  const confidence = (['high', 'medium', 'low'] as const).find((c) => c === raw.classificationConfidence) ?? 'medium'

  return {
    rubricVersion: rubric.version,
    dimensions,
    pcs,
    pcsMax,
    complexity: tierFor(rubric.complexityTiers, pcs).label,
    projectType: normalizeProjectType(raw.projectType) ?? 'process_automation',
    secondaryType: normalizeProjectType(raw.secondaryType),
    classificationConfidence: confidence,
    briefs,
    summary: raw.summary?.trim() || '',
  }
}
