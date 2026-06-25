// One-time (idempotent) Stripe setup: creates a Product + monthly recurring
// Price for each subscription tier. Re-runnable — it reuses an existing Price by
// lookup_key instead of creating duplicates. Prints the STRIPE_PRICE_* env lines
// to paste/append into .env.
//
// Run:  node --env-file=.env scripts/stripe-setup.mjs
//
// Keep the tiers in sync with lib/platform/billing-plans.ts (this script can't
// import the .ts module).
import Stripe from 'stripe'

const TIERS = [
  { key: 'catalyst', name: 'InnovateLocal — Catalyst', credits: 125, priceCents: 50000 },
  { key: 'anchor', name: 'InnovateLocal — Anchor', credits: 375, priceCents: 120000 },
  { key: 'keystone', name: 'InnovateLocal — Keystone', credits: 750, priceCents: 200000 },
]

const key = process.env.STRIPE_SECRET_KEY
if (!key) {
  console.error('STRIPE_SECRET_KEY missing — run with: node --env-file=.env scripts/stripe-setup.mjs')
  process.exit(1)
}
const stripe = new Stripe(key)

const lines = []
for (const t of TIERS) {
  const lookupKey = `il_${t.key}_monthly`
  const existing = await stripe.prices.list({ lookup_keys: [lookupKey], limit: 1, expand: ['data.product'] })
  let price = existing.data[0]
  if (price) {
    console.error(`✓ ${t.key}: reusing existing price ${price.id}`)
  } else {
    const product = await stripe.products.create({
      name: t.name,
      metadata: { il_tier: t.key, credits: String(t.credits) },
    })
    price = await stripe.prices.create({
      product: product.id,
      unit_amount: t.priceCents,
      currency: 'usd',
      recurring: { interval: 'month' },
      lookup_key: lookupKey,
      metadata: { il_tier: t.key, credits: String(t.credits) },
    })
    console.error(`+ ${t.key}: created product ${product.id} + price ${price.id}`)
  }
  lines.push(`STRIPE_PRICE_${t.key.toUpperCase()}=${price.id}`)
}

console.error('\n--- add these to .env ---')
console.log(lines.join('\n'))
