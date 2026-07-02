// Financial snapshot pulled LIVE from Stripe (staff Insights). Server-only.
// Wrapped in React cache so the several reads on one page share one set of API
// calls, and fully defensive: any Stripe error returns a zeroed snapshot with an
// error string so the dashboard still renders.
import { cache } from 'react'
import { getStripe } from '@/lib/stripe'

export type FinanceSnapshot = {
  ok: boolean
  error?: string
  currency: string
  balanceAvailableCents: number
  balancePendingCents: number
  activeSubscriptions: number
  mrrCents: number // normalized monthly recurring revenue
  grossVolume30dCents: number
}

const ZERO: FinanceSnapshot = {
  ok: false,
  currency: 'usd',
  balanceAvailableCents: 0,
  balancePendingCents: 0,
  activeSubscriptions: 0,
  mrrCents: 0,
  grossVolume30dCents: 0,
}

// Normalize a recurring amount to a monthly figure.
function toMonthly(amountCents: number, interval: string | undefined, count: number): number {
  const per = amountCents * (count || 1)
  switch (interval) {
    case 'year':
      return per / 12
    case 'week':
      return (per * 52) / 12
    case 'day':
      return (per * 365) / 12
    default:
      return per // month
  }
}

export const getFinanceSnapshot = cache(async (): Promise<FinanceSnapshot> => {
  try {
    const stripe = getStripe()

    const balance = await stripe.balance.retrieve()
    const sumAmounts = (arr: { amount: number }[]) => arr.reduce((s, b) => s + b.amount, 0)
    const currency = balance.available[0]?.currency ?? 'usd'

    // Active subscriptions → MRR.
    const subs = await stripe.subscriptions.list({ status: 'active', limit: 100 })
    let mrr = 0
    for (const sub of subs.data) {
      for (const item of sub.items.data) {
        const price = item.price
        mrr += toMonthly(price.unit_amount ?? 0, price.recurring?.interval, item.quantity ?? 1)
      }
    }

    // Gross volume over the last 30 days (net of refunds), first page.
    const since = Math.floor((Date.now() - 30 * 86_400_000) / 1000)
    const charges = await stripe.charges.list({ created: { gte: since }, limit: 100 })
    const gross = charges.data
      .filter((c) => c.status === 'succeeded')
      .reduce((s, c) => s + (c.amount - (c.amount_refunded ?? 0)), 0)

    return {
      ok: true,
      currency,
      balanceAvailableCents: sumAmounts(balance.available),
      balancePendingCents: sumAmounts(balance.pending),
      activeSubscriptions: subs.data.length,
      mrrCents: Math.round(mrr),
      grossVolume30dCents: gross,
    }
  } catch (err) {
    return { ...ZERO, error: (err as Error).message }
  }
})
