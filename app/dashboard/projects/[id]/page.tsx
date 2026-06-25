import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireProfile, getUser } from '@/lib/auth/session'
import {
  getProjectForUser,
  getProjectTeam,
  getProjectInterests,
  listApprentices,
  listOrganizationsBrief,
  PROJECT_STATUS_LABEL,
  type ProjectStatus,
} from '@/lib/platform/projects'
import { getProjectCreditsSpent } from '@/lib/platform/credits'
import { listDeliverables } from '@/lib/platform/deliverables'
import { PROJECT_LINK_FIELDS } from '@/lib/platform/project-fields'
import {
  getMyProjectFeedback,
  getProjectFeedbackForViewer,
  isFeedbackOpen,
} from '@/lib/platform/feedback'
import { PageHeader } from '@/components/platform/PageHeader'
import { ProjectStatusControl } from '@/components/platform/ProjectStatusControl'
import { ProjectTeam } from '@/components/platform/ProjectTeam'
import { ProjectInterestList } from '@/components/platform/ProjectInterestList'
import { ProjectFeedbackPanel } from '@/components/platform/ProjectFeedbackPanel'
import { ProjectDeliverables } from '@/components/platform/ProjectDeliverables'
import { EditProjectForm } from '@/components/platform/EditProjectForm'

