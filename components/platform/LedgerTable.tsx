// Credit ledger table. Server-safe presentational component — given the rows,
// it renders the org's activity. Amount colour follows credit/debit direction.
import { CREDIT_KIND_LABEL, creditDirection } from '@/lib/platform/credit-kinds'
import { engagementLabel } from '@/lib/platform/engagement-types'
import type { LedgerEntry } from '@/lib/platform/credits'

function fmtDate(d: Date): string {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

// Short description of what an entry was for: counterparty (transfers),
// project + engagement (spends), or the note.
function detailFor(e: LedgerEntry): string {
  if (e.counterpartyName) return e.counterpartyName
  const eng = engagementLabel(e.engagementType)
  if (e.projectTitle) return eng ? `${e.projectTitle} · ${eng}` : e.projectTitle
  if (eng) return eng
  return e.note || '—'
}

export function LedgerTable({ entries }: { entries: LedgerEntry[] }) {
  if (entries.length === 0) {
    return (
      <p className="bg-surface-container-low p-8 text-center font-body text-on-surface-variant">
        No credit activity yet.
      </p>
    )
  }
  return (
    <div className="overflow-x-auto border border-outline-variant/30">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="bg-surface-container-high text-left">
            <th className="px-5 py-3 font-label text-xs font-semibold uppercase tracking-widest text-on-surface-variant">
              Date
            </th>
            <th className="px-5 py-3 font-label text-xs font-semibold uppercase tracking-widest text-on-surface-variant">
              Action
            </th>
            <th className="px-5 py-3 font-label text-xs font-semibold uppercase tracking-widest text-on-surface-variant">
              Detail
            </th>
            <th className="px-5 py-3 font-label text-xs font-semibold uppercase tracking-widest text-on-surface-variant">
              By
            </th>
            <th className="px-5 py-3 text-right font-label text-xs font-semibold uppercase tracking-widest text-on-surface-variant">
              Credits
            </th>
          </tr>
        </thead>
        <tbody>
          {entries.map((e) => {
            const debit = creditDirection(e.kind) === 'debit'
            return (
              <tr key={e.id} className="border-t border-outline-variant/30 even:bg-surface-container-low/40">
                <td className="whitespace-nowrap px-5 py-3 text-on-surface-variant">{fmtDate(e.createdAt)}</td>
                <td className="px-5 py-3">
                  <span className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant">
                    {CREDIT_KIND_LABEL[e.kind]}
                  </span>
                </td>
                <td className="px-5 py-3 text-on-surface">{detailFor(e)}</td>
                <td className="px-5 py-3 text-on-surface-variant">{e.authorizedByName || '—'}</td>
                <td
                  className={`whitespace-nowrap px-5 py-3 text-right font-semibold tabular-nums ${
                    debit ? 'text-error' : 'text-primary'
                  }`}
                >
                  {e.delta > 0 ? '+' : ''}
                  {e.delta}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
