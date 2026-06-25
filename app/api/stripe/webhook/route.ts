// Stripe webhook — the authoritative fulfillment path. Verifies the signature
// (never trust an unverified webhook), then hands the event to the billing
// service, which is idempotent. Node runtime is required (the Stripe SDK uses
// Node crypto) and we read the raw body for signature verification.
import { NextResponse, type NextRequest } from 'next/server'
import { getStripe } from '@/lib/stripe'
import { handleStripeEvent } from '@/lib/platform/billing'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  if (!secret) {
    return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 })
  }

  const signature = req.headers.get('stripe-signature')
  if (!signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
  }

  const body = await req.text()
  let event
  try {
    event = getStripe().webhooks.constructEvent(body, signature, secret)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Invalid signature'
    return NextResponse.json({ error: `Webhook signature verification failed: ${message}` }, { status: 400 })
  }

  try {
    await handleStripeEvent(event)
  } catch (err) {
    // Returning 500 tells Stripe to retry — good for transient failures.
    const message = err instanceof Error ? err.message : 'Handler error'
    console.error('[stripe webhook] handler failed', event.type, message)
    return NextResponse.json({ error: message }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