function fmtDate(d: string | null): string | null {
  if (!d) return null
  return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const profile = await requireProfile()
  const user = await getUser()
  const { id } = await params

  const project = user ? await getProjectForUser(id, profile, user.id) : null
  if (!project) notFound()

  const team = await getProjectTeam(id)
  const creditsSpent = await getProjectCreditsSpent(id)
  const deliverables = await listDeliverables(id)
  const isStaff = profile.role === 'hub_staff'
  const interests = isStaff ? await getProjectInterests(id) : []
  const orgsBrief = isStaff ? await listOrganizationsBrief() : []

  // An apprentice may be viewing this as an open opportunity (not on the team).
  const isApprentice = profile.role === 'apprentice'
  const isAssigned = team.some((m) => m.userId === profile.id)
  const browsingOpportunity = isApprentice && !isAssigned

  // Staff and assigned apprentices manage deliverables; others read.
  const canManageDeliverables = isStaff || (isApprentice && isAssigned)

  // Feedback opens once the engagement is delivered/closed.
  const feedbackOpen = isFeedbackOpen(project.status as ProjectStatus)
  const myFeedback = feedbackOpen ? await getMyProjectFeedback(id, profile.id) : []
  const visibleFeedback = feedbackOpen
    ? await getProjectFeedbackForViewer(id, profile.role, profile.id)
    : []
  const myReflection = myFeedback.find((f) => f.subjectType === 'organization') ?? null
  const myApprenticeRatings = Object.fromEntries(
    myFeedback
      .filter((f) => f.subjectType === 'apprentice' && f.subjectUserId)
      .map((f) => [f.subjectUserId as string, { rating: f.rating, comment: f.comment }]),
  )

  const links = (project.links ?? {}) as Record<string, string>
  const linkEntries = PROJECT_LINK_FIELDS.filter((l) => links[l.key])
  const timeline = [fmtDate(project.startDate), fmtDate(project.dueDate)].filter(Boolean).join(' → ')
  const hasDetails =
    project.skillsNeeded.length > 0 || timeline || project.estimatedCredits != null || linkEntries.length > 0

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
        {project.summary && (
          <p className="mt-3 max-w-2xl font-headline text-xl text-on-surface-variant">{project.summary}</p>
        )}
        {isStaff && (
          <div className="mt-5">
            <EditProjectForm
              projectId={project.id}
              organizations={orgsBrief}
              project={{
                title: project.title,
                organizationId: project.organizationId,
                summary: project.summary,
                problemStatement: project.problemStatement,
                description: project.description,
                skillsNeeded: project.skillsNeeded,
                startDate: project.startDate,
                dueDate: project.dueDate,
                estimatedCredits: project.estimatedCredits,
                links,
              }}
            />
          </div>
        )}
      </div>

      {browsingOpportunity && (
        <div className="flex flex-wrap items-center justify-between gap-3 bg-surface-container-low p-5">
          <span className="font-body text-on-surface-variant">
            You’re viewing an open project you’re not on yet.
          </span>
          <Link
            href="/dashboard/opportunities"
            className="font-label text-xs uppercase tracking-widest text-primary hover:text-primary-container transition-colors"
          >
            Express interest →
          </Link>
        </div>
      )}

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

      {/* Details */}
      {hasDetails && (
        <section className="flex flex-col gap-4">
          <h2 className="font-headline text-2xl text-on-surface">Details</h2>
          <dl className="grid grid-cols-1 gap-px border border-outline-variant/30 bg-outline-variant/30 sm:grid-cols-2">
            {timeline && (
              <Detail label="Timeline" value={timeline} />
            )}
            {project.estimatedCredits != null && (
              <Detail label="Estimated credits" value={`${project.estimatedCredits}`} />
            )}
            {project.skillsNeeded.length > 0 && (
              <div className="flex flex-col gap-2 bg-surface p-5 sm:col-span-2">
                <dt className="font-label text-xs uppercase tracking-widest text-on-surface-variant">Skills needed</dt>
                <dd className="flex flex-wrap gap-1.5">
                  {project.skillsNeeded.map((s) => (
                    <span key={s} className="bg-surface-container-high px-3 py-1 font-label text-[10px] uppercase tracking-wider text-on-surface-variant">
                      {s}
                    </span>
                  ))}
                </dd>
              </div>
            )}
            {linkEntries.length > 0 && (
              <div className="flex flex-col gap-2 bg-surface p-5 sm:col-span-2">
                <dt className="font-label text-xs uppercase tracking-widest text-on-surface-variant">Links</dt>
                <dd className="flex flex-wrap gap-x-5 gap-y-1">
                  {linkEntries.map((l) => (
                    <a key={l.key} href={links[l.key]} target="_blank" rel="noreferrer" className="font-label text-xs uppercase tracking-widest text-primary hover:text-primary-container transition-colors">
                      {l.label} ↗
                    </a>
                  ))}
                </dd>
              </div>
            )}
          </dl>
        </section>
      )}

      {/* Problem */}
      <section className="flex flex-col gap-3">
        <h2 className="font-headline text-2xl text-on-surface">Problem</h2>
        <p className="font-body text-on-surface-variant leading-relaxed whitespace-pre-wrap">
          {project.problemStatement || 'No problem statement recorded yet.'}
        </p>
      </section>

      {/* Scope & details */}
      {project.description && (
        <section className="flex flex-col gap-3">
          <h2 className="font-headline text-2xl text-on-surface">Scope &amp; details</h2>
          <p className="font-body text-on-surface-variant leading-relaxed whitespace-pre-wrap">{project.description}</p>
        </section>
      )}

      {/* Deliverables */}
      <section className="flex flex-col gap-4">
        <h2 className="font-headline text-2xl text-on-surface">
          Deliverables <span className="text-on-surface-variant">({deliverables.length})</span>
        </h2>
        <ProjectDeliverables projectId={project.id} deliverables={deliverables} canManage={canManageDeliverables} />
      </section>

      {/* Credits committed */}
      <section className="flex flex-col gap-3">
        <h2 className="font-headline text-2xl text-on-surface">Credits committed</h2>
        <p className="font-body text-on-surface-variant">
          {creditsSpent > 0 ? (
            <>
              <span className="font-semibold text-on-surface tabular-nums">{creditsSpent}</span> credits
              spent on this project
              {project.estimatedCredits != null ? ` of ${project.estimatedCredits} estimated` : ''}.
            </>
          ) : (
            'No credits committed to this project yet.'
          )}
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

      {/* Interested apprentices (staff only) */}
      {isStaff && (
        <section className="flex flex-col gap-4">
          <h2 className="font-headline text-2xl text-on-surface">
            Interested <span className="text-on-surface-variant">({interests.filter((i) => i.status === 'interested').length})</span>
          </h2>
          <ProjectInterestList projectId={project.id} interests={interests} />
        </section>
      )}

      {/* Feedback — opens when the engagement is delivered/closed */}
      {feedbackOpen && (
        <section className="flex flex-col gap-4">
          <h2 className="font-headline text-2xl text-on-surface">Feedback</h2>
          <ProjectFeedbackPanel
            projectId={project.id}
            orgName={project.orgName}
            canRate={isStaff || profile.role === 'org_member'}
            canReflect={isApprentice && isAssigned}
            teamApprentices={team.map((m) => ({ userId: m.userId, name: m.fullName || m.email || '—' }))}
            myApprenticeRatings={myApprenticeRatings}
            myReflection={myReflection}
            visibleFeedback={visibleFeedback}
          />
        </section>
      )}
    </div>
  )
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 bg-surface p-5">
      <dt className="font-label text-xs uppercase tracking-widest text-on-surface-variant">{label}</dt>
      <dd className="font-body text-on-surface">{value}</dd>
    </div>
  )
}
