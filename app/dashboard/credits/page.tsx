import Link from 'next/link'
import { redirect } from 'next/navigation'
import { requireProfile, getUser } from '@/lib/auth/session'
import {
  getOrgBalance,
  getOrgLedger,
  getOrgProjects,
  getPrimaryOrgForUser,
  getProgramTotals,
  listOrgCreditSummaries,
  listOtherOrgs,
} from '@/lib/platform/credits'
import { ORG_ROLE_LABEL } from '@/lib/platform/roles'
import { ENGAGEMENT_TYPES } from '@/lib/platform/engagement-types'
import { PageHeader } from '@/components/platform/PageHeader'
import { Metric, MetricGrid } from '@/components/platform/Metric'
import { LedgerTable } from '@/components/platform/LedgerTable'
import { GrantCreditsForm } from '@/components/platform/GrantCreditsForm'
import { OrgCreditActions } from '@/components/platform/OrgCreditActions'

export default async function CreditsPage() {
  const profile = await requireProfile()
  if (profile.role === 'apprentice') redirect('/dashboard')

  if (profile.role === 'hub_staff') return <StaffConsole />
  const user = await getUser()
  return <OrgPortal userId={user?.id ?? ''} />
}

// ---- Hub staff: allocation console across every organization ----------------
async function StaffConsole() {
  const [totals, summaries] = await Promise.all([getProgramTotals(), listOrgCreditSummaries()])

  return (
    <div className="flex flex-col gap-10">
      <PageHeader
        eyebrow="Innovation Credits"
        title="Allocation console"
      />
      <p className="-mt-4 max-w-2xl font-body text-on-surface-variant">
        Allocate credits to organizations, then watch how each one spends them on projects or
        transfers them across the network.
      </p>

      <MetricGrid>
        <Metric tone="primary" label="Available across network" value={totals.available.toLocaleString()} sub={`${totals.orgCount} organizations`} />
        <Metric label="Total allocated" value={totals.granted.toLocaleString()} sub="Granted to organizations" />
        <Metric label="Put to work" value={totals.committed.toLocaleString()} sub="Spent on projects + transferred" />
        <Metric label="Organizations" value={totals.orgCount.toLocaleString()} sub="In the network" />
      </MetricGrid>

      <GrantCreditsForm orgs={summaries.map((s) => ({ id: s.id, name: s.name }))} />

      <section className="flex flex-col gap-4">
        <h2 className="font-headline text-2xl text-on-surface">Organizations</h2>
        <div className="overflow-x-auto border border-outline-variant/30">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-surface-container-high text-left">
                <th className="px-5 py-3 font-label text-xs font-semibold uppercase tracking-widest text-on-surface-variant">Organization</th>
                <th className="px-5 py-3 font-label text-xs font-semibold uppercase tracking-widest text-on-surface-variant">Members</th>
                <th className="px-5 py-3 text-right font-label text-xs font-semibold uppercase tracking-widest text-on-surface-variant">Allocated</th>
                <th className="px-5 py-3 text-right font-label text-xs font-semibold uppercase tracking-widest text-on-surface-variant">Used</th>
                <th className="px-5 py-3 text-right font-label text-xs font-semibold uppercase tracking-widest text-on-surface-variant">Available</th>
              </tr>
            </thead>
            <tbody>
              {summaries.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-on-surface-variant">
                    No organizations yet.
                  </td>
                </tr>
              ) : (
                summaries.map((s) => (
                  <tr key={s.id} className="border-t border-outline-variant/30 even:bg-surface-container-low/40">
                    <td className="px-5 py-3">
                      <Link href={`/dashboard/organizations/${s.id}`} className="font-medium text-on-surface hover:text-primary transition-colors">
                        {s.name}
                      </Link>
                      {s.orgType && (
                        <span className="ml-2 font-label text-[10px] uppercase tracking-widest text-on-surface-variant">{s.orgType}</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-on-surface-variant">{s.memberCount}</td>
                    <td className="px-5 py-3 text-right tabular-nums text-on-surface-variant">{s.granted}</td>
                    <td className="px-5 py-3 text-right tabular-nums text-on-surface-variant">{s.committed}</td>
                    <td className="px-5 py-3 text-right font-semibold tabular-nums text-on-surface">{s.available}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

// ---- Org member: their organization's credit position ----------------------
async function OrgPortal({ userId }: { userId: string }) {
  const org = userId ? await getPrimaryOrgForUser(userId) : null

  if (!org) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader eyebrow="Innovation Credits" title="Credits" />
        <p className="bg-surface-container-low p-8 font-body text-on-surface-variant">
          You’re not part of an organization yet. Once your hub team adds you to one, your credit
          balance and activity will appear here.
        </p>
      </div>
    )
  }

  const isAdmin = org.roleInOrg === 'admin'
  const [balance, ledger, orgProjects, otherOrgs] = await Promise.all([
    getOrgBalance(org.orgId),
    getOrgLedger(org.orgId),
    isAdmin ? getOrgProjects(org.orgId) : Promise.resolve([]),
    isAdmin ? listOtherOrgs(org.orgId) : Promise.resolve([]),
  ])

  return (
    <div className="flex flex-col gap-10">
      <PageHeader eyebrow={`${org.name} · Innovation Credits`} title="Credits" />

      <MetricGrid>
        <Metric tone="primary" label="Available" value={balance.available.toLocaleString()} sub="Ready to spend or transfer" />
        <Metric label="Allocated" value={balance.granted.toLocaleString()} sub="Granted by the hub" />
        <Metric label="Spent on projects" value={balance.spent.toLocaleString()} sub="Committed to engagements" />
        <Metric label="Transferred out" value={balance.transferredOut.toLocaleString()} sub={balance.transferredIn > 0 ? `${balance.transferredIn} received` : 'To other organizations'} />
      </MetricGrid>

      {isAdmin ? (
        <section className="flex flex-col gap-4">
          <h2 className="font-headline text-2xl text-on-surface">Move credits</h2>
          <OrgCreditActions
            orgId={org.orgId}
            available={balance.available}
            projects={orgProjects.map((p) => ({ id: p.id, title: p.title }))}
            otherOrgs={otherOrgs}
          />
        </section>
      ) : (
        <p className="bg-surface-container-low p-6 font-body text-on-surface-variant">
          Your organization’s admins assign and transfer credits. You can see the full balance and
          activity here.
        </p>
      )}

      <section className="flex flex-col gap-4">
        <h2 className="font-headline text-2xl text-on-surface">Activity</h2>
        <LedgerTable entries={ledger} />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-headline text-2xl text-on-surface">Engagement rates</h2>
        <ul className="flex flex-col gap-px border border-outline-variant/30 bg-outline-variant/30">
          {ENGAGEMENT_TYPES.filter((e) => e.credits != null).map((e) => (
            <li key={e.key} className="flex items-center justify-between gap-4 bg-surface px-5 py-3">
              <span className="font-body text-on-surface">{e.label}</span>
              <span className="font-label text-xs uppercase tracking-widest text-on-surface-variant tabular-nums">
                {e.credits} {e.credits === 1 ? 'credit' : 'credits'}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
