import { desc } from 'drizzle-orm'
import { requireRole } from '@/lib/auth/session'
import { getDb } from '@/lib/db'
import { profiles } from '@/lib/db/schema'
import { PageHeader } from '@/components/platform/PageHeader'
import { RoleSelect } from '@/components/platform/RoleSelect'

export default async function PeoplePage() {
  await requireRole('hub_staff')

  const db = getDb()
  const people = await db
    .select({
      id: profiles.id,
      fullName: profiles.fullName,
      email: profiles.email,
      role: profiles.role,
      createdAt: profiles.createdAt,
    })
    .from(profiles)
    .orderBy(desc(profiles.createdAt))

  return (
    <div className="flex flex-col">
      <PageHeader eyebrow={`${people.length} accounts`} title="People" />

      <div className="overflow-x-auto border border-outline-variant/30">
        <table className="w-full min-w-[640px] text-left">
          <thead>
            <tr className="border-b border-outline-variant/30 bg-surface-container-low">
              {['Name', 'Email', 'Joined', 'Role'].map((h) => (
                <th key={h} className="font-label text-xs uppercase tracking-widest text-on-surface-variant px-5 py-3">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {people.map((p) => (
              <tr key={p.id} className="border-b border-outline-variant/20 last:border-0">
                <td className="px-5 py-4 font-body text-on-surface">{p.fullName || '—'}</td>
                <td className="px-5 py-4 font-body text-on-surface-variant break-all">{p.email}</td>
                <td className="px-5 py-4 font-label text-xs text-on-surface-variant">
                  {p.createdAt.toISOString().slice(0, 10)}
                </td>
                <td className="px-5 py-4">
                  <RoleSelect userId={p.id} role={p.role} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
