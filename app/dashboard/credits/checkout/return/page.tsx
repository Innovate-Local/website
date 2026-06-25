import Link from 'next/link'
import { requireProfile } from '@/lib/auth/session'
import { finalizeFromSession } from '@/lib/platform/billing'
import { PageHeader } from '@/components/platform/PageHeader'

// Stripe redirects here after embedded Checkout completes. We confirm the
// session for immediate feedback; the webhook is the authoritative path that
// grants credits (and the only path for subscription renewals).
export default async function CheckoutReturnPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>
}) {
  await requireProfile()
  const { session_id: sessionId } = await searchParams

  let heading = 'Checkout'
  let message = 'We couldn’t find that checkout session.'
  if (sessionId) {
    try {
      const outcome = await finalizeFromSession(sessionId)
      if (outcome.status === 'complete') {
        if (outcome.mode === 'subscription') {
          heading = 'You’re subscribed.'
          message =
            'Your plan is active. Each billing period its credits are added to your organization’s balance automatically.'
        } else {
          heading = 'Payment complete.'
          message = outcome.credits
            ? `${outcome.credits} credits have been added to your organization’s balance.`
            : 'Your credits have been added to your organization’s balance.'
        }
      } else {
        heading = 'Almost there.'
        message = 'This checkout isn’t complete yet. If you just paid, it may take a moment to confirm.'
      }
    } catch {
      message = 'We hit a snag confirming this checkout. Your balance will update once the payment settles.'
    }
  }

  return (
    <div className="flex max-w-2xl flex-col gap-8">
      <PageHeader eyebrow="Innovation Credits" title={heading} />
      <p className="font-body text-on-surface-variant leading-relaxed">{message}</p>
      <div className="flex flex-wrap gap-x-6 gap-y-2">
        <Link href="/dashboard/credits" className="font-label text-xs uppercase tracking-widest text-primary hover:text-primary-container transition-colors">
          Back to credits →
        </Link>
        <Link href="/dashboard" className="font-label text-xs uppercase tracking-widest text-on-surface-variant hover:text-primary transition-colors">
          Dashboard
        </Link>
      </div>
    </div>
  )
}
