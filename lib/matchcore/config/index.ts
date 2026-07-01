// MatchCore rubric registry. The one place that says "which rubric version is
// live". Everything else asks here, so swapping to a new rubric version (or
// A/B-ing one) is a change in this file only.
//
// PURE DATA + pure helpers — safe to import anywhere (client or server).

import type { Tier } from '../types'
import { COMPETENCY_RUBRIC } from './competency'
import { COMPLEXITY_RUBRIC } from './complexity'
import { MATCHING_RUBRIC } from './matching'

export { COMPETENCY_RUBRIC } from './competency'
export { COMPLEXITY_RUBRIC } from './complexity'
export { MATCHING_RUBRIC } from './matching'

// Active versions — bump these to promote a new rubric. Kept as getters so a
// future "look up by version" (for interpreting historical scores) slots in
// without touching callers.
export const activeCompetencyRubric = () => COMPETENCY_RUBRIC
export const activeComplexityRubric = () => COMPLEXITY_RUBRIC
export const activeMatchingRubric = () => MATCHING_RUBRIC

// Resolve a score to its tier. Bands are evaluated highest-floor-first; the
// first whose `min` is met wins. Falls back to the lowest band.
export function tierFor(tiers: Tier[], score: number): Tier {
  const sorted = [...tiers].sort((a, b) => b.min - a.min)
  return sorted.find((t) => score >= t.min) ?? sorted[sorted.length - 1]
}

// Section ceiling = sum of its criteria maxes. Used by scoring + UI.
export function sectionMax(criteria: { max: number }[]): number {
  return criteria.reduce((s, c) => s + c.max, 0)
}
