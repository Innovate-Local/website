'use client'

import { useRef, useState, useTransition } from 'react'
import { grantCredits } from '@/app/dashboard/credits/actions'
import { inputClass, labelClass, primaryButtonClass } from './styles'

type OrgOption = { id: string; name: string }

// Staff: allocate credits to an organization (the start of the credit flow).
export function GrantCreditsForm({ orgs }: { orgs: OrgOption[] }) {
  const formRef = useRef<HTMLFormElement>(null)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    setError(null)
    setDone(false)
    startTransition(async () => {
      const result = await grantCredits(formData)
      if (result.ok) {
        formRef.current?.reset()
        setDone(true)
      } else setError(result.error)
    })
  }

  return (
    <form ref={formRef} onSubmit={onSubmit} className="flex flex-col gap-4 bg-surface-container-low p-6">
      <h3 className="font-headline text-xl text-on-surface">Allocate credits</h3>
      <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
        <div className="flex flex-col gap-2">
          <label className={labelClass} htmlFor="grant-org">
            Organization
          </label>
          <select id="grant-org" name="orgId" required defaultValue="" disabled={isPending} className={inputClass}>
            <option value="" disabled>
              Choose an organization…
            </option>
            {orgs.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-2">
          <label className={labelClass} htmlFor="grant-amount">
            Credits
          </label>
          <input
            id="grant-amount"
            name="amount"
            type="number"
            min={1}
            required
            placeholder="e.g. 100"
            disabled={isPending}
            className={`${inputClass} sm:w-36`}
          />
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <label className={labelClass} htmlFor="grant-note">
          Note <span className="lowercase opacity-60">(optional)</span>
        </label>
        <input id="grant-note" name="note" placeholder="Cycle 2026 allocation" disabled={isPending} className={inputClass} />
      </div>
      <div className="flex items-center gap-4">
        <button type="submit" disabled={isPending} className={primaryButtonClass}>
          {isPending ? 'Allocating…' : 'Allocate credits'}
        </button>
        {done && <span className="font-label text-xs uppercase tracking-widest text-primary">Allocated</span>}
      </div>
      {error && (
        <div className="bg-error-container p-4 text-on-error-container">
          <p className="font-label text-xs uppercase tracking-widest">{error}</p>
        </div>
      )}
    </form>
  )
}
