'use client'

import { loadStripe } from '@stripe/stripe-js'
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from '@stripe/react-stripe-js'

// Publishable key is safe in the browser. Loaded once at module scope.
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

// Renders Stripe's embedded Checkout for a given client secret. On completion
// Stripe redirects to the session's return_url, so this just hosts the form.
export function EmbeddedCheckoutModal({
  clientSecret,
  onClose,
}: {
  clientSecret: string
  onClose: () => void
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-inverse-surface/60 p-4 sm:p-10"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="w-full max-w-2xl bg-surface">
        <div className="flex items-center justify-between bg-surface-container-low px-5 py-4">
          <span className="font-label text-xs uppercase tracking-widest text-on-surface-variant">
            Secure checkout
          </span>
          <button
            type="button"
            onClick={onClose}
            className="font-label text-xs uppercase tracking-widest text-on-surface-variant hover:text-error transition-colors"
          >
            Close ✕
          </button>
        </div>
        <div className="p-2 sm:p-4">
          <EmbeddedCheckoutProvider stripe={stripePromise} options={{ clientSecret }}>
            <EmbeddedCheckout />
          </EmbeddedCheckoutProvider>
        </div>
      </div>
    </div>
  )
}
