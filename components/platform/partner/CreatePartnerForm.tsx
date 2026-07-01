'use client'

import { useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createPartnerAction, updatePartnerAction } from '@/app/dashboard/partners/actions'
import { inputClass, labelClass, primaryButtonClass } from '../styles'

type OrgOption = { id: string; name: string }

// Staff: designate an organization as a Community Innovation Partner.
export function CreatePartnerForm({ orgs }: { orgs: OrgOption[] }) {
  const formRef = useRef<HTMLFormElement>(null)
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<string | null>(null)

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    setError(null)
    setDone(null)
    startTransition(async () => {
      const res = await createPartnerAction(fd)
      if (res.ok) {
        formRef.current?.reset()
        setDone('Partner created.')
        router.refresh()
      } else setError(res.error)
    })
  }

  return (
    <form ref={formRef} onSubmit={onSubmit} className="flex flex-col gap-5 bg-surface-container-low p-7">
      <h2 className="font-headline text-2xl text-on-surface">Designate a partner</h2>
      {orgs.length === 0 ? (
        <p className="text-sm text-on-surface-variant">
          Every organization is already a partner. Create a new organization first.
        </p>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <label className={labelClass}>Organization</label>
              <select name="orgId" required defaultValue="" disabled={isPending} className={inputClass}>
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
              <label className={labelClass}>Annual allocation (credits)</label>
              <input name="annualAllocation" type="number" min={1} required placeholder="e.g. 1000" disabled={isPending} className={inputClass} />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <label className={labelClass}>Partnership tier</label>
            <input name="tier" defaultValue="Founding Community Innovation Partner" disabled={isPending} className={inputClass} />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="flex flex-col gap-2">
              <label className={labelClass}>Cycle start</label>
              <input name="cycleStart" type="date" disabled={isPending} className={inputClass} />
            </div>
            <div className="flex flex-col gap-2">
              <label className={labelClass}>Cycle end</label>
              <input name="cycleEnd" type="date" disabled={isPending} className={inputClass} />
            </div>
            <div className="flex flex-col gap-2">
              <label className={labelClass}>Redemption window (days)</label>
              <input name="redemptionWindowDays" type="number" min={1} defaultValue={180} disabled={isPending} className={inputClass} />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <label className={labelClass}>Footprint restriction</label>
            <input name="footprint" placeholder="e.g. Central PA · service area" disabled={isPending} className={inputClass} />
          </div>
          <button type="submit" disabled={isPending} className={primaryButtonClass}>
            {isPending ? 'Creating…' : 'Create partner'}
          </button>
        </>
      )}
      {error && (
        <div className="bg-error-container p-4 text-on-error-container">
          <p className="font-label text-xs uppercase tracking-widest">{error}</p>
        </div>
      )}
      {done && <p className="font-label text-xs uppercase tracking-widest text-tertiary">{done}</p>}
    </form>
  )
}

// Staff: edit an existing partner's allocation / cycle / details.
export function EditPartnerForm({
  partnerId,
  tier,
  annualAllocation,
  cycleStart,
  cycleEnd,
  footprint,
}: {
  partnerId: string
  tier: string
  annualAllocation: number
  cycleStart: string | null
  cycleEnd: string | null
  footprint: string | null
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    setError(null)
    setDone(false)
    startTransition(async () => {
      const res = await updatePartnerAction(partnerId, fd)
      if (res.ok) {
        setDone(true)
        router.refresh()
      } else setError(res.error)
    })
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5 bg-surface p-7">
      <div className="font-label text-[9px] font-bold uppercase tracking-widest text-primary">
        Allocation & cycle
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <label className={labelClass}>Annual allocation</label>
          <input name="annualAllocation" type="number" min={1} defaultValue={annualAllocation} disabled={isPending} className={inputClass} />
        </div>
        <div className="flex flex-col gap-2">
          <label className={labelClass}>Tier</label>
          <input name="tier" defaultValue={tier} disabled={isPending} className={inputClass} />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <label className={labelClass}>Cycle start</label>
          <input name="cycleStart" type="date" defaultValue={cycleStart ?? ''} disabled={isPending} className={inputClass} />
        </div>
        <div className="flex flex-col gap-2">
          <label className={labelClass}>Cycle end</label>
          <input name="cycleEnd" type="date" defaultValue={cycleEnd ?? ''} disabled={isPending} className={inputClass} />
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <label className={labelClass}>Footprint</label>
        <input name="footprint" defaultValue={footprint ?? ''} disabled={isPending} className={inputClass} />
      </div>
      <button type="submit" disabled={isPending} className={primaryButtonClass}>
        {isPending ? 'Saving…' : 'Save partner'}
      </button>
      {error && (
        <div className="bg-error-container p-4 text-on-error-container">
          <p className="font-label text-xs uppercase tracking-widest">{error}</p>
        </div>
      )}
      {done && <p className="font-label text-xs uppercase tracking-widest text-tertiary">Saved.</p>}
    </form>
  )
}
