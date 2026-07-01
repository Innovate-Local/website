import { requireRole } from '@/lib/auth/session'
import { aiConfigured } from '@/lib/ai/client'
import { getCurrentAssessment, resultOf, transcriptOf } from '@/lib/matchcore/assessments'
import { interviewGreeting } from '@/lib/matchcore/prompts'
import { PageHeader } from '@/components/platform/PageHeader'
import { MatchcoreInterview } from '@/components/platform/MatchcoreInterview'
import { CompetencyCard } from '@/components/platform/CompetencyCard'
import { ActionButton } from '@/components/platform/ActionButton'
import { startAssessmentAction, replyAssessment, finishAssessment } from './actions'
import type { InterviewMessage } from '@/lib/matchcore/types'

export default async function AssessmentPage() {
  const me = await requireRole('apprentice')
  const current = await getCurrentAssessment(me.id)
  const configured = aiConfigured()

  return (
    <div className="flex flex-col gap-8">
      <PageHeader eyebrow="Your profile" title="Competency assessment" />
      <p className="-mt-4 max-w-2xl font-body text-on-surface-variant">
        A short, friendly conversation with MatchCore Compass that builds your readiness profile. It’s used to match
        you with the right projects — there are no wrong answers.
      </p>

      {!configured && (
        <p className="bg-surface-container p-4 font-body text-sm text-on-surface-variant">
          The interview assistant isn’t configured in this environment yet.
        </p>
      )}

      {/* Scored / approved → show the card. */}
      {current && (current.status === 'scored' || current.status === 'approved') && resultOf(current) ? (
        <div className="flex flex-col gap-4">
          <CompetencyCard
            result={resultOf(current)!}
            statusLabel={current.status === 'approved' ? 'Approved — active in matching pool' : 'Scored — awaiting hub review'}
          />
          {configured && (
            <ActionButton action={startAssessmentAction} label="Re-take assessment" variant="ghost" confirm="Start a new assessment? Your current scores stay until the new one is scored." />
          )}
        </div>
      ) : configured ? (
        <InterviewSection
          assessmentId={current?.status === 'in_progress' ? current.id : null}
          initial={current?.status === 'in_progress' ? transcriptOf(current) : []}
        />
      ) : null}
    </div>
  )
}

function InterviewSection({ assessmentId, initial }: { assessmentId: string | null; initial: InterviewMessage[] }) {
  // No live draft yet → offer to begin.
  if (!assessmentId) {
    return (
      <div className="flex flex-col gap-4 bg-surface-container p-6">
        <p className="font-body text-on-surface">{interviewGreeting.competency}</p>
        <ActionButton action={startAssessmentAction} label="Begin assessment" pendingLabel="Starting…" />
      </div>
    )
  }

  const messages = initial.length ? initial : [{ role: 'assistant' as const, content: interviewGreeting.competency }]
  return (
    <MatchcoreInterview
      initialMessages={messages}
      onReply={replyAssessment.bind(null, assessmentId)}
      onFinish={finishAssessment.bind(null, assessmentId)}
      finishLabel="Finish & score"
    />
  )
}
