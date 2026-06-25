// Engagement types + their credit cost. Pure data, no server imports, so client
// forms can render the options and the running cost without pulling in Drizzle.
// The credit costs mirror the program's published rates.
export const ENGAGEMENT_TYPES = [
  { key: 'workshop_seat', label: 'Workshop seat', credits: 1 },
  { key: 'sprint', label: 'Problem-framing sprint', credits: 4 },
  { key: 'exec_cohort', label: 'Executive education cohort', credits: 12 },
  { key: 'prototype', label: 'Student-team prototype', credits: 16 },
  { key: 'flexible', label: 'Mixed / flexible', credits: null },
] as const

export type EngagementKey = (typeof ENGAGEMENT_TYPES)[number]['key']

export const ENGAGEMENT_LABEL: Record<string, string> = Object.fromEntries(
  ENGAGEMENT_TYPES.map((e) => [e.key, e.label]),
)

export function engagementLabel(key: string | null | undefined): string | null {
  if (!key) return null
  return ENGAGEMENT_LABEL[key] ?? key
}
