'use client'

import { useEffect, useMemo, useRef, useState, useTransition } from 'react'
import {
  adjustAllocationAction,
  assignInternalAction,
  invitePartnerMemberAction,
  removePartnerMemberAction,
  setPartnerMemberRoleAction,
  transferExternalAction,
  updatePoliciesAction,
  type ActionResult,
} from '@/app/dashboard/partner/actions'
import { ENGAGEMENT_TYPES } from '@/lib/platform/engagement-types'
import {
  EXTERNAL_RECIPIENT_KINDS,
  PARTNER_EVENT_CHIP,
  PARTNER_EVENT_LABEL,
  PARTNER_ROLE_LABEL,
  PARTNER_ROLES,
  RECIPIENT_KIND_CHIP,
  RECIPIENT_KIND_LABEL,
  RECIPIENT_STATUS_CHIP,
  RECIPIENT_STATUS_LABEL,
  REDEMPTION_STATUS_CHIP,
  REDEMPTION_STATUS_LABEL,
  partnerEventDirection,
  type PartnerRole,
  type RecipientKind,
} from '@/lib/platform/partner-constants'
import type {
  PartnerContext,
  PartnerLedgerRow,
  PartnerMemberRow,
  PartnerOverview,
  RecipientRow,
  RedemptionRow,
  RedemptionSummary,
} from '@/lib/platform/partners'
import { Metric, MetricGrid } from '@/components/platform/Metric'
import { inputClass, labelClass, primaryButtonClass } from '../styles'

// ---------------------------------------------------------------------------
// Small shared bits
// ---------------------------------------------------------------------------
type Tab = 'overview' | 'recipients' | 'ledger' | 'redemptions' | 'settings'

function Chip({ className, children }: { className: string; children: React.ReactNode }) {
  return (
    <span
      className={`inline-block px-2.5 py-1 font-label text-[10px] font-bold uppercase tracking-wider ${className}`}
    >
      {children}
    </span>
  )
}

function fmtDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

const TH = 'px-5 py-3 font-label text-xs font-semibold uppercase tracking-widest text-on-surface-variant text-left'
const THNUM = `${TH} text-right`
const TD_ROW = 'border-t border-outline-variant/30 even:bg-surface-container-low/40'

// Signed ledger amount for display: assign/transfer/redeem draw down, allocation/
// reclaim add back.
function signedAmount(eventType: PartnerLedgerRow['eventType'], amount: number): number {
  return partnerEventDirection(eventType) === 'credit' ? amount : -amount
}

type ToastItem = { id: number; stamp: string; msg: string }

function RadioChips({
  name,
  value,
  onChange,
  options,
}: {
  name: string
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => (
        <label
          key={o.value}
          className={`cursor-pointer select-none px-4 py-2.5 font-label text-[11px] font-semibold uppercase tracking-wider transition-colors ${
            value === o.value ? 'bg-primary text-on-primary' : 'bg-surface-container-high text-on-surface'
          }`}
        >
          <input
            type="radio"
            name={name}
            value={o.value}
            checked={value === o.value}
            onChange={() => onChange(o.value)}
            className="hidden"
          />
          {o.label}
        </label>
      ))}
    </div>
  )
}

