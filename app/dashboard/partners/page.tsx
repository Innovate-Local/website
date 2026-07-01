import Link from 'next/link'
import { requireRole } from '@/lib/auth/session'
import { listOrgsWithoutPartner, listPartners } from '@/lib/platform/partners'
import { PageHeader } from '@/components/platform/PageHeader'
import { Metric, MetricGrid } from '@/components/platform/Metric'
import { CreatePartnerForm } from '@/components/platform/partner/CreatePartnerForm'

// Staff console: every Community Innovation Partner + create flow.
export default async function PartnersPage() {
  await requireRole('hub_staff')
  const [partners, orgs] = await Promise.all([listPartners(), listOrgsWithoutPartner()])

  const totalAllocation = partners.reduce((s, p) => s + p.annualAllocation, 0)
  const totalCommitted = partners.reduce((s, p) => s + p.committed, 0)

  return (
    <div className="flex flex-col gap-10">
      <PageHeader eyebrow="Community Innovation Partners" title="Partners" />

      <MetricGrid>
        <Metric tone="primary" label="Partners" value={partners.length} sub="Enrolled organizations" />
        <Metric label="Total allocation" value={totalAllocation.toLocaleString()} sub="Credits this cycle" />
        <Metric label="Committed" value={totalCommitted.toLocaleString()} sub="Assigned + transferred" />
        <Metric label="Available" value={(totalAllocation - totalCommitted).toLocaleString()} sub="Across all partners" />
      </MetricGrid>

      <section className="flex flex-col gap-4">
        <h2 className="font-headline text-2xl text-on-surface">Enrolled partners</h2>
        <div className="overflow-x-auto border border-outline-variant/30">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-surface-container-high text-left">
                <th className="px-5 py-3 font-label text-xs font-semibold uppercase tracking-widest text-on-surface-variant">Partner</th>
                <th className="px-5 py-3 font-label text-xs font-semibold uppercase tracking-widest text-on-surface-variant">Tier</th>
                <th className="px-5 py-3 font-label text-xs font-semibold uppercase tracking-widest text-on-surface-variant">Users</th>
                <th className="px-5 py-3 text-right font-label text-xs font-semibold uppercase tracking-widest text-on-surface-variant">Allocation</th>
                <th className="px-5 py-3 text-right font-label text-xs font-semibold uppercase tracking-widest text-on-surface-variant">Committed</th>
                <th className="px-5 py-3 text-right font-label text-xs font-semibold uppercase tracking-widest text-on-surface-variant">Available</th>
              </tr>
            </thead>
            <tbody>
              {partners.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-on-surface-variant">
                    No partners yet. Designate one below.
                  </td>
                </tr>
              ) : (
                partners.map((p) => (
                  <tr key={p.id} className="border-t border-outline-variant/30 even:bg-surface-container-low/40">
                    <td className="px-5 py-3">
                      <Link href={`/dashboard/partners/${p.id}`} className="font-medium text-on-surface hover:text-primary">
                        {p.orgName}
                      </Link>
                    </td>
                    <td className="px-5 py-3 text-on-surface-variant">{p.tier}</td>
                    <td className="px-5 py-3 text-on-surface-variant">{p.memberCount}</td>
                    <td className="px-5 py-3 text-right tabular-nums text-on-surface-variant">{p.annualAllocation.toLocaleString()}</td>
                    <td className="px-5 py-3 text-right tabular-nums text-on-surface-variant">{p.committed.toLocaleString()}</td>
                    <td className="px-5 py-3 text-right font-semibold tabular-nums text-on-surface">{p.available.toLocaleString()}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <CreatePartnerForm orgs={orgs} />
    </div>
  )
}
