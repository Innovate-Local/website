// Deliverable status constants + labels. Pure data, no server imports, so client
// components can use it without pulling in Drizzle.
export const DELIVERABLE_STATUSES = ['todo', 'in_progress', 'done'] as const
export type DeliverableStatus = (typeof DELIVERABLE_STATUSES)[number]

export const DELIVERABLE_STATUS_LABEL: Record<DeliverableStatus, string> = {
  todo: 'To do',
  in_progress: 'In progress',
  done: 'Done',
}
