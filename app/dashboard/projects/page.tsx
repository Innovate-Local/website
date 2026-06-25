import Link from 'next/link'
import { requireProfile, getUser } from '@/lib/auth/session'
import {
  listProjectsForUser,
  listOrganizationsBrief,
  PROJECT_STATUS_LABEL,
} from '@/lib/platform/projects'
import { listOpenRequests } from '@/lib/platform/project-requests'
import { PageHeader } from '@/components/platform/PageHeader'
import { CreateProjectForm } from '@/components/platform/CreateProjectForm'
import { ProjectRequestReview } from '@/components/platform/ProjectRequestReview'

const EYEBROW: Record<string, string> = {
  hub_staff: 'Hub engagements',
  apprentice: 'Assigned to you',
  org_member: 'Your organization’s projects',
}

export default async function ProjectsPage() {
  const profile = await requireProfile()
  const user = await getUser()
  const projects = user ? await listProjectsForUser(profile, user.id) : []
  const isStaff = profile.role === 'hub_staff'
  const openRequests = isStaff ? await listOpenRequests() : []

  return (
    <div className="flex flex-col">
      <PageHeader eyebrow={EYEBROW[profile.role] ?? 'Projects'} title="Projects" />

      {isStaff && (
        <div className="mb-10">
          <CreateProjectForm organizations={await listOrganizationsBrief()} />
        </div>
      )}

      {isStaff && openRequests.length > 0 && (
        <section className="mb-10 flex flex-col gap-4">
          <h2 className="font-headline text-2xl text-on-surface">
            Incoming requests <span className="text-on-surface-variant">({openRequests.length})</span>
          </h2>
          <ProjectRequestReview requests={openRequests} />
        </section>
      )}

      {projects.length === 0 ? (
        <p className="font-body text-on-surface-variant">
          {isStaff ? 'No projects yet. Create the first one above.' : 'No projects to show yet.'}
        </p>
      ) : (
        <ul className="flex flex-col gap-px bg-outline-variant/30 border border-outline-variant/30">
          {projects.map((p) => (
            <li key={p.id}>
              <Link
                href={`/dashboard/projects/${p.id}`}
                className="bg-surface flex items-center justify-between gap-4 px-5 py-4 hover:bg-surface-container-low transition-colors"
              >
                <span className="flex flex-col min-w-0">
                  <span className="font-body text-on-surface truncate">{p.title}</span>
                  <span className="font-label text-xs uppercase tracking-widest text-on-surface-variant">
                    {[p.orgName, `${p.teamSize} ${p.teamSize === 1 ? 'member' : 'members'}`]
                      .filter(Boolean)
                      .join(' · ')}
                  </span>
                </span>
                <span className="font-label text-[10px] uppercase tracking-widest text-on-tertiary-container bg-tertiary-container px-3 py-1 whitespace-nowrap">
                  {PROJECT_STATUS_LABEL[p.status]}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
