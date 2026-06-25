import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireProfile, getUser } from '@/lib/auth/session'
import {
  getProjectForUser,
  getProjectTeam,
  listApprentices,
  PROJECT_STATUS_LABEL,
  type ProjectStatus,
} from '@/lib/platform/projects'
import { getProjectCreditsSpent } from '@/lib/platform/credits'
import { PageHeader } from '@/components/platform/PageHeader'
import { ProjectStatusControl } from '@/components/platform/ProjectStatusControl'
import { ProjectTeam } from '@/components/platform/ProjectTeam'

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const profile = await requireProfile()
  const user = await getUser()
  const { id } = await params

  const project = user ? await getProjectForUser(id, profile, user.id) : null
  if (!project) notFound()

  const team = await getProjectTeam(id)
  const creditsSpent = await getProjectCreditsSpent(id)
  const isStaff = profile.role === 'hub_staff'

  return (
    <div className="flex flex-col gap-10">
      <div>
        <Link
          href="/dashboard/projects"
          className="font-label text-xs uppercase tracking-widest text-on-surface-variant hover:text-primary transition-colors"
        >
          ← Projects
        </Link>
        <div className="mt-4">
          <PageHeader eyebrow={project.orgName ?? 'Unassigned organization'} title={project.title} />
        </div>
      </div>

      {/* Status */}
      <section className="flex flex-col gap-4">
        <h2 className="font-headline text-2xl text-on-surface">Status</h2>
        {isStaff ? (
          <ProjectStatusControl projectId={project.id} status={project.status as ProjectStatus} />
        ) : (
          <span className="self-start font-label text-[10px] uppercase tracking-widest text-on-tertiary-container bg-tertiary-container px-3 py-1">
            {PROJECT_STATUS_LABEL[project.status as ProjectStatus]}
          </span>
        )}
      </section>

      {/* Credits committed */}
      <section className="flex flex-col gap-3">
        <h2 className="font-headline text-2xl text-on-surface">Credits committed</h2>
        <p className="font-body text-on-surface-variant">
          {creditsSpent > 0 ? (
            <>
              <span className="font-semibold text-on-surface tabular-nums">{creditsSpent}</span> credits
              spent on this project.
            </>
          ) : (
            'No credits committed to this project yet.'
          )}
        </p>
      </section>

      {/* Problem statement */}
      <section className="flex flex-col gap-3">
        <h2 className="font-headline text-2xl text-on-surface">Problem</h2>
        <p className="font-body text-on-surface-variant leading-relaxed whitespace-pre-wrap">
          {project.problemStatement || 'No problem statement recorded yet.'}
        </p>
      </section>

      {/* Team */}
      <section className="flex flex-col gap-4">
        <h2 className="font-headline text-2xl text-on-surface">
          Team <span className="text-on-surface-variant">({team.length})</span>
        </h2>
        {isStaff ? (
          <ProjectTeam projectId={project.id} team={team} apprentices={await listApprentices()} />
        ) : team.length === 0 ? (
          <p className="font-body text-on-surface-variant">No one assigned yet.</p>
        ) : (
          <ul className="flex flex-col gap-px bg-outline-variant/30 border border-outline-variant/30">
            {team.map((m) => (
              <li key={m.id} className="bg-surface flex items-center justify-between gap-4 px-5 py-4">
                <span className="font-body text-on-surface">{m.fullName || m.email || '—'}</span>
                <span className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant">
                  {m.roleOnProject}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
