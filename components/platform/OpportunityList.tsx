'use client'

import Link from 'next/link'
import { useState, useTransition } from 'react'
import { expressInterest, withdrawInterest } from '@/app/dashboard/opportunities/actions'
import { PROJECT_STATUS_LABEL } from '@/lib/platform/project-status'
import { inputClass, labelClass, primaryButtonClass } from './styles'
import type { OpenProjectItem } from '@/lib/platform/projects'

// Open projects an apprentice can join, each with its own express/withdraw state.
export function OpportunityList({ projects }: { projects: OpenProjectItem[] }) {
  if (projects.length === 0) {
    return (
      <p className="bg-surface-container-low p-8 font-body text-on-surface-variant">
        No open projects right now. Check back soon — new engagements are posted as the hub scopes
        them.
      </p>
    )
  }
  return (
    <ul className="flex flex-col gap-px border border-outline-variant/30 bg-outline-variant/30">
      {projects.map((p) => (
        <OpportunityCard key={p.id} project={p} />
      ))}
    </ul>
  )
}

function OpportunityCard({ project: p }: { project: OpenProjectItem }) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [open, setOpen] = useState(false)

  function onExpress(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    setError(null)
    startTransition(async () => {
      const result = await expressInterest(p.id, formData)
      if (result.ok) setOpen(false)
      else setError(result.error)
    })
  }

  function onWithdraw() {
    setError(null)
    startTransition(async () => {
      const result = await withdrawInterest(p.id)
      if (!result.ok) setError(result.error)
    })
  }

  return (
    <li className="flex flex-col gap-3 bg-surface px-5 py-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <span className="flex min-w-0 flex-col">
          <Link href={`/dashboard/projects/${p.id}`} className="font-body text-on-surface hover:text-primary transition-colors">
            {p.title}
          </Link>
          <span className="font-label text-xs uppercase tracking-widest text-on-surface-variant">
            {[p.orgName, PROJECT_STATUS_LABEL[p.status], `${p.teamSize} ${p.teamSize === 1 ? 'member' : 'members'}`]
              .filter(Boolean)
              .join(' · ')}
          </span>
        </span>

        {/* Right-side action depends on current interest state */}
        {p.interestStatus === 'accepted' ? (
          <span className="font-label text-[10px] uppercase tracking-widest text-on-tertiary-container bg-tertiary-container px-3 py-1">
            On the team
          </span>
        ) : p.interestStatus === 'declined' ? (
          <span className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant">Not selected</span>
        ) : p.interestStatus === 'interested' ? (
          <span className="flex items-center gap-3">
            <span className="font-label text-[10px] uppercase tracking-widest text-primary">Interest sent</span>
            <button
              type="button"
              onClick={onWithdraw}
              disabled={isPending}
              className="font-label text-xs uppercase tracking-widest text-on-surface-variant hover:text-error transition-colors disabled:opacity-60"
            >
              {isPending ? '…' : 'Withdraw'}
            </button>
          </span>
        ) : open ? (
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="font-label text-xs uppercase tracking-widest text-on-surface-variant hover:text-on-surface transition-colors"
          >
            Cancel
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="font-label text-xs uppercase tracking-widest text-primary hover:text-primary-container transition-colors"
          >
            Express interest →
          </button>
        )}
      </div>

      {open && p.interestStatus == null && (
        <form onSubmit={onExpress} className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <div className="flex flex-grow flex-col gap-2">
            <label className={labelClass} htmlFor={`interest-${p.id}`}>
              Why you’re a fit <span className="lowercase opacity-60">(optional)</span>
            </label>
            <input
              id={`interest-${p.id}`}
              name="message"
              placeholder="A short note for the hub team."
              disabled={isPending}
              className={inputClass}
            />
          </div>
          <button type="submit" disabled={isPending} className={primaryButtonClass}>
            {isPending ? 'Sending…' : 'Send'}
          </button>
        </form>
      )}

      {error && (
        <div className="bg-error-container p-3 text-on-error-container">
          <p className="font-label text-xs uppercase tracking-widest">{error}</p>
        </div>
      )}
    </li>
  )
}
