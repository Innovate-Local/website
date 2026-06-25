// Project-interest status constants + labels. Pure data, no server imports, so
// client components can use it without pulling in the Drizzle/Postgres client.
export const INTEREST_STATUSES = ['interested', 'withdrawn', 'accepted', 'declined'] as const
export type InterestStatus = (typeof INTEREST_STATUSES)[number]

export const INTEREST_STATUS_LABEL: Record<InterestStatus, string> = {
  interested: 'Interested',
  withdrawn: 'Withdrawn',
  accepted: 'On the team',
  declined: 'Not selected',
}
