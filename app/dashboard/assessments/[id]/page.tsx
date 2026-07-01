import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireRole } from '@/lib/auth/session'
import { getAssessmentById, resultOf } from '@/lib/matchcore/assessments'
import { PageHeader } from '@/components/platform/PageHeader'
import { CompetencyCard } from '@/components/platform/CompetencyCard'
import { ActionButton } from '@/components/platform/ActionButton'
import { approveAssessmentAction } from '../actions'

export default async function AssessmentReviewPage({ params }: { params: Promise<{ id: string }> }) {
  await requireRole('hub_staff')
  const { id } = await params
  const a = await getAssessmentById(id)
  if (!a) notFound()
  const result = resultOf(a)

  return (
    <div className="flex flex-col gap-8">
      <PageHeader eyebrow="MatchCore" title="Assessment review" />
      <Link href="/dashboard/assessments" className="-mt-6 font-label text-xs uppercase tracking-widest text-on-surface-variant hover:text-primary">
        ← All assessments
      </Link>

      {result ? (
        <div className="flex flex-col gap-4">
          <CompetencyCard
            result={result}
            statusLabel={a.status === 'approved' ? 'Approved — active in matching pool' : 'Scored — awaiting review'}
          />
          {a.status === 'scored' && (
            <ActionButton action={approveAssessmentAction.bind(null, id)} label="Approve for matching" pendingLabel="Approving…" />
          )}
        </div>
      ) : (
        <p className="bg-surface-container p-4 font-body text-sm text-on-surface-variant">
          This assessment hasn’t been scored yet.
        </p>
      )}
    </div>
  )
}
