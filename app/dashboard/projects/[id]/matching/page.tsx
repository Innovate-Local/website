import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireRole } from '@/lib/auth/session'
import { aiConfigured } from '@/lib/ai/client'
import { getProjectForUser } from '@/lib/platform/projects'
import { getCurrentDiscovery, resultOf as discoveryResult, transcriptOf } from '@/lib/matchcore/discovery'
import { getLatestMatch, rankedOf, teamOf } from '@/lib/matchcore/matches'
import { interviewGreeting } from '@/lib/matchcore/prompts'
import { PageHeader } from '@/components/platform/PageHeader'
import { MatchcoreInterview } from '@/components/platform/MatchcoreInterview'
import { ComplexityReport } from '@/components/platform/ComplexityReport'
import { MatchReport } from '@/components/platform/MatchReport'
import { ActionButton } from '@/components/platform/ActionButton'
import type { InterviewMessage } from '@/lib/matchcore/types'
import {
  startDiscoveryAction,
  replyDiscovery,
  finishDiscovery,
  approveDiscoveryAction,
  generateMatchAction,
  approveMatchAction,
} from './actions'

// Discovery + scoring server actions here call a reasoning model — give them
// headroom beyond Vercel's 10s default (clamped to the plan's max).
export const maxDuration = 60

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="font-heading text-2xl text-on-surface">{title}</h2>
      {children}
    </section>
  )
}

export default async function MatchingPage({ params }: { params: Promise<{ id: string }> }) {
  const me = await requireRole('hub_staff')
  const { id } = await params
  const project = await getProjectForUser(id, me, me.id)
  if (!project) notFound()

  const discovery = await getCurrentDiscovery(id)
  const discResult = discovery ? discoveryResult(discovery) : null
  const discoveryReady = discResult && discovery && (discovery.status === 'scored' || discovery.status === 'approved')
  const match = await getLatestMatch(id)
  const configured = aiConfigured()

  return (
    <div className="flex flex-col gap-10">
      <PageHeader eyebrow="MatchCore" title={project.title} />
      <Link
        href={`/dashboard/projects/${id}`}
        className="-mt-8 font-label text-xs uppercase tracking-widest text-on-surface-variant hover:text-primary"
      >
        ← Back to project
      </Link>

      {!configured && (
        <p className="bg-surface-container p-4 font-body text-sm text-on-surface-variant">
          The discovery assistant isn’t configured in this environment yet.
        </p>
      )}

      <Section title="1 · Discovery & complexity">
        {discoveryReady ? (
          <div className="flex flex-col gap-4">
            <ComplexityReport result={discResult!} />
            <div className="flex flex-wrap items-start gap-4">
              {discovery!.status === 'scored' && (
                <ActionButton
                  action={approveDiscoveryAction.bind(null, discovery!.id, id)}
                  label="Approve discovery"
                  pendingLabel="Approving…"
                />
              )}
              {configured && (
                <ActionButton
                  action={startDiscoveryAction.bind(null, id)}
                  label="Re-run discovery"
                  variant="ghost"
                  confirm="Start a new discovery interview? The current one is kept but archived."
                />
              )}
            </div>
          </div>
        ) : configured ? (
          <DiscoverySection
            projectId={id}
            discoveryId={discovery?.status === 'in_progress' ? discovery.id : null}
            initial={discovery?.status === 'in_progress' ? transcriptOf(discovery) : []}
          />
        ) : null}
      </Section>

      <Section title="2 · Match & team">
        {!discoveryReady ? (
          <p className="bg-surface-container p-4 font-body text-sm text-on-surface-variant">
            Complete and score discovery first — the match uses the project’s complexity and type.
          </p>
        ) : (
          <div className="flex flex-col gap-4">
            {match ? (
              <>
                <MatchReport ranked={rankedOf(match)} team={teamOf(match)} teamSize={match.teamSize} />
                <div className="flex flex-wrap items-start gap-4">
                  {match.status === 'proposed' && (
                    <ActionButton
                      action={approveMatchAction.bind(null, match.id, id)}
                      label="Approve & assign team"
                      pendingLabel="Assigning…"
                      confirm="Assign the recommended team to this project?"
                    />
                  )}
                  {match.status === 'approved' && (
                    <span className="font-label text-xs uppercase tracking-widest text-primary">Team assigned</span>
                  )}
                  <ActionButton
                    action={generateMatchAction.bind(null, id)}
                    label="Regenerate"
                    variant="ghost"
                  />
                </div>
              </>
            ) : (
              <ActionButton action={generateMatchAction.bind(null, id)} label="Generate matches" pendingLabel="Matching…" />
            )}
          </div>
        )}
      </Section>
    </div>
  )
}

function DiscoverySection({
  projectId,
  discoveryId,
  initial,
}: {
  projectId: string
  discoveryId: string | null
  initial: InterviewMessage[]
}) {
  if (!discoveryId) {
    return (
      <div className="flex flex-col gap-4 bg-surface-container p-6">
        <p className="font-body text-on-surface">{interviewGreeting.complexity}</p>
        <ActionButton action={startDiscoveryAction.bind(null, projectId)} label="Start discovery" pendingLabel="Starting…" />
      </div>
    )
  }
  const messages = initial.length ? initial : [{ role: 'assistant' as const, content: interviewGreeting.complexity }]
  return (
    <MatchcoreInterview
      initialMessages={messages}
      onReply={replyDiscovery.bind(null, discoveryId)}
      onFinish={finishDiscovery.bind(null, discoveryId, projectId)}
      finishLabel="Finish & score"
    />
  )
}
