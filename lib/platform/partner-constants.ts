// Pure presentation data for the Community Innovation Partner portal. No server
// imports, so client components (console tabs, chips, forms) can use these
// directly. Keep the unions in sync with the CHECK constraints in
// supabase/migrations/20260701120000_community_innovation_partners.sql.

// --- Recipient kinds --------------------------------------------------------
export type RecipientKind = 'business' | 'nonprofit' | 'municipality' | 'chamber' | 'internal'

export const EXTERNAL_RECIPIENT_KINDS: RecipientKind[] = [
  'business',
  'nonprofit',
  'municipality',
  'chamber',
]

export const RECIPIENT_KIND_LABEL: Record<RecipientKind, string> = {
  business: 'Commercial Business',
  nonprofit: 'Nonprofit',
  municipality: 'Municipality',
  chamber: 'Chamber',
  internal: 'Internal',
}

// Chip colour per recipient kind, mapped onto Modern Bureau tokens. Solid tokens
// only (no `/NN` alpha on the var()-hex tokens — that compiles to invalid CSS).
export const RECIPIENT_KIND_CHIP: Record<RecipientKind, string> = {
  business: 'bg-tertiary text-on-tertiary',
  nonprofit: 'bg-tertiary-container text-on-tertiary-container',
  municipality: 'bg-secondary text-on-secondary',
  chamber: 'bg-primary-container text-on-primary-container',
  internal: 'bg-surface-container-high text-on-surface-variant',
}

// --- Ledger event types -----------------------------------------------------
export type PartnerEventType = 'allocation' | 'assign' | 'transfer' | 'redeem' | 'reclaim'

export const PARTNER_EVENT_LABEL: Record<PartnerEventType, string> = {
  allocation: 'Allocation',
  assign: 'Assigned',
  transfer: 'Transfer',
  redeem: 'Redeemed',
  reclaim: 'Reclaimed',
}

export const PARTNER_EVENT_CHIP: Record<PartnerEventType, string> = {
  allocation: 'bg-primary-container text-on-primary-container',
  assign: 'bg-surface-container-high text-on-surface-variant',
  transfer: 'bg-tertiary text-on-tertiary',
  redeem: 'bg-secondary text-on-secondary',
  reclaim: 'bg-error-container text-on-error-container',
}

// Whether an event returns credits to (+) or draws from (−) the partner balance.
export function partnerEventDirection(type: PartnerEventType): 'credit' | 'debit' | 'neutral' {
  if (type === 'allocation' || type === 'reclaim') return 'credit'
  if (type === 'assign' || type === 'transfer') return 'debit'
  return 'neutral' // redeem: moves from a recipient's committed balance, not the pool
}

// --- Recipient status (derived, not stored) ---------------------------------
export type RecipientStatus = 'active' | 'pending' | 'redeemed' | 'expiring'

export const RECIPIENT_STATUS_LABEL: Record<RecipientStatus, string> = {
  active: 'Active',
  pending: 'Pending',
  redeemed: 'Fully redeemed',
  expiring: 'Expiring soon',
}

export const RECIPIENT_STATUS_CHIP: Record<RecipientStatus, string> = {
  active: 'bg-tertiary text-on-tertiary',
  pending: 'bg-primary-container text-on-primary-container',
  redeemed: 'bg-surface-container-high text-on-surface-variant',
  expiring: 'bg-error-container text-on-error-container',
}

// --- Redemption fulfilment status -------------------------------------------
export type RedemptionStatus = 'in_progress' | 'completed'

export const REDEMPTION_STATUS_LABEL: Record<RedemptionStatus, string> = {
  in_progress: 'In progress',
  completed: 'Completed',
}

export const REDEMPTION_STATUS_CHIP: Record<RedemptionStatus, string> = {
  in_progress: 'bg-primary-container text-on-primary-container',
  completed: 'bg-tertiary text-on-tertiary',
}

// --- Partner (authorized-user) roles ----------------------------------------
export type PartnerRole = 'admin' | 'approver' | 'drafter'

export const PARTNER_ROLES: PartnerRole[] = ['admin', 'approver', 'drafter']

export const PARTNER_ROLE_LABEL: Record<PartnerRole, string> = {
  admin: 'Program Admin',
  approver: 'Approver',
  drafter: 'Drafter',
}

export const PARTNER_ROLE_TAGLINE: Record<PartnerRole, string> = {
  admin: 'Full control — allocate, transfer, and configure.',
  approver: 'Approves larger transfers.',
  drafter: 'Drafts transfers within the auto-approve limit.',
}
