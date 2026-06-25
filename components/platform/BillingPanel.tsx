'use client'

import { useState, useTransition } from 'react'
import {
  startSubscriptionCheckout,
  startTopupCheckout,
  openBillingPortal,
} from '@/app/dashboard/credits/billing-actions'
import { PLAN_TIERS, TOPUP_PRESETS, PRICE_PER_CREDIT_CENTS, formatMoney } from '@/lib/platform/billing-plans'
import { EmbeddedCheckoutModal } from './EmbeddedCheckoutModal'
import { inputClass, labelClass, primaryButtonClass } from './styles'

export type SubscriptionView = {
  tier: string | null
  status: string
  creditsPerPeriod: number
  currentPeriodEnd: string | null
  cancelAtPeriodEnd: boolean
}

// Org-admin billing: subscribe to a plan, buy one-time credits, or manage the
// existing subscription. Each purchase opens embedded Stripe Checkout.
export function BillingPanel({ subscription }: { subscription: SubscriptionView | null }) {
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [custom, setCustom] = useState('')

  const activeTier = subscription && ['active', 'trialing', 'past_due'].includes(subscription.status)
    ? subscription.tier
    : null

  function run(fn: () => Promise<{ ok: true; clientSecret: string } | { ok: false; error: string }>) {
    setError(null)
    startTransition(async () => {
      const r = await fn()
      if (r.ok) setClientSecret(r.clientSecret)
      else setError(r.error)
    })
  }

  function manage() {
    setError(null)
    startTransition(async () => {
      const r = await openBillingPortal()
      if (r.ok) window.location.href = r.url
      else setError(r.error)
    })
  }

  return (
    <div className="flex flex-col gap-6">
      {subscription && activeTier && (
        <div className="flex flex-wrap items-center justify-between gap-3 bg-surface-container-low p-5">
          <div className="flex flex-col">
            <span className="font-body text-on-surface">
              Subscribed · <span className="font-semibold capitalize">{activeTier}</span> ({subscription.creditsPerPeriod} credits/mo)
            </span>
            <span className="font-label text-xs uppercase tracking-widest text-on-surface-variant">
              {subscription.cancelAtPeriodEnd ? 'Cancels' : 'Renews'}
              {subscription.currentPeriodEnd
                ? ` ${new Date(subscription.currentPeriodEnd).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
                : ''}
              {` · ${subscription.status}`}
            </span>
          </div>
          <button type="button" onClick={manage} disabled={isPending} className="font-label text-xs uppercase tracking-widest text-primary hover:text-primary-container transition-colors disabled:opacity-60">
            Manage billing →
          </button>
        </div>
      )}

      {/* Subscription plans */}
      <div className="flex flex-col gap-3">
        <h3 className="font-headline text-xl text-on-surface">Subscription plans</h3>
        <div className="grid grid-cols-1 gap-px border border-outline-variant/30 bg-outline-variant/30 sm:grid-cols-3">
          {PLAN_TIERS.map((t) => {
            const isCurrent = activeTier === t.key
            return (
              <div key={t.key} className="flex flex-col gap-3 bg-surface p-5">
                <div className="flex flex-col gap-1">
                  <span className="font-headline text-lg text-on-surface">{t.name}</span>
                  <span className="font-label text-xs uppercase tracking-widest text-on-surface-variant">
                    {t.credits} credits / mo
                  </span>
                </div>
                <span className="font-headline text-2xl text-on-surface">
                  {formatMoney(t.priceCents)}
                  <span className="font-body text-sm text-on-surface-variant"> /mo</span>
                </span>
                <p className="font-body text-sm text-on-surface-variant">{t.blurb}</p>
                <button
                  type="button"
                  disabled={isPending || isCurrent}
                  onClick={() => run(() => startSubscriptionCheckout(t.key))}
                  className={`mt-auto ${primaryButtonClass}`}
                >
                  {isCurrent ? 'Current plan' : `Subscribe`}
                </button>
              </div>
            )
          })}
        </div>
      </div>

      {/* One-time top-up */}
      <div className="flex flex-col gap-3">
        <h3 className="font-headline text-xl text-on-surface">Buy credits once</h3>
        <p className="text-sm text-on-surface-variant">{formatMoney(PRICE_PER_CREDIT_CENTS)} per credit.</p>
        <div className="flex flex-wrap gap-2">
          {TOPUP_PRESETS.map((n) => (
            <button
              key={n}
              type="button"
              disabled={isPending}
              onClick={() => run(() => startTopupCheckout(n))}
              className="bg-surface-container-high px-5 py-3 font-label text-xs uppercase tracking-widest text-on-surface hover:bg-surface-container-highest transition-colors disabled:opacity-60"
            >
              {n} · {formatMoney(n * PRICE_PER_CREDIT_CENTS)}
            </button>
          ))}
        </div>
        <form
          className="flex items-end gap-3"
          onSubmit={(e) => {
            e.preventDefault()
            const n = Number(custom)
            if (Number.isInteger(n) && n > 0) run(() => startTopupCheckout(n))
          }}
        >
          <div className="flex flex-col gap-2">
            <label htmlFor="custom-credits" className={labelClass}>
              Custom amount
            </label>
            <input
              id="custom-credits"
              type="number"
              min={1}
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
              placeholder="e.g. 80"
              disabled={isPending}
              className={`${inputClass} w-40`}
            />
          </div>
          <button type="submit" disabled={isPending || !custom} className={primaryButtonClass}>
            Buy
          </button>
        </form>
      </div>

      {error && (
        <div className="bg-error-container p-4 text-on-error-container">
          <p className="font-label text-xs uppercase tracking-widest">{error}</p>
        </div>
      )}

      {clientSecret && <EmbeddedCheckoutModal clientSecret={clientSecret} onClose={() => setClientSecret(null)} />}
    </div>
  )
}
