// Create (or update) a Stripe webhook endpoint for a deployment. Prints the
// STRIPE_WEBHOOK_SECRET line to set in the host's env. The signing secret is
// only returned at creation — if the endpoint already exists, roll it in the
// Dashboard to get a fresh one.
//
// Run:  node --env-file=.env scripts/stripe-webhook-setup.mjs https://your-domain/api/stripe/webhook
import Stripe from 'stripe'

const url = process.argv[2]
if (!url) {
  console.error('usage: node --env-file=.env scripts/stripe-webhook-setup.mjs <https url to /api/stripe/webhook>')
  process.exit(1)
}
const key = process.env.STRIPE_SECRET_KEY
if (!key) {
  console.error('STRIPE_SECRET_KEY missing')
  process.exit(1)
}
const stripe = new Stripe(key)
const events = [
  'checkout.session.completed',
  'invoice.paid',
  'invoice.payment_succeeded',
  'customer.subscription.created',
  'customer.subscription.updated',
  'customer.subscription.deleted',
]

const existing = (await stripe.webhookEndpoints.list({ limit: 100 })).data.find((e) => e.url === url)
if (existing) {
  await stripe.webhookEndpoints.update(existing.id, { enabled_events: events })
  console.error(`✓ Endpoint already exists (${existing.id}); enabled_events updated.`)
  console.error('  The signing secret is only shown at creation — roll it in the Dashboard if you need it.')
} else {
  const e = await stripe.webhookEndpoints.create({
    url,
    enabled_events: events,
    description: 'InnovateLocal — credit payments (Vercel)',
  })
  console.error(`+ Created webhook endpoint ${e.id} → ${url}`)
  console.log(`STRIPE_WEBHOOK_SECRET=${e.secret}`)
}
