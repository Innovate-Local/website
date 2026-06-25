// Billing service — Stripe embedded Checkout for credit subscriptions + one-time
// top-ups, and the webhook fulfillment that turns paid money into credits.
// Server-only. The ledger (credit_transactions) stays the balance source of
// truth; these functions just decide *when* to write a `purchase` entry.
//
// Fulfillment rules (per Stripe best practices):
//   • one-time top-up  → credits granted when the Checkout Session is paid
//   • subscription     → credits granted on every `invoice.paid` (first + renewals)
//   • all credit grants are idempotent (keyed on the Stripe session/invoice id)
import type Stripe from 'stripe'
import { and, desc, eq } from 'drizzle-orm'
import { getDb } from '@/lib/db'
import { getStripe } from '@/lib/stripe'
import { organizations, orgSubscriptions, payments } from '@/lib/db/schema'
import { recordPurchase } from './credits'
import {
  PLAN_TIERS,
  PRICE_PER_CREDIT_CENTS,
  CURRENCY,
  planByKey,
  type PlanTier,
} from './billing-plans'

export { PLAN_TIERS, PRICE_PER_CREDIT_CENTS, CURRENCY, planByKey, formatMoney, TOPUP_PRESETS } from './billing-plans'
export type { PlanTier } from './billing-plans'

// ---------------------------------------------------------------------------
// Stripe id <-> tier helpers
// ---------------------------------------------------------------------------
function priceIdForTier(key: PlanTier['key']): string | null {
  return process.env[`STRIPE_PRICE_${key.toUpperCase()}`] ?? null
}

function tierForPriceId(priceId: string | null | undefined): PlanTier['key'] | null {
  if (!priceId) return null
  for (const t of PLAN_TIERS) if (priceIdForTier(t.key) === priceId) return t.key
  return null
}

// Stripe fields are `string | {id} | null` depending on expansion; normalize.
function idOf(v: string | { id: string } | null | undefined): string | null {
  if (!v) return null
  return typeof v === 'string' ? v : v.id
}

function periodEnd(sub: Stripe.Subscription): Date | null {
  const top = (sub as unknown as { current_period_end?: number }).current_period_end
  const item = (sub.items?.data?.[0] as unknown as { current_period_end?: number } | undefined)
    ?.current_period_end
  const ts = top ?? item
  return ts ? new Date(ts * 1000) : null
}

// ---------------------------------------------------------------------------
// Customer
// ---------------------------------------------------------------------------
async function ensureCustomer(orgId: string): Promise<string> {
  const db = getDb()
  const [org] = await db
    .select({ id: organizations.id, name: organizations.name, stripeCustomerId: organizations.stripeCustomerId })
    .from(organizations)
    .where(eq(organizations.id, orgId))
    .limit(1)
  if (!org) throw new Error('Organization not found')
  if (org.stripeCustomerId) return org.stripeCustomerId

  const customer = await getStripe().customers.create({
    name: org.name,
    metadata: { orgId },
  })
  await db.update(organizations).set({ stripeCustomerId: customer.id }).where(eq(organizations.id, orgId))
  return customer.id
}

async function orgIdForCustomer(customerId: string | null): Promise<string | null> {
  if (!customerId) return null
  const db = getDb()
  const [org] = await db
    .select({ id: organizations.id })
    .from(organizations)
    .where(eq(organizations.stripeCustomerId, customerId))
    .limit(1)
  return org?.id ?? null
}

// ---------------------------------------------------------------------------
// Creating embedded Checkout sessions (returns the client_secret for the UI)
// ---------------------------------------------------------------------------
export type CheckoutInit = { clientSecret: string; sessionId: string }

export async function createSubscriptionCheckout(input: {
  orgId: string
  tierKey: string
  createdBy: string
  origin: string
}): Promise<CheckoutInit> {
  const tier = planByKey(input.tierKey)
  if (!tier) throw new Error('Unknown plan')
  const priceId = priceIdForTier(tier.key)
  if (!priceId) throw new Error(`Missing STRIPE_PRICE_${tier.key.toUpperCase()} — run npm run stripe:setup`)

  const customer = await ensureCustomer(input.orgId)
  const session = await getStripe().checkout.sessions.create({
    ui_mode: 'embedded_page',
    mode: 'subscription',
    customer,
    line_items: [{ price: priceId, quantity: 1 }],
    // Dynamic payment methods — do NOT set payment_method_types.
    subscription_data: { metadata: { orgId: input.orgId, tier: tier.key } },
    metadata: { orgId: input.orgId, tier: tier.key, kind: 'subscription' },
    return_url: `${input.origin}/dashboard/credits/checkout/return?session_id={CHECKOUT_SESSION_ID}`,
  })
  return { clientSecret: session.client_secret!, sessionId: session.id }
}

