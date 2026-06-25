import Link from 'next/link'
import { notFound } from 'next/navigation'
import { eq } from 'drizzle-orm'
import { requireRole } from '@/lib/auth/session'
import { getDb } from '@/lib/db'
import { organizations, organizationMembers, profiles } from '@/lib/db/schema'
import { PageHeader } from '@/components/platform/PageHeader'
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

  const members = await db
    .select({
      id: organizationMembers.id,
      roleInOrg: organizationMembers.roleInOrg,
      fullName: profiles.fullName,
      email: profiles.email,
    })
    .from(organizationMembers)
    .leftJoin(profiles, eq(profiles.id, organizationMembers.userId))
    .where(eq(organizationMembers.orgId, id))

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

      <section className="flex flex-col gap-4">
        <h2 className="font-headline text-2xl text-on-surface">
          Members <span className="text-on-surface-variant">({members.length})</span>
        </h2>
        {members.length === 0 ? (
          <p className="font-body text-on-surface-variant">No members yet.</p>
        ) : (
          <ul className="flex flex-col gap-px bg-outline-variant/30 border border-outline-variant/30">
            {members.map((m) => (
              <li key={m.id} className="bg-surface flex items-center justify-between gap-4 px-5 py-4">
                <span className="flex flex-col">
                  <span className="font-body text-on-surface">{m.fullName || '—'}</span>
                  <span className="font-label text-xs text-on-surface-variant break-all">{m.email}</span>
                </span>
                <span className="font-label text-[10px] uppercase tracking-widest text-on-tertiary-container bg-tertiary-container px-3 py-1">
                  {m.roleInOrg}
                </span>
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
