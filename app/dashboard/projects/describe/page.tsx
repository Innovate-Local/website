import Link from 'next/link'
import { requireProfile } from '@/lib/auth/session'
import { resolveViewerOrg } from '@/lib/platform/credits'
import { aiConfigured } from '@/lib/ai/client'
import { getDraftingRequestForOrg, getRequestById } from '@/lib/platform/project-requests'
import { getRequestDiscovery, transcriptOf } from '@/lib/matchcore/discovery'
import { interviewGreeting } from '@/lib/matchcore/prompts'
import { PageHeader } from '@/components/platform/PageHeader'
import { MatchcoreInterview } from '@/components/platform/MatchcoreInterview'
import { DescribeReviewForm } from '@/components/platform/DescribeReviewForm'
import { ActionButton } from '@/components/platform/ActionButton'
import { startDescribe, replyDescribe, finishDescribe, updateDescribeDraft, submitDescribe } from './actions'

// finishDescribe runs two model calls (draft + complexity) — give it headroom.
export const maxDuration = 60

export default async function DescribePage() {
  const me = await requireProfile()
  const org = await resolveViewerOrg(me.id)

  if (!org || org.roleInOrg !== 'admin') {
    return (
      <div className="flex flex-col gap-8">
        <PageHeader eyebrow="MatchCore" title="Describe a project" />
        <p className="max-w-2xl font-body text-on-surface-variant">
          This tool is available to organization admins. If you belong to an organization, ask an admin to describe your
          project — or your hub team can scope it with you directly.
        </p>
      </div>
    )
  }

  const configured = aiConfigured()
  const requestId = await getDraftingRequestForOrg(org.orgId)
  const discovery = requestId ? await getRequestDiscovery(requestId) : null
  const scored = !!discovery && discovery.status === 'scored'
  const req = scored && requestId ? await getRequestById(requestId) : null

  return (
    <div className="flex flex-col gap-8">
      <PageHeader eyebrow="MatchCore" title="Describe a project" />
      <p className="-mt-4 max-w-2xl font-body text-on-surface-variant">
        Talk it through with MatchCore Scout and it drafts the whole project for you — you can edit anything before
        sending it to the hub. Prefer to type it yourself?{' '}
        <Link href="/dashboard/organization" className="text-primary hover:underline">
          Submit a request manually
        </Link>
        .
      </p>

      {!configured && (
        <p className="bg-surface-container p-4 font-body text-sm text-on-surface-variant">
          The discovery assistant isn’t configured in this environment yet.
        </p>
      )}

      {scored && req && requestId ? (
        <div className="flex flex-col gap-4">
          <p className="bg-surface-container-low p-4 font-body text-sm text-on-surface-variant">
            Here’s the project MatchCore drafted from your conversation. Review and edit anything, then submit it to the
            hub — they’ll scope it and match a team.
          </p>
          <DescribeReviewForm
            initial={{
              title: req.title,
              summary: req.summary ?? '',
              problemStatement: req.problemStatement ?? '',
              description: req.description ?? '',
              skills: req.skillsNeeded ?? [],
            }}
            save={updateDescribeDraft.bind(null, requestId)}
            submit={submitDescribe.bind(null, requestId)}
          />
        </div>
      ) : configured && requestId && discovery && discovery.status === 'in_progress' ? (
        <MatchcoreInterview
          initialMessages={
            transcriptOf(discovery).length
              ? transcriptOf(discovery)
              : [{ role: 'assistant', content: interviewGreeting.complexity }]
          }
          onReply={replyDescribe.bind(null, requestId)}
          onFinish={finishDescribe.bind(null, requestId)}
          finishLabel="Finish & draft project"
        />
      ) : configured ? (
        <div className="flex flex-col gap-4 bg-surface-container p-6">
          <p className="font-body text-on-surface">{interviewGreeting.complexity}</p>
          <ActionButton action={startDescribe} label="Start describing" pendingLabel="Starting…" />
        </div>
      ) : null}
    </div>
  )
}