export async function createTopupCheckout(input: {
  orgId: string
  credits: number
  createdBy: string
  origin: string
}): Promise<CheckoutInit> {
  if (!Number.isInteger(input.credits) || input.credits <= 0) throw new Error('Invalid credit amount')
  const customer = await ensureCustomer(input.orgId)
  const amount = input.credits * PRICE_PER_CREDIT_CENTS

  const session = await getStripe().checkout.sessions.create({
    ui_mode: 'embedded_page',
    mode: 'payment',
    customer,
    line_items: [
      {
        quantity: input.credits,
        price_data: {
          currency: CURRENCY,
          unit_amount: PRICE_PER_CREDIT_CENTS,
          product_data: { name: 'Innovation Credit' },
        },
      },
    ],
    payment_intent_data: { metadata: { orgId: input.orgId, credits: String(input.credits) } },
    metadata: { orgId: input.orgId, credits: String(input.credits), kind: 'one_time' },
    return_url: `${input.origin}/dashboard/credits/checkout/return?session_id={CHECKOUT_SESSION_ID}`,
  })

  // Record a pending payment we can finalize idempotently on success.
  await getDb().insert(payments).values({
    orgId: input.orgId,
    kind: 'one_time',
    stripeCheckoutSessionId: session.id,
    amountCents: amount,
    currency: CURRENCY,
    credits: input.credits,
    status: 'pending',
    createdBy: input.createdBy,
  })

  return { clientSecret: session.client_secret!, sessionId: session.id }
}

// Self-service management (cancel, update card, invoices) via the Customer Portal.
export async function createBillingPortalUrl(orgId: string, origin: string): Promise<string | null> {
  const db = getDb()
  const [org] = await db
    .select({ stripeCustomerId: organizations.stripeCustomerId })
    .from(organizations)
    .where(eq(organizations.id, orgId))
    .limit(1)
  if (!org?.stripeCustomerId) return null
  const portal = await getStripe().billingPortal.sessions.create({
    customer: org.stripeCustomerId,
    return_url: `${origin}/dashboard/credits`,
  })
  return portal.url
}

// ---------------------------------------------------------------------------
// Fulfillment
// ---------------------------------------------------------------------------

// One-time top-up: flip the pending payment to paid (only once) and grant credits.
async function finalizeOneTimePayment(session: Stripe.Checkout.Session): Promise<void> {
  if (session.payment_status !== 'paid') return
  const db = getDb()
  // Conditional update is the idempotency guard — only the first caller flips it.
  const flipped = await db
    .update(payments)
    .set({
      status: 'paid',
      paidAt: new Date(),
      stripePaymentIntentId: idOf(session.payment_intent),
    })
    .where(and(eq(payments.stripeCheckoutSessionId, session.id), eq(payments.status, 'pending')))
    .returning({ orgId: payments.orgId, credits: payments.credits, createdBy: payments.createdBy })

  const row = flipped[0]
  if (!row) return // already finalized
  await recordPurchase({
    orgId: row.orgId,
    amount: row.credits,
    note: `Top-up — ${row.credits} credits`,
    authorizedBy: row.createdBy,
  })
}

// Record / refresh an org's subscription row from a Stripe Subscription.
async function upsertSubscription(sub: Stripe.Subscription): Promise<void> {
  const orgId = sub.metadata?.orgId || (await orgIdForCustomer(idOf(sub.customer)))
  if (!orgId) return
  const tier = tierForPriceId(sub.items.data[0]?.price?.id)
  const credits = tier ? (planByKey(tier)?.credits ?? 0) : 0

  await getDb()
    .insert(orgSubscriptions)
    .values({
      orgId,
      stripeSubscriptionId: sub.id,
      stripeCustomerId: idOf(sub.customer),
      tier,
      creditsPerPeriod: credits,
      status: sub.status,
      currentPeriodEnd: periodEnd(sub),
      cancelAtPeriodEnd: sub.cancel_at_period_end,
    })
    .onConflictDoUpdate({
      target: orgSubscriptions.orgId,
      set: {
        stripeSubscriptionId: sub.id,
        stripeCustomerId: idOf(sub.customer),
        tier,
        creditsPerPeriod: credits,
        status: sub.status,
        currentPeriodEnd: periodEnd(sub),
        cancelAtPeriodEnd: sub.cancel_at_period_end,
      },
    })
}

