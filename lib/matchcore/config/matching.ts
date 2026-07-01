// Matching rubric (Phase C). PURE DATA. Team-size + eligibility rules keyed to
// project complexity, the SAS match-quality bands, and the coverage floor. The
// SAS *weights* themselves live on each competency section (weightByType in
// competency.ts) so a section's importance is defined in one place.
//
// `teamRules[].complexity` keys must match COMPLEXITY_RUBRIC.complexityTiers keys.

import type { MatchingRubric } from '../types'

export const MATCHING_RUBRIC: MatchingRubric = {
  version: 'sas-2026-07',
  maxActiveProjects: 2, // on 2+ active projects → ineligible for a new match
  coverageSectionFloor: 12, // a team wants >=1 member scoring >=12 in each section
  teamRules: [
    { complexity: 'simple', teamSize: 1, leadMinCrr: 40, memberMinCrr: 40 },
    { complexity: 'moderate', teamSize: 2, leadMinCrr: 60, memberMinCrr: 40 },
    { complexity: 'complex', teamSize: 3, leadMinCrr: 80, memberMinCrr: 60 },
  ],
  sasTiers: [
    { key: 'exceptional', label: 'Exceptional Match', min: 85 },
    { key: 'strong', label: 'Strong Match', min: 70 },
    { key: 'good', label: 'Good Match', min: 55 },
    { key: 'adequate', label: 'Adequate Match', min: 40 },
    { key: 'weak', label: 'Weak Match', min: 0 },
  ],
}
