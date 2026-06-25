// Server-only Stripe client. The secret key lives in the environment (never in
// source, never NEXT_PUBLIC). Lazily constructed so importing this module never
// throws at build time when the key is absent.
import Stripe from 'stripe'

let cached: Stripe | null = null

export function getStripe(): Stripe {
  if (cached) return cached
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) throw new Error('STRIPE_SECRET_KEY is not set')
  // apiVersion omitted on purpose — the SDK uses its pinned default, avoiding a
  // hardcoded version that drifts. Upgrade the `stripe` package to move it.
  cached = new Stripe(key)
  return cached
}
