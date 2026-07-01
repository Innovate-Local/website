import { notFound } from 'next/navigation'
import { getRedemptionByCode } from '@/lib/platform/partners'
import { RedeemForm } from '@/components/platform/partner/RedeemForm'

// Public landing page a recipient reaches from the transfer email. The code in
// the URL is the credential — no sign-in required.
export default async function RedeemPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params
  const view = await getRedemptionByCode(code)
  if (!view) notFound()

  const expired = view.expiresAt ? new Date(view.expiresAt + 'T23:59:59') < new Date() : false
  const closed = view.status === 'redeemed' || view.status === 'reclaimed' || view.remaining <= 0 || expired
  const expires = view.expiresAt
    ? new Date(view.expiresAt + 'T00:00:00').toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : null

  return (
    <div className="min-h-screen bg-surface">
      <header className="flex items-center justify-between px-6 py-6 md:px-12">
        <div className="font-headline text-2xl tracking-tight text-on-surface">InnovateLocal</div>
        <div className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant">
          Innovation Credits · Redemption
        </div>
      </header>

      <main className="mx-auto flex max-w-3xl flex-col gap-8 px-6 py-10 md:px-12 md:py-16">
        <div className="flex flex-col gap-3">
          <span className="annotation">{view.partnerName} · Innovation Credits</span>
          <h1 className="font-headline text-4xl leading-tight tracking-tight text-on-surface md:text-5xl">
            {view.partnerName} has directed innovation credits to{' '}
            {view.recipientName ?? 'your organization'}.
          </h1>
          <p className="max-w-2xl font-body text-lg text-on-surface-variant">
            These credits fund applied AI work — workshops, problem-framing sprints, and student-team
            prototypes — delivered by local InnovateLocal apprentice teams.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-px border border-outline-variant/30 bg-outline-variant/30 sm:grid-cols-3">
          <div className="flex flex-col gap-1 bg-surface p-6">
            <span className="font-label text-[10px] font-semibold uppercase tracking-widest text-on-surface-variant">
              Code
            </span>
            <span className="font-mono text-lg font-bold text-on-surface">{view.code}</span>
          </div>
          <div className="flex flex-col gap-1 bg-surface p-6">
            <span className="font-label text-[10px] font-semibold uppercase tracking-widest text-on-surface-variant">
              Credits remaining
            </span>
            <span className="font-headline text-3xl text-on-surface">{view.remaining}</span>
          </div>
          <div className="flex flex-col gap-1 bg-surface p-6">
            <span className="font-label text-[10px] font-semibold uppercase tracking-widest text-on-surface-variant">
              Redeem by
            </span>
            <span className="font-body text-base text-on-surface">{expires ?? 'No expiry'}</span>
          </div>
        </div>

        {view.message && (
          <blockquote className="border-l-4 border-primary bg-surface-container-low p-6 font-body italic text-on-surface-variant">
            “{view.message}”
            {view.relationshipManager && (
              <footer className="mt-2 font-label text-[10px] not-italic uppercase tracking-widest text-on-surface-variant">
                — {view.relationshipManager}, {view.partnerName}
              </footer>
            )}
          </blockquote>
        )}

        {closed ? (
          <div className="bg-surface-container-low p-8 font-body text-on-surface-variant">
            {expired
              ? 'This redemption window has closed. Contact your relationship manager if you need more time.'
              : 'These credits have already been fully redeemed. Thank you!'}
          </div>
        ) : (
          <RedeemForm code={view.code} remaining={view.remaining} suggestion={view.engagementSuggestion} />
        )}
      </main>
    </div>
  )
}
