import { requireRole } from '@/lib/auth/session'
import { listOpenProjectsForApprentice } from '@/lib/platform/projects'
import { PageHeader } from '@/components/platform/PageHeader'
import { OpportunityList } from '@/components/platform/OpportunityList'

// Apprentice: browse projects open to join and raise your hand. The hub team
// sees your interest on the project and decides whom to add.
export default async function OpportunitiesPage() {
  const me = await requireRole('apprentice')
  const projects = await listOpenProjectsForApprentice(me.id)

  return (
    <div className="flex flex-col gap-8">
      <PageHeader eyebrow="Open to join" title="Opportunities" />
      <p className="-mt-4 max-w-2xl font-body text-on-surface-variant">
        Projects the hub is staffing right now. Express interest in the ones that fit — the team
        reviews who’s interested and adds people from there.
      </p>
      <OpportunityList projects={projects} />
    </div>
  )
}
