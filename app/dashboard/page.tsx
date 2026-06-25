import Link from 'next/link'
import { requireProfile } from '@/lib/auth/session'
import { ROLE_TAGLINE } from '@/lib/platform/roles'
import { listProjectsForUser, listApprentices, PROJECT_STATUS_LABEL } from '@/lib/platform/projects'
import {
  getPrimaryOrgForUser,
  getOrgBalance,
  getOrgProjects,
  getProgramTotals,
} from '@/lib/platform/credits'
import { Metric, MetricGrid } from '@/components/platform/Metric'
import type { Profile } from '@/lib/db/schema'

// Role-routed home. Each role lands on a screen built from its own data — an
// apprentice sees their projects, an org member sees their credit position, a
// staff member sees the program at a glance.
export default async function DashboardHome() {
  const profile = await requireProfile()
  const firstName = profile.fullName?.split(' ')[0]

  return (
    <div className="flex flex-col gap-10">
      <header className="flex flex-col gap-3">
        <span className="annotation">{ROLE_TAGLINE[profile.role]}</span>
        <h1 className="font-headline text-5xl md:text-6xl leading-[0.95] tracking-tight text-on-surface">
          {firstName ? `Welcome, ${firstName}.` : 'Welcome.'}
        </h1>
      </header>

      {profile.role === 'apprentice' && <ApprenticeHome profile={profile} />}
      {profile.role === 'org_member' && <OrgMemberHome profile={profile} />}
      {profile.role === 'hub_staff' && <StaffHome />}
    </div>
  )
}

function QuickLinks({ links }: { links: { href: string; label: string }[] }) {
  return (
    <div className="flex flex-wrap gap-x-6 gap-y-2">
      {links.map((l) => (
        <Link
          key={l.href}
          href={l.href}
          className="font-label text-xs uppercase tracking-widest text-primary hover:text-primary-container transition-colors"
        >
          {l.label} →
        </Link>
      ))}
    </div>
  )
}

// ---- Apprentice -------------------------------------------------------------
async function ApprenticeHome({ profile }: { profile: Profile }) {
  const projects = await listProjectsForUser(profile, profile.id)
  const active = projects.filter((p) => p.status === 'active').length

  return (
    <>
      <MetricGrid>
        <Metric tone="primary" label="Your projects" value={projects.length} sub={`${active} active right now`} />
        <Metric label="Delivered" value={projects.filter((p) => p.status === 'delivered' || p.status === 'closed').length} sub="Completed engagements" />
        <Metric label="In scoping" value={projects.filter((p) => p.status === 'intake' || p.status === 'scoping').length} sub="Being shaped" />
      </MetricGrid>

      <section className="flex flex-col gap-4">
        <div className="flex items-end justify-between">
          <h2 className="font-headline text-2xl text-on-surface">Your projects</h2>
          <QuickLinks links={[{ href: '/dashboard/resume', label: 'Manage resume' }]} />
        </div>
        {projects.length === 0 ? (
          <p className="bg-surface-container-low p-8 font-body text-on-surface-variant">
            You’re not assigned to any projects yet. Your hub team will add you to one soon.
          </p>
        ) : (
          <ul className="flex flex-col gap-px border border-outline-variant/30 bg-outline-variant/30">
            {projects.map((p) => (
              <li key={p.id}>
                <Link href={`/dashboard/projects/${p.id}`} className="flex items-center justify-between gap-4 bg-surface px-5 py-4 hover:bg-surface-container-low transition-colors">
                  <span className="flex flex-col">
                    <span className="font-body text-on-surface">{p.title}</span>
                    <span className="font-label text-xs text-on-surface-variant">{p.orgName ?? 'Unassigned organization'}</span>
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
    </>
  )
}

// ---- Org member -------------------------------------------------------------
async function OrgMemberHome({ profile }: { profile: Profile }) {
  const org = await getPrimaryOrgForUser(profile.id)

  if (!org) {
    return (
      <section className="bg-surface-container-low p-8 md:p-10 flex flex-col gap-4">
        <h2 className="font-headline text-2xl text-on-surface">Your workspace</h2>
        <p className="font-body text-on-surface-variant leading-relaxed">
          You’re not part of an organization yet. Once your hub team adds you to one, your credits,
          team, and projects will show up here.
        </p>
      </section>
    )
  }

  const [balance, orgProjects] = await Promise.all([
    getOrgBalance(org.orgId),
    getOrgProjects(org.orgId),
  ])
  const activeProjects = orgProjects.filter((p) => p.status === 'active').length

  return (
    <>
      <p className="-mt-4 font-body text-on-surface-variant">
        {org.name} · <span className="uppercase tracking-widest text-xs">{org.roleInOrg}</span>
      </p>

      <MetricGrid>
        <Metric tone="primary" label="Available credits" value={balance.available.toLocaleString()} sub={`of ${balance.granted.toLocaleString()} allocated`} />
        <Metric label="Spent on projects" value={balance.spent.toLocaleString()} sub="Committed to engagements" />
        <Metric label="Projects" value={orgProjects.length} sub={`${activeProjects} active`} />
        <Metric label="Transferred out" value={balance.transferredOut.toLocaleString()} sub="To other organizations" />
      </MetricGrid>

      <section className="bg-surface-container-low p-8 flex flex-col gap-4">
        <h2 className="font-headline text-2xl text-on-surface">Your organization’s workspace</h2>
        <p className="font-body text-on-surface-variant leading-relaxed">
          Track your Innovation Credits, follow the projects your hub team is running, and manage
          your organization’s people.
        </p>
        <QuickLinks
          links={[
            { href: '/dashboard/credits', label: 'Credits & activity' },
            { href: '/dashboard/organization', label: 'Your organization' },
            { href: '/dashboard/projects', label: 'Your projects' },
          ]}
        />
      </section>
    </>
  )
}

// ---- Hub staff --------------------------------------------------------------
async function StaffHome() {
  const profile = await requireProfile()
  const [totals, allProjects, apprentices] = await Promise.all([
    getProgramTotals(),
    listProjectsForUser(profile, profile.id),
    listApprentices(),
  ])
  const activeProjects = allProjects.filter((p) => p.status === 'active').length

  return (
    <>
      <MetricGrid>
        <Metric tone="primary" label="Credits available" value={totals.available.toLocaleString()} sub={`across ${totals.orgCount} organizations`} />
        <Metric label="Active projects" value={activeProjects} sub={`${allProjects.length} total`} />
        <Metric label="Apprentices" value={apprentices.length} sub="On the platform" />
        <Metric label="Credits put to work" value={totals.committed.toLocaleString()} sub="Spent + transferred" />
      </MetricGrid>

      <section className="bg-surface-container-low p-8 flex flex-col gap-4">
        <h2 className="font-headline text-2xl text-on-surface">Hub operations</h2>
        <p className="font-body text-on-surface-variant leading-relaxed">
          Scope projects from organizations, assign apprentice teams, allocate Innovation Credits,
          and move engagements through to delivery.
        </p>
        <QuickLinks
          links={[
            { href: '/dashboard/projects', label: 'Manage projects' },
            { href: '/dashboard/credits', label: 'Allocate credits' },
            { href: '/dashboard/people', label: 'Manage people' },
            { href: '/dashboard/organizations', label: 'Manage organizations' },
          ]}
        />
      </section>
    </>
  )
}
