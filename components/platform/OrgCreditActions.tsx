'use client'

import { useRef, useState, useTransition } from 'react'
import { spendCredits, transferCredits } from '@/app/dashboard/credits/actions'
import { ENGAGEMENT_TYPES } from '@/lib/platform/engagement-types'
import { inputClass, labelClass, primaryButtonClass } from './styles'

type ProjectOption = { id: string; title: string }
type OrgOption = { id: string; name: string }

function EngagementSelect({ id, disabled }: { id: string; disabled: boolean }) {
  return (
    <select id={id} name="engagementType" defaultValue="" disabled={disabled} className={inputClass}>
      <option value="">Let the recipient choose</option>
      {ENGAGEMENT_TYPES.map((e) => (
        <option key={e.key} value={e.key}>
          {e.label}
          {e.credits != null ? ` · ${e.credits} cr` : ''}
        </option>
      ))}
    </select>
  )
}

// Org admin (or staff): move the org's credits — spend internally on a project,
// or transfer externally to another org. Two compact forms side by side.
export function OrgCreditActions({
  orgId,
  available,
  projects,
  otherOrgs,
}: {
  orgId: string
  available: number
  projects: ProjectOption[]
  otherOrgs: OrgOption[]
}) {
  return (
    <div className="grid grid-cols-1 gap-px border border-outline-variant/30 bg-outline-variant/30 lg:grid-cols-2">
      <SpendForm orgId={orgId} available={available} projects={projects} />
      <TransferForm orgId={orgId} available={available} otherOrgs={otherOrgs} />
    </div>
  )
}

function SpendForm({
  orgId,
  available,
  projects,
}: {
  orgId: string
  available: number
  projects: ProjectOption[]
}) {
  const formRef = useRef<HTMLFormElement>(null)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    setError(null)
    startTransition(async () => {
      const result = await spendCredits(formData)
      if (result.ok) formRef.current?.reset()
      else setError(result.error)
    })
  }

  return (
    <form ref={formRef} onSubmit={onSubmit} className="flex flex-col gap-4 bg-surface p-6">
      <input type="hidden" name="orgId" value={orgId} />
      <h3 className="font-headline text-xl text-on-surface">Spend on a project</h3>
      <p className="text-sm text-on-surface-variant">
        Commit credits to one of your organization’s projects.
      </p>
      <div className="flex flex-col gap-2">
        <label className={labelClass}>Project</label>
        <select name="projectId" defaultValue="" disabled={isPending || projects.length === 0} className={inputClass}>
          <option value="">{projects.length === 0 ? 'No projects yet' : 'Unassigned / general'}</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.title}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-2">
        <label className={labelClass}>Engagement</label>
        <EngagementSelect id="spend-eng" disabled={isPending} />
      </div>
      <div className="flex flex-col gap-2">
        <label className={labelClass}>Credits</label>
        <input
          name="amount"
          type="number"
          min={1}
          max={available}
          required
          placeholder="e.g. 16"
          disabled={isPending}
          className={inputClass}
        />
      </div>
      <button type="submit" disabled={isPending || available === 0} className={primaryButtonClass}>
        {isPending ? 'Recording…' : 'Spend credits'}
      </button>
      {error && (
        <div className="bg-error-container p-4 text-on-error-container">
          <p className="font-label text-xs uppercase tracking-widest">{error}</p>
        </div>
      )}
    </form>
  )
}

function TransferForm({
  orgId,
  available,
  otherOrgs,
}: {
  orgId: string
  available: number
  otherOrgs: OrgOption[]
}) {
  const formRef = useRef<HTMLFormElement>(null)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    setError(null)
    startTransition(async () => {
      const result = await transferCredits(formData)
      if (result.ok) formRef.current?.reset()
      else setError(result.error)
    })
  }

  return (
    <form ref={formRef} onSubmit={onSubmit} className="flex flex-col gap-4 bg-surface p-6">
      <input type="hidden" name="fromOrgId" value={orgId} />
      <h3 className="font-headline text-xl text-on-surface">Transfer to another org</h3>
      <p className="text-sm text-on-surface-variant">
        Send credits to another organization in the network.
      </p>
      <div className="flex flex-col gap-2">
        <label className={labelClass}>Recipient</label>
        <select name="toOrgId" required defaultValue="" disabled={isPending || otherOrgs.length === 0} className={inputClass}>
          <option value="" disabled>
            {otherOrgs.length === 0 ? 'No other organizations' : 'Choose an organization…'}
          </option>
          {otherOrgs.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-2">
        <label className={labelClass}>Suggested engagement</label>
        <EngagementSelect id="transfer-eng" disabled={isPending} />
      </div>
      <div className="flex flex-col gap-2">
        <label className={labelClass}>Credits</label>
        <input
          name="amount"
          type="number"
          min={1}
          max={available}
          required
          placeholder="e.g. 24"
          disabled={isPending}
          className={inputClass}
        />
      </div>
      <button type="submit" disabled={isPending || available === 0 || otherOrgs.length === 0} className={primaryButtonClass}>
        {isPending ? 'Sending…' : 'Transfer credits'}
      </button>
      {error && (
        <div className="bg-error-container p-4 text-on-error-container">
          <p className="font-label text-xs uppercase tracking-widest">{error}</p>
        </div>
      )}
    </form>
  )
}
