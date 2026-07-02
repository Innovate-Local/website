import Link from 'next/link'
import { requireProfile } from '@/lib/auth/session'
import {
  getOrgBalance,
  getOrgMembers,
  getOrgProjects,
  resolveViewerOrg,
} from '@/lib/platform/credits'
import { PROJECT_STATUS_LABEL } from '@/lib/platform/project-status'
import { listOrgRequests, REQUEST_STATUS_LABEL } from '@/lib/platform/project-requests'
import { PageHeader } from '@/components/platform/PageHeader'
import { Metric, MetricGrid } from '@/components/platform/Metric'
import { OrgMembersPanel } from '@/components/platform/OrgMembersPanel'
import { AddMemberForm } from '@/components/platform/AddMemberForm'
import { OrgProjectCreateForm } from '@/components/platform/OrgProjectCreateForm'
import { ProjectRequestForm } from '@/components/platform/ProjectRequestForm'

// The org member's view of their own organization: structure, people, credit
// position, and the projects it's running. Admins can manage the team here.
export default async function OrganizationPage() {
  const profile = await requireProfile()
  const org = await resolveViewerOrg(profile.id)

  if (!org) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader eyebrow="Organization" title="Your organization" />
        <p className="bg-surface-container-low p-8 font-body text-on-surface-variant">
          You’re not part of an organization yet. Once your hub team adds you to one, it will show
          up here.
        </p>
      </div>
    )
  }

  const isAdmin = org.roleInOrg === 'admin'
  const [balance, members, projects, requests] = await Promise.all([
    getOrgBalance(org.orgId),
    getOrgMembers(org.orgId),
    getOrgProjects(org.orgId),
    listOrgRequests(org.orgId),
  ])
  const openRequests = requests.filter((r) => r.status === 'open')
  const meta = [org.orgType, org.location, org.industry, org.size].filter(Boolean).join(' · ')

  return (
    <div className="flex flex-col gap-10">
      <PageHeader eyebrow={meta || 'Organization'} title={org.name} />

      <MetricGrid>
        <Metric tone="primary" label="Available credits" value={balance.available.toLocaleString()} sub={`of ${balance.granted.toLocaleString()} allocated`} />
        <Metric label="People" value={members.length} sub={`${members.filter((m) => m.roleInOrg === 'admin').length} admins`} />
        <Metric label="Projects" value={projects.length} sub={`${projects.filter((p) => p.status === 'active').length} active`} />
        <Metric label="Spent on projects" value={balance.spent.toLocaleString()} sub="Credits committed" />
      </MetricGrid>

      {/* People + hierarchy */}
      <section className="flex flex-col gap-4">
        <div className="flex items-end justify-between gap-4">
          <h2 className="font-headline text-2xl text-on-surface">
            People <span className="text-on-surface-variant">({members.length})</span>
          </h2>
          <Link href="/dashboard/credits" className="font-label text-xs uppercase tracking-widest text-primary hover:text-primary-container transition-colors">
            Credits & activity →
          </Link>
        </div>
        <OrgMembersPanel orgId={org.orgId} members={members} canManage={isAdmin} />
      </section>

      {/* Projects */}
      <section className="flex flex-col gap-4">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 className="font-headline text-2xl text-on-surface">
            Projects <span className="text-on-surface-variant">({projects.length})</span>
          </h2>
          {/* Admins create directly or describe with MatchCore; members request. */}
          {isAdmin ? (
            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="/dashboard/projects/describe"
                className="bg-primary hover:bg-primary-container text-on-primary font-label text-sm uppercase tracking-widest font-bold py-4 px-8 transition-colors"
              >
                ✦ Describe with MatchCore
              </Link>
              <OrgProjectCreateForm />
            </div>
          ) : (
            <ProjectRequestForm />
          )}
        </div>
        {projects.length === 0 ? (
          <p className="bg-surface-container-low p-8 font-body text-on-surface-variant">
            {isAdmin
              ? 'No projects yet. Create your first one above.'
              : 'No projects yet. Request one above, or your hub team will scope projects with your organization.'}
          </p>
        ) : (
          <ul className="flex flex-col gap-px border border-outline-variant/30 bg-outline-variant/30">
            {projects.map((p) => (
              <li key={p.id}>
                <Link href={`/dashboard/projects/${p.id}`} className="flex items-center justify-between gap-4 bg-surface px-5 py-4 hover:bg-surface-container-low transition-colors">
                  <span className="flex flex-col">
                    <span className="font-body text-on-surface">{p.title}</span>
                    {p.creditsSpent > 0 && (
                      <span className="font-label text-xs text-on-surface-variant tabular-nums">
                        {p.creditsSpent} credits committed
                      </span>
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

      {/* Project requests (members propose; staff review) */}
      {requests.length > 0 && (
        <section className="flex flex-col gap-4">
          <h2 className="font-headline text-2xl text-on-surface">
            Project requests <span className="text-on-surface-variant">({openRequests.length} open)</span>
          </h2>
          <ul className="flex flex-col gap-px border border-outline-variant/30 bg-outline-variant/30">
            {requests.map((r) => (
              <li key={r.id} className="flex flex-col gap-1 bg-surface px-5 py-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <span className="flex min-w-0 flex-col">
                    <span className="font-body text-on-surface">
                      {r.projectId ? (
                        <Link href={`/dashboard/projects/${r.projectId}`} className="hover:text-primary transition-colors">
                          {r.title}
                        </Link>
                      ) : (
                        r.title
                      )}
                    </span>
                    {r.submittedByName && (
                      <span className="font-label text-xs uppercase tracking-widest text-on-surface-variant">
                        by {r.submittedByName}
                      </span>
                    )}
                  </span>
                  <span className="font-label text-[10px] uppercase tracking-widest text-on-tertiary-container bg-tertiary-container px-3 py-1">
                    {REQUEST_STATUS_LABEL[r.status]}
                  </span>
                </div>
                {r.summary && <p className="font-body text-sm text-on-surface-variant">{r.summary}</p>}
                {r.status === 'declined' && r.declineReason && (
                  <p className="font-body text-sm text-on-surface-variant">Reason: {r.declineReason}</p>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Invite (admins only) */}
      {isAdmin && (
        <section className="flex flex-col gap-4 border-t border-outline-variant/30 pt-8">
          <h2 className="font-headline text-2xl text-on-surface">Add a teammate</h2>
          <AddMemberForm orgId={org.orgId} />
        </section>
      )}
    </div>
  )
}
