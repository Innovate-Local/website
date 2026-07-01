import Link from 'next/link'
import { requireRole } from '@/lib/auth/session'
import { listAssessmentsForStaff } from '@/lib/matchcore/assessments'
import { PageHeader } from '@/components/platform/PageHeader'

const STATUS_LABEL: Record<string, string> = {
  in_progress: 'In progress',
  scored: 'Scored — needs review',
  approved: 'Approved',
}

export default async function AssessmentsPage() {
  await requireRole('hub_staff')
  const rows = await listAssessmentsForStaff()

  return (
    <div className="flex flex-col gap-8">
      <PageHeader eyebrow="MatchCore" title="Competency assessments" />
      <p className="-mt-4 max-w-2xl font-body text-on-surface-variant">
        Each apprentice’s readiness profile. Review scored assessments and approve them to add the apprentice to the
        matching pool.
      </p>

      <div className="flex flex-col divide-y divide-outline-variant bg-surface-container">
        {rows.map((r) => (
          <div key={r.userId} className="flex flex-wrap items-baseline justify-between gap-2 p-4">
            <div className="flex flex-col">
              <span className="font-body text-sm text-on-surface">{r.name ?? r.email ?? 'Unknown'}</span>
              <span className="font-label text-xs text-on-surface-variant">
                {r.status ? (STATUS_LABEL[r.status] ?? r.status) : 'Not started'}
                {r.crr != null ? ` · CRR ${r.crr} (${r.crrTier})` : ''}
              </span>
            </div>
            {r.assessmentId && r.status !== 'in_progress' ? (
              <Link
                href={`/dashboard/assessments/${r.assessmentId}`}
                className="font-label text-xs uppercase tracking-widest text-primary hover:underline"
              >
                Review
              </Link>
            ) : null}
          </div>
        ))}
        {rows.length === 0 && <p className="p-4 font-body text-sm text-on-surface-variant">No apprentices yet.</p>}
      </div>
    </div>
  )
}
