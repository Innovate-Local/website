// Project status constants + labels. Pure data, no server imports, so client
// components can use it without pulling in the Drizzle/Postgres client. The
// server projects module re-exports these for convenience.
export const PROJECT_STATUSES = ['intake', 'scoping', 'active', 'delivered', 'closed'] as const
export type ProjectStatus = (typeof PROJECT_STATUSES)[number]

export const PROJECT_STATUS_LABEL: Record<ProjectStatus, string> = {
  intake: 'Intake',
  scoping: 'Scoping',
  active: 'Active',
  delivered: 'Delivered',
  closed: 'Closed',
}
