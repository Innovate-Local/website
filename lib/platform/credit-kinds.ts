// Credit ledger entry kinds + presentation. Pure data, no server imports, so
// client components (ledger table, badges) can label rows. Keep the union in
// sync with the credit_transactions CHECK and the Drizzle $type.
export const CREDIT_KINDS = ['grant', 'transfer_out', 'transfer_in', 'spend', 'reclaim'] as const
export type CreditKind = (typeof CREDIT_KINDS)[number]

export const CREDIT_KIND_LABEL: Record<CreditKind, string> = {
  grant: 'Granted',
  transfer_out: 'Transferred out',
  transfer_in: 'Transferred in',
  spend: 'Spent',
  reclaim: 'Reclaimed',
}

// Whether a kind adds to (credit) or removes from (debit) the balance — used to
// colour amounts in the ledger.
export function creditDirection(kind: CreditKind): 'credit' | 'debit' {
  return kind === 'grant' || kind === 'transfer_in' || kind === 'reclaim' ? 'credit' : 'debit'
}
