import Link from 'next/link'
import { notFound } from 'next/navigation'
import { eq } from 'drizzle-orm'
import { requireRole } from '@/lib/auth/session'
import { getDb } from '@/lib/db'
import { organizations } from '@/lib/db/schema'
import { getOrgBalance, getOrgMembers, getOrgProjects } from '@/lib/platform/credits'
import { PROJECT_STATUS_LABEL } from '@/lib/platform/project-status'
import { PageHeader } from '@/components/platform/PageHeader'
import { Metric, MetricGrid } from '@/components/platform/Metric'
import { OrgMembersPanel } from '@/components/platform/OrgMembersPanel'
import { AddMemberForm } from '@/components/platform/AddMemberForm'

export default async function OrganizationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  await requireRole('hub_staff')
  const { id } = await params

  const db = getDb()
  const [org] = await db.select().from(organizations).where(eq(organizations.id, id)).limit(1)
  if (!org) notFound()

  const [balance, members, projects] = await Promise.all([
    getOrgBalance(id),
    getOrgMembers(id),
    getOrgProjects(id),
  ])

  const meta = [org.orgType, org.location, org.industry, org.size].filter(Boolean).join(' · ')

  return (
    <div className="flex flex-col gap-10">
      <div>
        <Link
          href="/dashboard/organizations"
          className="font-label text-xs uppercase tracking-widest text-on-surface-variant hover:text-primary transition-colors"
        >
          ← Organizations
        </Link>
        <div className="mt-4">
          <PageHeader eyebrow={meta || 'Organization'} title={org.name} />
        </div>
      </div>

      <MetricGrid>
        <Metric tone="primary" label="Available credits" value={balance.available.toLocaleString()} sub={`of ${balance.granted.toLocaleString()} allocated`} />
        <Metric label="People" value={members.length} sub={`${members.filter((m) => m.roleInOrg === 'admin').length} admins`} />
        <Metric label="Projects" value={projects.length} sub={`${projects.filter((p) => p.status === 'active').length} active`} />
        <Metric label="Put to work" value={(balance.spent + balance.transferredOut).toLocaleString()} sub="Spent + transferred" />
      </MetricGrid>

      <div className="flex flex-wrap gap-x-6 gap-y-2">
        <Link href="/dashboard/credits" className="font-label text-xs uppercase tracking-widest text-primary hover:text-primary-container transition-colors">
          Allocate credits →
        </Link>
      </div>

      <section className="flex flex-col gap-4">
        <h2 className="font-headline text-2xl text-on-surface">
          Members <span className="text-on-surface-variant">({members.length})</span>
        </h2>
        <OrgMembersPanel orgId={org.id} members={members} canManage />
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="font-headline text-2xl text-on-surface">
          Projects <span className="text-on-surface-variant">({projects.length})</span>
        </h2>
        {projects.length === 0 ? (
          <p className="font-body text-on-surface-variant">No projects yet.</p>
        ) : (
          <ul className="flex flex-col gap-px border border-outline-variant/30 bg-outline-variant/30">
            {projects.map((p) => (
              <li key={p.id}>
                <Link href={`/dashboard/projects/${p.id}`} className="flex items-center justify-between gap-4 bg-surface px-5 py-4 hover:bg-surface-container-low transition-colors">
                  <span className="flex flex-col">
                    <span className="font-body text-on-surface">{p.title}</span>
                    {p.creditsSpent > 0 && (
                      <span className="font-label text-xs text-on-surface-variant tabular-nums">{p.creditsSpent} credits committed</span>
                    )}
                  </span>
                  <span className="font-label text-[10px] uppercase tracking-widest text-on-tertiary-container bg-tertiary-container px-3 py-1">
                    {PROJECT_STATUS_LABEL[p.status]}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-4 border-t border-outline-variant/30 pt-8">
        <AddMemberForm orgId={org.id} />
      </section>
    </div>
  )
}
