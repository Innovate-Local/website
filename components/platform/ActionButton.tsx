'use client'

// Minimal client wrapper to fire a bound server action and refresh, surfacing
// any { ok:false, error } it returns. Keeps pages as server components while
// still giving buttons a pending state and inline error.
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { primaryButtonClass, ghostButtonClass } from './styles'

type Result = { ok: boolean; error?: string } | void

export function ActionButton({
  action,
  label,
  pendingLabel,
  variant = 'primary',
  confirm,
}: {
  action: () => Promise<Result>
  label: string
  pendingLabel?: string
  variant?: 'primary' | 'ghost'
  confirm?: string
}) {
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  function run() {
    if (confirm && !window.confirm(confirm)) return
    setError(null)
    start(async () => {
      const res = await action()
      if (res && res.ok === false) setError(res.error ?? 'Something went wrong.')
      else router.refresh()
    })
  }

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        className={variant === 'primary' ? primaryButtonClass : ghostButtonClass}
        onClick={run}
        disabled={pending}
      >
        {pending ? (pendingLabel ?? 'Working…') : label}
      </button>
      {error && <p className="font-body text-sm text-error">{error}</p>}
    </div>
  )
}