// A subscription invoice was paid (first period or a renewal): grant the period's
// credits exactly once, keyed on the invoice id.
async function handleInvoicePaid(invoice: Stripe.Invoice): Promise<void> {
  const subId = idOf((invoice as unknown as { subscription?: string | { id: string } }).subscription)
  if (!subId || !invoice.id) return // not a subscription invoice

  const stripe = getStripe()
  const sub = await stripe.subscriptions.retrieve(subId)
  await upsertSubscription(sub)

  const orgId = sub.metadata?.orgId || (await orgIdForCustomer(idOf(invoice.customer)))
  if (!orgId) return
  const tier = tierForPriceId(sub.items.data[0]?.price?.id)
  const credits = tier ? (planByKey(tier)?.credits ?? 0) : 0
  if (credits <= 0) return

  // Idempotency: the unique stripe_invoice_id means only the first insert wins.
  const inserted = await getDb()
    .insert(payments)
    .values({
      orgId,
      kind: 'subscription',
      stripeInvoiceId: invoice.id,
      amountCents: invoice.amount_paid ?? 0,
      currency: invoice.currency ?? CURRENCY,
      credits,
      status: 'paid',
      paidAt: new Date(),
    })
    .onConflictDoNothing({ target: payments.stripeInvoiceId })
    .returning({ id: payments.id })

  if (inserted.length === 0) return // already processed this invoice
  await recordPurchase({
    orgId,
    amount: credits,
    note: `Subscription — ${tier ? planByKey(tier)?.name : ''} (${credits} credits)`.trim(),
  })
}

// Called by the webhook for each verified event.
export async function handleStripeEvent(event: Stripe.Event): Promise<void> {
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session
      if (session.mode === 'payment') {
        await finalizeOneTimePayment(session)
      } else if (session.mode === 'subscription') {
        const subId = idOf(session.subscription)
        if (subId) await upsertSubscription(await getStripe().subscriptions.retrieve(subId))
      }
      break
    }
    case 'invoice.paid':
    case 'invoice.payment_succeeded':
      await handleInvoicePaid(event.data.object as Stripe.Invoice)
      break
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted':
      await upsertSubscription(event.data.object as Stripe.Subscription)
      break
  }
}

// Used by the return page: confirm a finished Checkout for immediate feedback
// (the webhook is the authoritative fulfillment path; this is the backup for
// one-time payments and gives the user a status either way).
export type CheckoutOutcome = {
  status: 'complete' | 'open' | 'expired'
  mode: 'payment' | 'subscription' | null
  credits: number | null
  tier: string | null
}

export async function finalizeFromSession(sessionId: string): Promise<CheckoutOutcome> {
  const session = await getStripe().checkout.sessions.retrieve(sessionId)
  const mode = (session.mode ?? null) as CheckoutOutcome['mode']

  if (session.status === 'complete') {
    if (session.mode === 'payment') {
      await finalizeOneTimePayment(session)
    } else if (session.mode === 'subscription') {
      const subId = idOf(session.subscription)
      if (subId) await upsertSubscription(await getStripe().subscriptions.retrieve(subId))
    }
  }

  return {
    status: (session.status ?? 'open') as CheckoutOutcome['status'],
    mode,
    credits: session.metadata?.credits ? Number(session.metadata.credits) : null,
    tier: session.metadata?.tier ?? null,
  }
}

// ---------------------------------------------------------------------------
// Reads for the UI
// ---------------------------------------------------------------------------
export async function getOrgSubscription(orgId: string) {
  const db = getDb()
  const [row] = await db
    .select()
    .from(orgSubscriptions)
    .where(eq(orgSubscriptions.orgId, orgId))
    .limit(1)
  return row ?? null
}

export async function listOrgPayments(orgId: string, limit = 50) {
  const db = getDb()
  return db
    .select()
    .from(payments)
    .where(eq(payments.orgId, orgId))
    .orderBy(desc(payments.createdAt))
    .limit(limit)
}
