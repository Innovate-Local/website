// Billing plan catalog — pure data, no server imports, so client components can
// render plans and prices. The credit amounts reuse the marketing partner tiers
// (Catalyst / Anchor / Keystone). Dollar amounts are PLACEHOLDERS for the
// sandbox — adjust them, then re-run `npm run stripe:setup` to (re)create the
// Stripe Prices. The actual Stripe Price IDs live in env (STRIPE_PRICE_*), read
// server-side in lib/platform/billing.ts.

export type PlanTier = {
  key: 'catalyst' | 'anchor' | 'keystone'
  name: string
  credits: number // credits granted each billing period
  priceCents: number // monthly price (display + used by the setup script)
  blurb: string
}

export const PLAN_TIERS: PlanTier[] = [
  { key: 'catalyst', name: 'Catalyst', credits: 125, priceCents: 50000, blurb: 'Get started with the program.' },
  { key: 'anchor', name: 'Anchor', credits: 375, priceCents: 120000, blurb: 'For organizations running multiple engagements.' },
  { key: 'keystone', name: 'Keystone', credits: 750, priceCents: 200000, blurb: 'Deep, sustained involvement across teams.' },
]

export function planByKey(key: string): PlanTier | undefined {
  return PLAN_TIERS.find((p) => p.key === key)
}

// One-time top-up pricing (mode: payment). Placeholder — adjust freely.
export const PRICE_PER_CREDIT_CENTS = 500 // $5.00 / credit
export const TOPUP_PRESETS = [25, 50, 100, 250] as const
export const CURRENCY = 'usd'

export function formatMoney(cents: number, currency = CURRENCY): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency.toUpperCase() }).format(
    cents / 100,
  )
}
