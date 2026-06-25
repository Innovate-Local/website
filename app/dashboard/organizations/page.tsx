import Link from 'next/link'
import { desc, sql } from 'drizzle-orm'
import { requireRole } from '@/lib/auth/session'
import { getDb } from '@/lib/db'
import { organizations, organizationMembers } from '@/lib/db/schema'
import { PageHeader } from '@/components/platform/PageHeader'
import { CreateOrgForm } from '@/components/platform/CreateOrgForm'

export default async function OrganizationsPage() {
  await requireRole('hub_staff')

  const db = getDb()
  const orgs = await db
    .select({
      id: organizations.id,
      name: organizations.name,
      orgType: organizations.orgType,
      location: organizations.location,
      memberCount: sql<number>`count(${organizationMembers.id})::int`,
    })
    .from(organizations)
    .leftJoin(organizationMembers, sql`${organizationMembers.orgId} = ${organizations.id}`)
    .groupBy(organizations.id)
    .orderBy(desc(organizations.createdAt))

  return (
    <div className="flex flex-col">
      <PageHeader eyebrow={`${orgs.length} organizations`} title="Organizations" />

      <div className="mb-10">
        <CreateOrgForm />
      </div>

      {orgs.length === 0 ? (
        <p className="font-body text-on-surface-variant">No organizations yet. Create the first one above.</p>
      ) : (
        <ul className="flex flex-col gap-px bg-outline-variant/30 border border-outline-variant/30">
          {orgs.map((o) => (
            <li key={o.id}>
              <Link
                href={`/dashboard/organizations/${o.id}`}
                className="bg-surface flex items-center justify-between gap-4 px-5 py-4 hover:bg-surface-container-low transition-colors"
              >
                <span className="flex flex-col">
                  <span className="font-body text-on-surface">{o.name}</span>
                  <span className="font-label text-xs uppercase tracking-widest text-on-surface-variant">
                    {[o.orgType, o.location].filter(Boolean).join(' · ') || '—'}
                  </span>
                </span>
                <span className="font-label text-xs uppercase tracking-widest text-on-surface-variant">
                  {o.memberCount} {o.memberCount === 1 ? 'member' : 'members'}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
