// Project-request status constants + labels. Pure data, no server imports, so
// client components can use it without pulling in Drizzle.
export const REQUEST_STATUSES = ['drafting', 'open', 'converted', 'declined'] as const
export type RequestStatus = (typeof REQUEST_STATUSES)[number]

export const REQUEST_STATUS_LABEL: Record<RequestStatus, string> = {
  drafting: 'Draft — in progress',
  open: 'Under review',
  converted: 'Approved — project created',
  declined: 'Declined',
}