function ModalShell({
  stamp,
  title,
  onClose,
  children,
}: {
  stamp: string
  title: string
  onClose: () => void
  children: React.ReactNode
}) {
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 sm:p-6"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto bg-surface shadow-2xl">
        <div className="flex items-start justify-between bg-surface-container-low px-6 py-5 sm:px-8 sm:py-6">
          <div>
            <div className="font-label text-[10px] font-bold uppercase tracking-widest text-primary">
              {stamp}
            </div>
            <h3 className="mt-1 font-headline text-2xl text-on-surface">{title}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="font-label text-xs font-bold uppercase tracking-widest text-on-surface-variant hover:text-secondary"
          >
            Close ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

function ErrorNote({ error }: { error: string | null }) {
  if (!error) return null
  return (
    <div className="bg-error-container p-4 text-on-error-container">
      <p className="font-label text-xs uppercase tracking-widest">{error}</p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main console
// ---------------------------------------------------------------------------
export function PartnerConsole({
  partner,
  overview,
  recipients,
  ledger,
  redemptions,
  redemptionSummary,
  members,
}: {
  partner: PartnerContext
  overview: PartnerOverview
  recipients: RecipientRow[]
  ledger: PartnerLedgerRow[]
  redemptions: RedemptionRow[]
  redemptionSummary: RedemptionSummary
  members: PartnerMemberRow[]
}) {
  const [tab, setTab] = useState<Tab>('overview')
  const [modal, setModal] = useState<null | 'assign' | 'transfer'>(null)
  const [adjustTarget, setAdjustTarget] = useState<{ recipient: RecipientRow; mode: 'add' | 'reclaim' } | null>(null)
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const isAdmin = partner.partnerRole === 'admin'

  function pushToast(stamp: string, msg: string) {
    const id = Date.now() + Math.floor(Math.random() * 1000)
    setToasts((t) => [...t, { id, stamp, msg }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4200)
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setModal(null)
        setAdjustTarget(null)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  function switchTab(t: Tab) {
    setTab(t)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const tabs: { key: Tab; label: string; count?: number }[] = [
    { key: 'overview', label: 'Overview' },
    { key: 'recipients', label: 'Recipients', count: recipients.length },
    { key: 'ledger', label: 'Activity Ledger' },
    { key: 'redemptions', label: 'Redemptions' },
    { key: 'settings', label: 'Settings' },
  ]

  return (
    <div className="flex flex-col gap-8">
      {/* Hero */}
      <header className="flex flex-col gap-3">
        <span className="annotation">
          Community Innovation Partner · {partner.orgName}
        </span>
        <h1 className="font-headline text-5xl leading-[0.95] tracking-tight text-on-surface md:text-6xl">
          Innovation Credits.
        </h1>
        <p className="max-w-2xl font-body text-lg text-on-surface-variant">
          Allocate, transfer, and redeem {partner.orgName}’s annual Innovation Credits — inside the
          organization, or out to the regional businesses, nonprofits, municipalities, and chambers in
          your footprint.
        </p>
      </header>

      {/* Tabs */}
      <nav className="flex flex-wrap gap-px bg-surface-container-low" role="tablist">
        {tabs.map((t) => (
          <button
            key={t.key}
            role="tab"
            onClick={() => switchTab(t.key)}
            className={`px-6 py-4 font-label text-[11px] font-bold uppercase tracking-widest transition-colors ${
              tab === t.key
                ? 'bg-inverse-surface text-inverse-on-surface'
                : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
            }`}
          >
            {t.label}
            {t.count != null && (
              <span
                className={`ml-2 px-2 py-0.5 text-[10px] ${
                  tab === t.key ? 'bg-primary-container text-on-primary-container' : 'bg-primary text-on-primary'
                }`}
              >
                {t.count}
              </span>
            )}
          </button>
        ))}
      </nav>

      {tab === 'overview' && (
        <OverviewTab
          partner={partner}
          overview={overview}
          ledger={ledger}
          onAssign={() => setModal('assign')}
          onTransfer={() => setModal('transfer')}
          onViewRecipients={() => switchTab('recipients')}
          onViewLedger={() => switchTab('ledger')}
        />
      )}
      {tab === 'recipients' && (
        <RecipientsTab
          recipients={recipients}
          onAssign={() => setModal('assign')}
          onTransfer={() => setModal('transfer')}
          onAdjust={(recipient, mode) => setAdjustTarget({ recipient, mode })}
        />
      )}
      {tab === 'ledger' && <LedgerTab ledger={ledger} onToast={pushToast} partnerName={partner.orgName} />}
      {tab === 'redemptions' && <RedemptionsTab redemptions={redemptions} summary={redemptionSummary} />}
      {tab === 'settings' && (
        <SettingsTab partner={partner} members={members} isAdmin={isAdmin} onToast={pushToast} />
      )}

      {/* Modals */}
      {modal === 'assign' && (
        <AssignModal
          available={overview.available}
          onClose={() => setModal(null)}
          onToast={pushToast}
        />
      )}
      {modal === 'transfer' && (
        <TransferModal
          available={overview.available}
          onClose={() => setModal(null)}
          onToast={pushToast}
        />
      )}
      {adjustTarget && (
        <AdjustModal
          target={adjustTarget}
          available={overview.available}
          onClose={() => setAdjustTarget(null)}
          onToast={pushToast}
        />
      )}

      {/* Toasts */}
      <div className="pointer-events-none fixed bottom-8 right-8 z-[200] flex flex-col gap-2.5">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="pointer-events-auto min-w-[280px] bg-inverse-surface px-5 py-4 text-inverse-on-surface shadow-2xl"
          >
            <div className="font-label text-[10px] font-bold uppercase tracking-widest text-inverse-primary">
              {t.stamp}
            </div>
            <div className="mt-1 text-sm">{t.msg}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Overview tab
// ---------------------------------------------------------------------------
function OverviewTab({
  partner,
  overview,
  ledger,
  onAssign,
  onTransfer,
  onViewRecipients,
  onViewLedger,
}: {
  partner: PartnerContext
  overview: PartnerOverview
  ledger: PartnerLedgerRow[]
  onAssign: () => void
  onTransfer: () => void
  onViewRecipients: () => void
  onViewLedger: () => void
}) {
  const pct = overview.annualAllocation > 0 ? (overview.committed / overview.annualAllocation) * 100 : 0
  const cycleNote = partner.cycleEnd
    ? `Cycle resets ${fmtDate(partner.cycleEnd)}`
    : 'Annual allocation'
  const recent = ledger.slice(0, 5)
  const total = overview.allocationByType.reduce((s, a) => s + a.amount, 0)

  return (
    <div className="flex flex-col gap-12">
      <MetricGrid>
        <Metric
          tone="primary"
          label="Available credits"
          value={overview.available.toLocaleString()}
          sub={
            <>
              of {overview.annualAllocation.toLocaleString()} annual allocation · {cycleNote}
              <span className="mt-3 block h-1 w-full bg-white/20">
                <span className="block h-full bg-inverse-primary" style={{ width: `${Math.min(100, pct)}%` }} />
              </span>
            </>
          }
        />
        <Metric
          label="Assigned · internal"
          value={overview.internalAssigned.toLocaleString()}
          sub={`Across ${overview.internalDeptCount} departments`}
        />
        <Metric
          label="Transferred · external"
          value={overview.externalTransferred.toLocaleString()}
          sub={`To ${overview.externalOrgCount} regional recipients`}
        />
        <Metric
          label="Redeemed YTD"
          value={overview.redeemed.toLocaleString()}
          sub={`${overview.redemptionRate}% redemption rate`}
        />
      </MetricGrid>

      {/* Action tiles */}
      <div className="grid grid-cols-1 gap-px border border-outline-variant/30 bg-outline-variant/30 lg:grid-cols-2">
        <div className="flex flex-col gap-4 bg-surface-container-low p-8">
          <div className="font-label text-[10px] font-bold uppercase tracking-widest text-primary">
            Internal
          </div>
          <h3 className="font-headline text-2xl text-on-surface">Assign credits inside the organization.</h3>
          <p className="text-sm text-on-surface-variant">
            Allocate to any department for workshop seats, problem-framing sprints, or prototype work.
          </p>
          <div className="mt-auto flex flex-wrap gap-3">
            <button onClick={onAssign} className={primaryButtonClass}>
              Assign credits →
            </button>
            <button
              onClick={onViewRecipients}
              className="border-b-2 border-primary/60 py-2 font-label text-xs font-bold uppercase tracking-widest text-primary hover:border-secondary hover:text-secondary"
            >
              View recipients
            </button>
          </div>
        </div>
        <div className="flex flex-col gap-4 bg-surface-container-low p-8">
          <div className="font-label text-[10px] font-bold uppercase tracking-widest text-primary">
            External
          </div>
          <h3 className="font-headline text-2xl text-on-surface">Transfer credits into the region.</h3>
          <p className="text-sm text-on-surface-variant">
            Direct credits to a commercial customer, nonprofit, municipality, or chamber. The recipient
            gets a redemption code by email.
          </p>
          <div className="mt-auto flex flex-wrap gap-3">
            <button onClick={onTransfer} className={primaryButtonClass}>
              Transfer credits →
            </button>
            <button
              onClick={onViewRecipients}
              className="border-b-2 border-primary/60 py-2 font-label text-xs font-bold uppercase tracking-widest text-primary hover:border-secondary hover:text-secondary"
            >
              View recipients
            </button>
          </div>
        </div>
      </div>

      {/* Allocation by type */}
      <section className="flex flex-col gap-5">
        <div>
          <div className="annotation">Allocation</div>
          <h2 className="font-headline text-3xl text-on-surface">Where the credits have gone.</h2>
        </div>
        {total === 0 ? (
          <p className="bg-surface-container-low p-6 text-sm text-on-surface-variant">
            No credits committed yet. Assign or transfer to see the breakdown.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-px border border-outline-variant/30 bg-outline-variant/30 lg:grid-cols-[2fr_1fr]">
            <div className="bg-surface p-7">
              <div className="font-label text-[9px] font-bold uppercase tracking-widest text-primary">
                Partition · by recipient type
              </div>
              <div className="mt-6 flex h-14">
                {overview.allocationByType.map((a) => (
                  <div
                    key={a.kind}
                    title={`${RECIPIENT_KIND_LABEL[a.kind]}: ${a.amount}`}
                    className={`flex items-center justify-center text-[11px] font-bold ${RECIPIENT_KIND_CHIP[a.kind]}`}
                    style={{ width: `${(a.amount / total) * 100}%` }}
                  >
                    {(a.amount / total) * 100 > 8 ? a.amount : ''}
                  </div>
                ))}
              </div>
              <p className="mt-4 text-xs leading-relaxed text-on-surface-variant">
                Of <strong className="text-on-surface">{total} credits committed</strong> this cycle,
                the breakdown across commercial, nonprofit, municipal, chamber, and internal recipients
                is shown above.
              </p>
            </div>
            <div className="bg-surface p-7">
              <div className="font-label text-[9px] font-bold uppercase tracking-widest text-primary">
                Legend
              </div>
              <div className="mt-4 flex flex-col gap-2">
                {overview.allocationByType.map((a) => (
                  <div key={a.kind} className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className={`h-3.5 w-3.5 ${RECIPIENT_KIND_CHIP[a.kind]}`} />
                      <span className="text-sm text-on-surface">{RECIPIENT_KIND_LABEL[a.kind]}</span>
                    </div>
                    <span className="font-headline text-lg tabular-nums text-on-surface">{a.amount}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Recent activity */}
      <section className="flex flex-col gap-5">
        <div className="flex items-end justify-between">
          <div>
            <div className="annotation">Recent</div>
            <h2 className="font-headline text-3xl text-on-surface">Latest entries.</h2>
          </div>
          <button
            onClick={onViewLedger}
            className="border-b-2 border-primary/60 py-2 font-label text-xs font-bold uppercase tracking-widest text-primary hover:border-secondary hover:text-secondary"
          >
            Full ledger →
          </button>
        </div>
        <LedgerRows rows={recent} compact />
      </section>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Recipients tab
// ---------------------------------------------------------------------------
function RecipientsTab({
  recipients,
  onAssign,
  onTransfer,
  onAdjust,
}: {
  recipients: RecipientRow[]
  onAssign: () => void
  onTransfer: () => void
  onAdjust: (r: RecipientRow, mode: 'add' | 'reclaim') => void
}) {
  const [filter, setFilter] = useState<'all' | RecipientKind>('all')
  const [search, setSearch] = useState('')

  const filters: { key: 'all' | RecipientKind; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'business', label: 'Business' },
    { key: 'nonprofit', label: 'Nonprofit' },
    { key: 'municipality', label: 'Municipality' },
    { key: 'chamber', label: 'Chamber' },
    { key: 'internal', label: 'Internal' },
  ]

  const rows = useMemo(() => {
    const q = search.toLowerCase()
    return recipients.filter(
      (r) =>
        (filter === 'all' || r.kind === filter) &&
        (r.name.toLowerCase().includes(q) || (r.contactName ?? '').toLowerCase().includes(q)),
    )
  }, [recipients, filter, search])

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="annotation">Recipients</div>
          <h2 className="font-headline text-3xl text-on-surface">Every organization receiving credits.</h2>
        </div>
        <div className="flex flex-wrap gap-3">
          <button onClick={onAssign} className="bg-surface-container-highest px-6 py-4 font-label text-sm font-bold uppercase tracking-widest text-on-surface hover:bg-surface-container-high">
            + Assign internal
          </button>
          <button onClick={onTransfer} className={primaryButtonClass}>
            + Transfer external →
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 bg-surface-container-low p-4">
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-3.5 py-2 font-label text-[11px] font-semibold uppercase tracking-wider transition-colors ${
              filter === f.key
                ? 'bg-inverse-surface text-inverse-on-surface'
                : 'bg-surface-container-high text-on-surface-variant hover:text-on-surface'
            }`}
          >
            {f.label}
          </button>
        ))}
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search organization…"
          className="ml-auto min-w-[200px] border-b-2 border-transparent bg-surface px-3 py-2 text-sm outline-none focus:border-secondary"
        />
      </div>

      <div className="overflow-x-auto bg-surface-container-lowest">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-surface-container-high">
              <th className={TH}>Organization</th>
              <th className={TH}>Type</th>
              <th className={TH}>Contact</th>
              <th className={THNUM}>Assigned</th>
              <th className={THNUM}>Redeemed</th>
              <th className={THNUM}>Remaining</th>
              <th className={TH}>Status</th>
              <th className={TH}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-5 py-10 text-center text-on-surface-variant">
                  No recipients match this filter.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className={TD_ROW}>
                  <td className="px-5 py-4">
                    <div className="font-semibold text-on-surface">{r.name}</div>
                    <div className="font-label text-[10px] uppercase tracking-wider text-on-surface-variant">
                      {r.kind === 'internal'
                        ? 'Internal'
                        : r.relationshipManager
                          ? `RM · ${r.relationshipManager}`
                          : r.linkedOrgId
                            ? 'Platform org'
                            : 'External'}
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <Chip className={RECIPIENT_KIND_CHIP[r.kind]}>{RECIPIENT_KIND_LABEL[r.kind]}</Chip>
                  </td>
                  <td className="px-5 py-4 text-on-surface-variant">
                    {r.contactName || '—'}
                    {r.contactEmail && <div className="text-xs">{r.contactEmail}</div>}
                  </td>
                  <td className="px-5 py-4 text-right font-semibold tabular-nums text-on-surface">{r.assigned}</td>
                  <td className="px-5 py-4 text-right tabular-nums text-on-surface-variant">{r.redeemed}</td>
                  <td className={`px-5 py-4 text-right font-semibold tabular-nums ${r.remaining > 0 ? 'text-tertiary' : 'text-on-surface-variant'}`}>
                    {r.remaining}
                  </td>
                  <td className="px-5 py-4">
                    <Chip className={RECIPIENT_STATUS_CHIP[r.status]}>{RECIPIENT_STATUS_LABEL[r.status]}</Chip>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex gap-2">
                      <button
                        onClick={() => onAdjust(r, 'add')}
                        className="px-2.5 py-1.5 font-label text-[10px] uppercase tracking-wider text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"
                      >
                        + Add
                      </button>
                      <button
                        onClick={() => onAdjust(r, 'reclaim')}
                        className="px-2.5 py-1.5 font-label text-[10px] uppercase tracking-wider text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"
                      >
                        Reclaim
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Ledger tab
// ---------------------------------------------------------------------------
function LedgerRows({ rows, compact }: { rows: PartnerLedgerRow[]; compact?: boolean }) {
  return (
    <div className="overflow-x-auto bg-surface-container-lowest">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="bg-surface-container-high">
            <th className={TH}>Date</th>
            <th className={TH}>Counterparty</th>
            <th className={TH}>Action</th>
            <th className={TH}>Redemption</th>
            {!compact && <th className={TH}>Authorized by</th>}
            <th className={THNUM}>Credits</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={compact ? 5 : 6} className="px-5 py-10 text-center text-on-surface-variant">
                No entries yet.
              </td>
            </tr>
          ) : (
            rows.map((l) => {
              const signed = signedAmount(l.eventType, l.amount)
              return (
                <tr key={l.id} className={TD_ROW}>
                  <td className="whitespace-nowrap px-5 py-4 text-on-surface-variant">{fmtDate(l.eventDate)}</td>
                  <td className="px-5 py-4">
                    <div className="font-semibold text-on-surface">{l.recipientName || '—'}</div>
                    {l.recipientKind && (
                      <div className="font-label text-[10px] uppercase tracking-wider text-on-surface-variant">
                        {RECIPIENT_KIND_LABEL[l.recipientKind]}
                      </div>
                    )}
                  </td>
                  <td className="px-5 py-4">
                    <Chip className={PARTNER_EVENT_CHIP[l.eventType]}>{PARTNER_EVENT_LABEL[l.eventType]}</Chip>
                  </td>
                  <td className="px-5 py-4 text-on-surface-variant">{l.redemptionType || '—'}</td>
                  {!compact && <td className="px-5 py-4 text-on-surface-variant">{l.authorizedByName || '—'}</td>}
                  <td className={`px-5 py-4 text-right font-semibold tabular-nums ${signed < 0 ? 'text-secondary' : 'text-tertiary'}`}>
                    {signed > 0 ? '+' : ''}
                    {signed}
                  </td>
                </tr>
              )
            })
          )}
        </tbody>
      </table>
    </div>
  )
}

function LedgerTab({
  ledger,
  onToast,
  partnerName,
}: {
  ledger: PartnerLedgerRow[]
  onToast: (s: string, m: string) => void
  partnerName: string
}) {
  const [action, setAction] = useState<'all' | PartnerLedgerRow['eventType']>('all')
  const [search, setSearch] = useState('')

  const filters: { key: 'all' | PartnerLedgerRow['eventType']; label: string }[] = [
    { key: 'all', label: 'All actions' },
    { key: 'assign', label: 'Assigned' },
    { key: 'transfer', label: 'Transferred' },
    { key: 'redeem', label: 'Redeemed' },
    { key: 'reclaim', label: 'Reclaimed' },
  ]

  const rows = useMemo(() => {
    const q = search.toLowerCase()
    return ledger.filter(
      (l) =>
        (action === 'all' || l.eventType === action) &&
        ((l.recipientName ?? '').toLowerCase().includes(q) ||
          (l.redemptionType ?? '').toLowerCase().includes(q)),
    )
  }, [ledger, action, search])

  function exportCsv() {
    const headers = ['Date', 'Action', 'Counterparty', 'Type', 'Redemption', 'Authorized By', 'Credits']
    const body = rows.map((l) => [
      l.eventDate,
      PARTNER_EVENT_LABEL[l.eventType],
      l.recipientName ?? '',
      l.recipientKind ? RECIPIENT_KIND_LABEL[l.recipientKind] : '',
      l.redemptionType ?? '',
      l.authorizedByName ?? '',
      String(signedAmount(l.eventType, l.amount)),
    ])
    const csv = [headers, ...body]
      .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','))
      .join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `${partnerName.toLowerCase().replace(/\s+/g, '_')}_innovation_credits_ledger.csv`
    a.click()
    URL.revokeObjectURL(a.href)
    onToast('Export ready', 'Ledger CSV downloaded.')
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="annotation">Activity ledger</div>
          <h2 className="font-headline text-3xl text-on-surface">A full record of every credit movement.</h2>
        </div>
        <button
          onClick={exportCsv}
          className="bg-surface-container-highest px-6 py-4 font-label text-sm font-bold uppercase tracking-widest text-on-surface hover:bg-surface-container-high"
        >
          Export CSV ↓
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2 bg-surface-container-low p-4">
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => setAction(f.key)}
            className={`px-3.5 py-2 font-label text-[11px] font-semibold uppercase tracking-wider transition-colors ${
              action === f.key
                ? 'bg-inverse-surface text-inverse-on-surface'
                : 'bg-surface-container-high text-on-surface-variant hover:text-on-surface'
            }`}
          >
            {f.label}
          </button>
        ))}
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search ledger…"
          className="ml-auto min-w-[200px] border-b-2 border-transparent bg-surface px-3 py-2 text-sm outline-none focus:border-secondary"
        />
      </div>

      <LedgerRows rows={rows} />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Redemptions tab
// ---------------------------------------------------------------------------
function RedemptionsTab({
  redemptions,
  summary,
}: {
  redemptions: RedemptionRow[]
  summary: RedemptionSummary
}) {
  return (
    <div className="flex flex-col gap-8">
      <div>
        <div className="annotation">Redemptions</div>
        <h2 className="font-headline text-3xl text-on-surface">What credits have been put to work on.</h2>
      </div>

      <div className="grid grid-cols-1 gap-px border border-outline-variant/30 bg-outline-variant/30 sm:grid-cols-3">
        <Metric
          label="Sprints booked"
          value={summary.sprintCount}
          sub={`${summary.sprintCredits} credits · problem-framing`}
        />
        <Metric
          label="Prototype engagements"
          value={summary.prototypeCount}
          sub={`${summary.prototypeCredits} credits · student teams`}
        />
        <Metric
          label="Workshop seats filled"
          value={summary.workshopSeats}
          sub={`${summary.workshopCredits} credits · 1 per seat`}
        />
      </div>

      <section className="flex flex-col gap-5">
        <div>
          <div className="annotation">Recent redemptions</div>
          <h2 className="font-headline text-2xl text-on-surface">What recipients are choosing.</h2>
        </div>
        <div className="overflow-x-auto bg-surface-container-lowest">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-surface-container-high">
                <th className={TH}>Date</th>
                <th className={TH}>Recipient</th>
                <th className={TH}>Engagement</th>
                <th className={TH}>Project / cohort</th>
                <th className={TH}>Status</th>
                <th className={THNUM}>Credits</th>
              </tr>
            </thead>
            <tbody>
              {redemptions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-on-surface-variant">
                    No redemptions yet.
                  </td>
                </tr>
              ) : (
                redemptions.map((r) => {
                  const status = (r.status === 'completed' ? 'completed' : 'in_progress') as
                    | 'completed'
                    | 'in_progress'
                  return (
                    <tr key={r.id} className={TD_ROW}>
                      <td className="whitespace-nowrap px-5 py-4 text-on-surface-variant">{fmtDate(r.eventDate)}</td>
                      <td className="px-5 py-4 font-semibold text-on-surface">{r.recipientName || '—'}</td>
                      <td className="px-5 py-4 text-on-surface-variant">{r.redemptionType || '—'}</td>
                      <td className="px-5 py-4 text-on-surface-variant">{r.projectLabel || '—'}</td>
                      <td className="px-5 py-4">
                        <Chip className={REDEMPTION_STATUS_CHIP[status]}>{REDEMPTION_STATUS_LABEL[status]}</Chip>
                      </td>
                      <td className="px-5 py-4 text-right font-semibold tabular-nums text-secondary">-{r.amount}</td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Settings tab
// ---------------------------------------------------------------------------
function SettingsTab({
  partner,
  members,
  isAdmin,
  onToast,
}: {
  partner: PartnerContext
  members: PartnerMemberRow[]
  isAdmin: boolean
  onToast: (s: string, m: string) => void
}) {
  const cycle =
    partner.cycleStart && partner.cycleEnd
      ? `${fmtDate(partner.cycleStart)} – ${fmtDate(partner.cycleEnd)}`
      : '—'

  return (
    <div className="flex flex-col gap-10">
      <div>
        <div className="annotation">Settings</div>
        <h2 className="font-headline text-3xl text-on-surface">Partnership configuration.</h2>
      </div>

      <div className="grid grid-cols-1 gap-px border border-outline-variant/30 bg-outline-variant/30 lg:grid-cols-2">
        {/* Details (read-only; managed by hub staff) */}
        <div className="flex flex-col gap-4 bg-surface p-7">
          <div className="font-label text-[9px] font-bold uppercase tracking-widest text-primary">
            Partner details
          </div>
          <ReadField label="Partner organization" value={partner.orgName} />
          <ReadField label="Partnership tier" value={partner.tier} />
          <div className="grid grid-cols-2 gap-4">
            <ReadField label="Annual allocation" value={`${partner.annualAllocation.toLocaleString()} credits`} />
            <ReadField label="Cycle" value={cycle} />
          </div>
          <ReadField label="Footprint restriction" value={partner.footprint || '—'} />
          <p className="text-xs text-on-surface-variant">
            Allocation, tier, cycle, and footprint are set by the InnovateLocal hub team.
          </p>
        </div>

        {/* Authorized users */}
        <div className="flex flex-col gap-4 bg-surface p-7">
          <div className="font-label text-[9px] font-bold uppercase tracking-widest text-primary">
            Authorized users
          </div>
          <div className="flex flex-col divide-y divide-outline-variant/30">
            {members.map((m) => (
              <MemberRow key={m.membershipId} member={m} isAdmin={isAdmin} onToast={onToast} />
            ))}
            {members.length === 0 && (
              <p className="py-3 text-sm text-on-surface-variant">No authorized users yet.</p>
            )}
          </div>
          {isAdmin && <InviteMemberForm onToast={onToast} />}
        </div>
      </div>

      {/* Policies */}
      <section className="flex flex-col gap-5">
        <div>
          <div className="annotation">Policies</div>
          <h2 className="font-headline text-2xl text-on-surface">Approval rules.</h2>
        </div>
        <PoliciesForm partner={partner} isAdmin={isAdmin} onToast={onToast} />
      </section>
    </div>
  )
}

function ReadField({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-2">
      <span className={labelClass}>{label}</span>
      <div className="bg-surface-container-high p-4 text-on-surface">{value}</div>
    </div>
  )
}

function MemberRow({
  member,
  isAdmin,
  onToast,
}: {
  member: PartnerMemberRow
  isAdmin: boolean
  onToast: (s: string, m: string) => void
}) {
  const [isPending, startTransition] = useTransition()

  function changeRole(role: string) {
    startTransition(async () => {
      const res = await setPartnerMemberRoleAction(member.membershipId, role)
      if (res.ok) onToast('Role updated', `${member.fullName || member.email} is now ${PARTNER_ROLE_LABEL[role as PartnerRole]}.`)
      else onToast('Could not update', res.error)
    })
  }
  function remove() {
    startTransition(async () => {
      const res = await removePartnerMemberAction(member.membershipId)
      if (res.ok) onToast('User removed', `${member.fullName || member.email} removed.`)
      else onToast('Could not remove', res.error)
    })
  }

  return (
    <div className="flex items-center justify-between gap-3 py-3">
      <div>
        <div className="font-semibold text-on-surface">{member.fullName || member.email}</div>
        <div className="font-label text-[10px] uppercase tracking-wider text-on-surface-variant">
          {member.email}
        </div>
      </div>
      {isAdmin ? (
        <div className="flex items-center gap-2">
          <select
            value={member.partnerRole}
            onChange={(e) => changeRole(e.target.value)}
            disabled={isPending}
            className="bg-surface-container-high px-3 py-2 text-xs text-on-surface outline-none"
          >
            {PARTNER_ROLES.map((r) => (
              <option key={r} value={r}>
                {PARTNER_ROLE_LABEL[r]}
              </option>
            ))}
          </select>
          <button
            onClick={remove}
            disabled={isPending}
            className="font-label text-[10px] uppercase tracking-wider text-on-surface-variant hover:text-secondary"
          >
            Remove
          </button>
        </div>
      ) : (
        <Chip className="bg-surface-container-high text-on-surface-variant">
          {PARTNER_ROLE_LABEL[member.partnerRole]}
        </Chip>
      )}
    </div>
  )
}

function InviteMemberForm({ onToast }: { onToast: (s: string, m: string) => void }) {
  const formRef = useRef<HTMLFormElement>(null)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    setError(null)
    startTransition(async () => {
      const res = await invitePartnerMemberAction(fd)
      if (res.ok) {
        formRef.current?.reset()
        onToast('Invite sent', res.message ?? 'User added.')
      } else setError(res.error)
    })
  }

  return (
    <form ref={formRef} onSubmit={onSubmit} className="mt-2 flex flex-col gap-3 border-t border-outline-variant/30 pt-4">
      <div className="flex flex-col gap-2">
        <label className={labelClass}>Invite team member</label>
        <input name="email" type="email" required placeholder="name@org.com" disabled={isPending} className={inputClass} />
      </div>
      <div className="flex items-center gap-3">
        <select name="partnerRole" defaultValue="drafter" disabled={isPending} className={inputClass}>
          {PARTNER_ROLES.map((r) => (
            <option key={r} value={r}>
              {PARTNER_ROLE_LABEL[r]}
            </option>
          ))}
        </select>
        <button type="submit" disabled={isPending} className={primaryButtonClass}>
          {isPending ? 'Inviting…' : 'Invite'}
        </button>
      </div>
      <ErrorNote error={error} />
    </form>
  )
}

function PoliciesForm({
  partner,
  isAdmin,
  onToast,
}: {
  partner: PartnerContext
  isAdmin: boolean
  onToast: (s: string, m: string) => void
}) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    setError(null)
    startTransition(async () => {
      const res = await updatePoliciesAction(fd)
      if (res.ok) onToast('Policies updated', res.message ?? 'Saved.')
      else setError(res.error)
    })
  }

  return (
    <form onSubmit={onSubmit} className="grid grid-cols-1 gap-px border border-outline-variant/30 bg-outline-variant/30 lg:grid-cols-2">
      <div className="flex flex-col gap-4 bg-surface p-7">
        <div className="font-label text-[9px] font-bold uppercase tracking-widest text-primary">
          Single-transfer limits
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-2">
            <label className={labelClass}>Drafter up to</label>
            <input name="drafterLimit" type="number" min={0} defaultValue={partner.drafterLimit} disabled={!isAdmin || isPending} className={inputClass} />
          </div>
          <div className="flex flex-col gap-2">
            <label className={labelClass}>Approver up to</label>
            <input name="approverLimit" type="number" min={0} defaultValue={partner.approverLimit} disabled={!isAdmin || isPending} className={inputClass} />
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <label className={labelClass}>Dual sign-off at / above</label>
          <input name="dualSignoffThreshold" type="number" min={0} defaultValue={partner.dualSignoffThreshold} disabled={!isAdmin || isPending} className={inputClass} />
        </div>
      </div>
      <div className="flex flex-col gap-4 bg-surface p-7">
        <div className="font-label text-[9px] font-bold uppercase tracking-widest text-primary">Expiration</div>
        <div className="flex flex-col gap-2">
          <label className={labelClass}>Recipient redemption window (days)</label>
          <input name="redemptionWindowDays" type="number" min={1} defaultValue={partner.redemptionWindowDays} disabled={!isAdmin || isPending} className={inputClass} />
          <p className="text-xs text-on-surface-variant">
            Unused credits return to the balance after this window. New transfers use this window.
          </p>
        </div>
        {isAdmin && (
          <button type="submit" disabled={isPending} className={`${primaryButtonClass} mt-auto`}>
            {isPending ? 'Saving…' : 'Save policies'}
          </button>
        )}
        <ErrorNote error={error} />
      </div>
    </form>
  )
}

// ---------------------------------------------------------------------------
// Modals
// ---------------------------------------------------------------------------
function EngagementSelect({ name, disabled }: { name: string; disabled: boolean }) {
  return (
    <select name={name} defaultValue="" disabled={disabled} className={inputClass}>
      <option value="">Let the recipient choose</option>
      {ENGAGEMENT_TYPES.map((e) => (
        <option key={e.key} value={e.key}>
          {e.label}
          {e.credits != null ? ` · ${e.credits} cr` : ''}
        </option>
      ))}
    </select>
  )
}

function useModalAction(
  action: (fd: FormData) => Promise<ActionResult>,
  onDone: (message: string) => void,
) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    setError(null)
    startTransition(async () => {
      const res = await action(fd)
      if (res.ok) onDone(res.message ?? 'Done.')
      else setError(res.error)
    })
  }
  return { isPending, error, submit }
}

function AssignModal({
  available,
  onClose,
  onToast,
}: {
  available: number
  onClose: () => void
  onToast: (s: string, m: string) => void
}) {
  const [dept, setDept] = useState('')
  const [amount, setAmount] = useState('')
  const { isPending, error, submit } = useModalAction(assignInternalAction, (m) => {
    onToast('Assignment recorded', m)
    onClose()
  })
  const n = parseInt(amount, 10) || 0

  return (
    <ModalShell stamp="Assign internal" title="Assign credits to a department." onClose={onClose}>
      <form onSubmit={submit}>
        <div className="flex flex-col gap-5 px-6 py-6 sm:px-8">
          <div className="flex flex-col gap-2">
            <label className={labelClass}>Department</label>
            <input name="department" value={dept} onChange={(e) => setDept(e.target.value)} required placeholder="e.g. Commercial Lending" disabled={isPending} className={inputClass} />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <label className={labelClass}>Manager</label>
              <input name="managerName" placeholder="First Last" disabled={isPending} className={inputClass} />
            </div>
            <div className="flex flex-col gap-2">
              <label className={labelClass}>Manager email</label>
              <input name="managerEmail" type="email" placeholder="name@org.com" disabled={isPending} className={inputClass} />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <label className={labelClass}>Credits</label>
            <input name="amount" type="number" min={1} value={amount} onChange={(e) => setAmount(e.target.value)} required placeholder="e.g. 24" disabled={isPending} className={inputClass} />
            <p className="text-xs text-on-surface-variant">
              1 credit = 1 workshop seat · 4 = a sprint · 16 = a student-team prototype.
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <label className={labelClass}>Intended use (optional)</label>
            <EngagementSelect name="engagementKey" disabled={isPending} />
          </div>
          <div className="flex flex-col gap-2">
            <label className={labelClass}>Note for the manager (optional)</label>
            <textarea name="note" rows={2} placeholder="Included in the assignment email." disabled={isPending} className={inputClass} />
          </div>
          {n > 0 && (
            <div className="flex items-center justify-between bg-surface-container-low p-5">
              <div className="font-headline text-on-surface">
                Assign <strong className="text-tertiary">{n}</strong> credits to{' '}
                <strong className="text-tertiary">{dept || '—'}</strong>
              </div>
              <div className="font-headline text-3xl tabular-nums text-primary">{n}</div>
            </div>
          )}
          <ErrorNote error={error} />
        </div>
        <div className="flex items-center justify-between gap-3 bg-surface-container-low px-6 py-5 sm:px-8">
          <div className="text-xs text-on-surface-variant">
            Available · <strong className="font-headline text-lg text-on-surface">{available}</strong> credits
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="px-4 py-3 font-label text-xs uppercase tracking-widest text-on-surface-variant hover:text-on-surface">
              Cancel
            </button>
            <button type="submit" disabled={isPending} className={primaryButtonClass}>
              {isPending ? 'Recording…' : 'Confirm →'}
            </button>
          </div>
        </div>
      </form>
    </ModalShell>
  )
}

function TransferModal({
  available,
  onClose,
  onToast,
}: {
  available: number
  onClose: () => void
  onToast: (s: string, m: string) => void
}) {
  const [kind, setKind] = useState<string>('business')
  const [org, setOrg] = useState('')
  const [amount, setAmount] = useState('')
  const { isPending, error, submit } = useModalAction(transferExternalAction, (m) => {
    onToast('Transfer sent', m)
    onClose()
  })
  const n = parseInt(amount, 10) || 0

  return (
    <ModalShell stamp="Transfer external" title="Transfer credits to a regional organization." onClose={onClose}>
      <form onSubmit={submit}>
        <div className="flex flex-col gap-5 px-6 py-6 sm:px-8">
          <div className="flex flex-col gap-2">
            <label className={labelClass}>Recipient type</label>
            <RadioChips
              name="kind"
              value={kind}
              onChange={setKind}
              options={EXTERNAL_RECIPIENT_KINDS.map((k) => ({ value: k, label: RECIPIENT_KIND_LABEL[k] }))}
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className={labelClass}>Organization name</label>
            <input name="orgName" value={org} onChange={(e) => setOrg(e.target.value)} required placeholder="e.g. State College Borough" disabled={isPending} className={inputClass} />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <label className={labelClass}>Primary contact</label>
              <input name="contactName" placeholder="First Last" disabled={isPending} className={inputClass} />
            </div>
            <div className="flex flex-col gap-2">
              <label className={labelClass}>Contact email</label>
              <input name="contactEmail" type="email" placeholder="name@org.com" disabled={isPending} className={inputClass} />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <label className={labelClass}>Relationship manager</label>
              <input name="relationshipManager" placeholder="e.g. D. Pellicano" disabled={isPending} className={inputClass} />
            </div>
            <div className="flex flex-col gap-2">
              <label className={labelClass}>Credits</label>
              <input name="amount" type="number" min={1} value={amount} onChange={(e) => setAmount(e.target.value)} required placeholder="e.g. 16" disabled={isPending} className={inputClass} />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <label className={labelClass}>Suggested redemption</label>
            <EngagementSelect name="engagementKey" disabled={isPending} />
          </div>
          <div className="flex flex-col gap-2">
            <label className={labelClass}>Personal message (included in the transfer email)</label>
            <textarea name="message" rows={2} placeholder="A short note on why the credits are directed here." disabled={isPending} className={inputClass} />
          </div>
          {n > 0 && (
            <div className="flex items-center justify-between bg-surface-container-low p-5">
              <div>
                <div className="font-label text-[9px] font-bold uppercase tracking-widest text-primary">
                  Preview · transfer notice
                </div>
                <div className="mt-1 font-headline text-on-surface">
                  Transfer <strong className="text-tertiary">{n}</strong> credits to{' '}
                  <strong className="text-tertiary">{org || '—'}</strong>
                </div>
                <div className="mt-1 text-xs text-on-surface-variant">
                  Recipient is emailed a redemption code · notification CC: relationship manager
                </div>
              </div>
              <div className="font-headline text-3xl tabular-nums text-primary">{n}</div>
            </div>
          )}
          <ErrorNote error={error} />
        </div>
        <div className="flex items-center justify-between gap-3 bg-surface-container-low px-6 py-5 sm:px-8">
          <div className="text-xs text-on-surface-variant">
            Available · <strong className="font-headline text-lg text-on-surface">{available}</strong> credits
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="px-4 py-3 font-label text-xs uppercase tracking-widest text-on-surface-variant hover:text-on-surface">
              Cancel
            </button>
            <button type="submit" disabled={isPending} className={primaryButtonClass}>
              {isPending ? 'Sending…' : 'Send transfer →'}
            </button>
          </div>
        </div>
      </form>
    </ModalShell>
  )
}

function AdjustModal({
  target,
  available,
  onClose,
  onToast,
}: {
  target: { recipient: RecipientRow; mode: 'add' | 'reclaim' }
  available: number
  onClose: () => void
  onToast: (s: string, m: string) => void
}) {
  const [mode, setMode] = useState<'add' | 'reclaim'>(target.mode)
  const { recipient } = target
  const { isPending, error, submit } = useModalAction(adjustAllocationAction, (m) => {
    onToast(mode === 'add' ? 'Allocation increased' : 'Credits reclaimed', m)
    onClose()
  })

  return (
    <ModalShell
      stamp="Adjust"
      title={mode === 'reclaim' ? 'Reclaim unused credits.' : 'Add credits to allocation.'}
      onClose={onClose}
    >
      <form onSubmit={submit}>
        <input type="hidden" name="recipientId" value={recipient.id} />
        <input type="hidden" name="recipientKind" value={recipient.kind} />
        <input type="hidden" name="mode" value={mode} />
        <div className="flex flex-col gap-5 px-6 py-6 sm:px-8">
          <div className="flex flex-col gap-2">
            <label className={labelClass}>Action</label>
            <RadioChips
              name="modeDisplay"
              value={mode}
              onChange={(v) => setMode(v as 'add' | 'reclaim')}
              options={[
                { value: 'add', label: 'Add more' },
                { value: 'reclaim', label: 'Reclaim unused' },
              ]}
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className={labelClass}>Credits</label>
            <input name="amount" type="number" min={1} required placeholder="e.g. 8" disabled={isPending} className={inputClass} />
            <p className="text-xs text-on-surface-variant">
              {mode === 'reclaim'
                ? `Reclaimed credits return to the balance. ${recipient.remaining} unredeemed with ${recipient.name}.`
                : 'Added credits draw down the available balance.'}
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <label className={labelClass}>Reason (optional)</label>
            <textarea name="note" rows={2} placeholder="Logged to the ledger." disabled={isPending} className={inputClass} />
          </div>
          <ErrorNote error={error} />
        </div>
        <div className="flex items-center justify-between gap-3 bg-surface-container-low px-6 py-5 sm:px-8">
          <div className="text-xs text-on-surface-variant">
            Target · <strong className="text-on-surface">{recipient.name}</strong> ·{' '}
            {mode === 'add' ? `${available} available` : `${recipient.remaining} unredeemed`}
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="px-4 py-3 font-label text-xs uppercase tracking-widest text-on-surface-variant hover:text-on-surface">
              Cancel
            </button>
            <button type="submit" disabled={isPending} className={primaryButtonClass}>
              {isPending ? 'Working…' : 'Confirm →'}
            </button>
          </div>
        </div>
      </form>
    </ModalShell>
  )
}
