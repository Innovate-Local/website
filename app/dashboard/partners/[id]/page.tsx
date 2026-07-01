import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireRole } from '@/lib/auth/session'
import {
  PARTNER_ROLE_LABEL,
  getPartnerById,
  getPartnerOverview,
  listLedger,
  listPartnerMembers,
  listRecipients,
} from '@/lib/platform/partners'
import { RECIPIENT_KIND_LABEL } from '@/lib/platform/partner-constants'
import { PageHeader } from '@/components/platform/PageHeader'
import { Metric, MetricGrid } from '@/components/platform/Metric'
import { EditPartnerForm } from '@/components/platform/partner/CreatePartnerForm'

// Staff detail: a single partner's position + config + authorized users. Partner
// admins run day-to-day operations from /dashboard/partner; staff configure here.
export default async function PartnerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireRole('hub_staff')
  const { id } = await params
  const partner = await getPartnerById(id)
  if (!partner) notFound()

  const [overview, recipients, ledger, members] = await Promise.all([
    getPartnerOverview(partner.partnerId, partner.annualAllocation),
    listRecipients(partner.partnerId),
    listLedger(partner.partnerId, 20),
    listPartnerMembers(partner.partnerId),
  ])

  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-col gap-2">
        <Link href="/dashboard/partners" className="font-label text-xs uppercase tracking-widest text-on-surface-variant hover:text-primary">
          ← All partners
        </Link>
        <PageHeader eyebrow={`Partner · ${partner.tier}`} title={partner.orgName} />
      </div>

      <MetricGrid>
        <Metric tone="primary" label="Available" value={overview.available.toLocaleString()} sub={`of ${overview.annualAllocation.toLocaleString()} allocation`} />
        <Metric label="Assigned · internal" value={overview.internalAssigned.toLocaleString()} sub={`${overview.internalDeptCount} departments`} />
        <Metric label="Transferred · external" value={overview.externalTransferred.toLocaleString()} sub={`${overview.externalOrgCount} recipients`} />
        <Metric label="Redeemed" value={overview.redeemed.toLocaleString()} sub={`${overview.redemptionRate}% rate`} />
      </MetricGrid>

      <div className="grid grid-cols-1 gap-px border border-outline-variant/30 bg-outline-variant/30 lg:grid-cols-2">
        <EditPartnerForm
          partnerId={partner.partnerId}
          tier={partner.tier}
          annualAllocation={partner.annualAllocation}
          cycleStart={partner.cycleStart}
          cycleEnd={partner.cycleEnd}
          footprint={partner.footprint}
        />
        <div className="flex flex-col gap-4 bg-surface p-7">
          <div className="font-label text-[9px] font-bold uppercase tracking-widest text-primary">
            Authorized users
          </div>
          <div className="flex flex-col divide-y divide-outline-variant/30">
            {members.length === 0 ? (
              <p className="py-3 text-sm text-on-surface-variant">No authorized users yet.</p>
            ) : (
              members.map((m) => (
                <div key={m.membershipId} className="flex items-center justify-between gap-3 py-3">
                  <div>
                    <div className="font-semibold text-on-surface">{m.fullName || m.email}</div>
                    <div className="font-label text-[10px] uppercase tracking-wider text-on-surface-variant">{m.email}</div>
                  </div>
                  <span className="font-label text-[10px] uppercase tracking-wider text-on-surface-variant">
                    {PARTNER_ROLE_LABEL[m.partnerRole]}
                  </span>
                </div>
              ))
            )}
          </div>
          <p className="text-xs text-on-surface-variant">
            Program Admins manage authorized users and policies from their partner console.
          </p>
        </div>
      </div>

      <section className="flex flex-col gap-4">
        <h2 className="font-headline text-2xl text-on-surface">Recipients</h2>
        <div className="overflow-x-auto border border-outline-variant/30">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-surface-container-high text-left">
                <th className="px-5 py-3 font-label text-xs font-semibold uppercase tracking-widest text-on-surface-variant">Recipient</th>
                <th className="px-5 py-3 font-label text-xs font-semibold uppercase tracking-widest text-on-surface-variant">Type</th>
                <th className="px-5 py-3 text-right font-label text-xs font-semibold uppercase tracking-widest text-on-surface-variant">Assigned</th>
                <th className="px-5 py-3 text-right font-label text-xs font-semibold uppercase tracking-widest text-on-surface-variant">Redeemed</th>
                <th className="px-5 py-3 text-right font-label text-xs font-semibold uppercase tracking-widest text-on-surface-variant">Remaining</th>
              </tr>
            </thead>
            <tbody>
              {recipients.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-on-surface-variant">No recipients yet.</td>
                </tr>
              ) : (
                recipients.map((r) => (
                  <tr key={r.id} className="border-t border-outline-variant/30 even:bg-surface-container-low/40">
                    <td className="px-5 py-3 font-medium text-on-surface">{r.name}</td>
                    <td className="px-5 py-3 text-on-surface-variant">{RECIPIENT_KIND_LABEL[r.kind]}</td>
                    <td className="px-5 py-3 text-right tabular-nums text-on-surface-variant">{r.assigned}</td>
                    <td className="px-5 py-3 text-right tabular-nums text-on-surface-variant">{r.redeemed}</td>
                    <td className="px-5 py-3 text-right font-semibold tabular-nums text-on-surface">{r.remaining}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {ledger.length > 0 && (
        <section className="flex flex-col gap-4">
          <h2 className="font-headline text-2xl text-on-surface">Recent activity</h2>
          <div className="overflow-x-auto border border-outline-variant/30">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-surface-container-high text-left">
                  <th className="px-5 py-3 font-label text-xs font-semibold uppercase tracking-widest text-on-surface-variant">Date</th>
                  <th className="px-5 py-3 font-label text-xs font-semibold uppercase tracking-widest text-on-surface-variant">Counterparty</th>
                  <th className="px-5 py-3 font-label text-xs font-semibold uppercase tracking-widest text-on-surface-variant">Action</th>
                  <th className="px-5 py-3 text-right font-label text-xs font-semibold uppercase tracking-widest text-on-surface-variant">Credits</th>
                </tr>
              </thead>
              <tbody>
                {ledger.map((l) => (
                  <tr key={l.id} className="border-t border-outline-variant/30 even:bg-surface-container-low/40">
                    <td className="whitespace-nowrap px-5 py-3 text-on-surface-variant">
                      {new Date(l.eventDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                    <td className="px-5 py-3 text-on-surface">{l.recipientName || '—'}</td>
                    <td className="px-5 py-3 text-on-surface-variant capitalize">{l.eventType}</td>
                    <td className="px-5 py-3 text-right tabular-nums text-on-surface-variant">{l.amount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  )
}
