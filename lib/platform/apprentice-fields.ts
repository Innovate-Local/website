// Apprentice-profile presentation constants. Pure data, no server imports, so
// client forms and badges can use them without pulling in Drizzle.
export const AVAILABILITY_OPTIONS = ['available', 'limited', 'unavailable'] as const
export type Availability = (typeof AVAILABILITY_OPTIONS)[number]

export const AVAILABILITY_LABEL: Record<Availability, string> = {
  available: 'Available',
  limited: 'Limited',
  unavailable: 'Unavailable',
}

// Known links we render with a label. The column is jsonb, so unknown keys are
// still stored — these are just the ones with first-class fields/labels.
export const LINK_FIELDS = [
  { key: 'portfolio', label: 'Portfolio' },
  { key: 'github', label: 'GitHub' },
  { key: 'linkedin', label: 'LinkedIn' },
  { key: 'website', label: 'Website' },
] as const

export type LinkKey = (typeof LINK_FIELDS)[number]['key']

// Parse a comma/newline-separated string into a clean, de-duplicated tag list.
export function parseTags(raw: string): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const part of raw.split(/[,\n]/)) {
    const tag = part.trim()
    if (tag && !seen.has(tag.toLowerCase())) {
      seen.add(tag.toLowerCase())
      out.push(tag)
    }
  }
  return out
}
