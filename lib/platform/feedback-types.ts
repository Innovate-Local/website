// Feedback constants + labels. Pure data, no server imports, so client forms can
// render the rating scale and labels without pulling in Drizzle. Add new subject
// types / dimensions here as the feedback model grows.
export const FEEDBACK_SUBJECT_TYPES = ['apprentice', 'organization'] as const
export type FeedbackSubjectType = (typeof FEEDBACK_SUBJECT_TYPES)[number]

export const RATING_SCALE = [1, 2, 3, 4, 5] as const
export type Rating = (typeof RATING_SCALE)[number]

export const RATING_LABEL: Record<number, string> = {
  1: 'Poor',
  2: 'Fair',
  3: 'Good',
  4: 'Great',
  5: 'Excellent',
}

// Render a rating as filled/empty stars (display only).
export function ratingStars(rating: number | null): string {
  if (!rating) return '—'
  const r = Math.round(rating)
  return '★'.repeat(r) + '☆'.repeat(Math.max(0, 5 - r))
}
