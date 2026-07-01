'use client'

import { useState, useTransition } from 'react'
import { redeemCodeAction } from '@/app/redeem/[code]/actions'
import { ENGAGEMENT_TYPES } from '@/lib/platform/engagement-types'
import { inputClass, labelClass, primaryButtonClass } from '../styles'

// Public redemption form for a recipient holding a code. Records the redemption
// and shows a confirmation; no account required.
export function RedeemForm({
  code,
  remaining,
  suggestion,
}: {
  code: string
  remaining: number
  suggestion: string | null
}) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    setError(null)
    startTransition(async () => {
      const res = await redeemCodeAction(code, fd)
      if (res.ok) setSuccess(res.message)
      else setError(res.error)
    })
  }

  if (success) {
    return (
      <div className="bg-tertiary-container p-8 text-on-tertiary-container">
        <div className="font-label text-[10px] font-bold uppercase tracking-widest">Redeemed</div>
        <p className="mt-2 font-body text-base">{success}</p>
      </div>
    )
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5 bg-surface p-8">
      <div className="flex flex-col gap-2">
        <label className={labelClass}>Credits to redeem</label>
        <input
          name="amount"
          type="number"
          min={1}
          max={remaining}
          defaultValue={remaining}
          required
          disabled={isPending}
          className={inputClass}
        />
        <p className="text-xs text-on-surface-variant">{remaining} available on this code.</p>
      </div>
      <div className="flex flex-col gap-2">
        <label className={labelClass}>Engagement</label>
        <select name="engagementKey" defaultValue="" disabled={isPending} className={inputClass}>
          <option value="">{suggestion ? `Suggested: ${suggestion}` : 'Choose an engagement…'}</option>
          {ENGAGEMENT_TYPES.map((e) => (
            <option key={e.key} value={e.key}>
              {e.label}
              {e.credits != null ? ` · ${e.credits} cr` : ''}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-2">
        <label className={labelClass}>Project or focus (optional)</label>
        <input name="projectLabel" placeholder="What you'd like the team to work on" disabled={isPending} className={inputClass} />
      </div>
      <div className="flex flex-col gap-2">
        <label className={labelClass}>Your name (optional)</label>
        <input name="redeemerName" placeholder="First Last" disabled={isPending} className={inputClass} />
      </div>
      <button type="submit" disabled={isPending} className={primaryButtonClass}>
        {isPending ? 'Redeeming…' : 'Redeem credits →'}
      </button>
      {error && (
        <div className="bg-error-container p-4 text-on-error-container">
          <p className="font-label text-xs uppercase tracking-widest">{error}</p>
        </div>
      )}
    </form>
  )
}
