'use client'

import { useState, useTransition } from 'react'
import { addInterestedToTeam, declineInterest } from '@/app/dashboard/projects/actions'
import { INTEREST_STATUS_LABEL } from '@/lib/platform/interest-status'
import type { ProjectInterestRow } from '@/lib/platform/projects'

// Staff: apprentices who raised their hand for this project, with controls to
// add them to the team or pass. Hidden rows (withdrawn) are filtered upstream.
export function ProjectInterestList({
  projectId,
  interests,
}: {
  projectId: string
  interests: ProjectInterestRow[]
}) {
  const [isPending, startTransition] = useTransition()
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  function run(userId: string, fn: () => Promise<{ ok: boolean; error?: string }>) {
    setError(null)
    setBusyId(userId)
    startTransition(async () => {
      const result = await fn()
      setBusyId(null)
      if (!result.ok) setError(result.error ?? 'Something went wrong.')
    })
  }

  if (interests.length === 0) {
    return <p className="font-body text-on-surface-variant">No one has expressed interest yet.</p>
  }

  return (
    <div className="flex flex-col gap-4">
      <ul className="flex flex-col gap-px border border-outline-variant/30 bg-outline-variant/30">
        {interests.map((i) => (
          <li key={i.id} className="flex flex-col gap-2 bg-surface px-5 py-4">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <span className="flex min-w-0 flex-col">
                <span className="font-body text-on-surface">{i.fullName || i.email || '—'}</span>
                <span className="font-label text-xs text-on-surface-variant">
                  {[
                    i.avgRating != null ? `★ ${i.avgRating.toFixed(1)}` : null,
                    `${i.completedProjects} delivered`,
                    i.fullName ? i.email : null,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </span>
              </span>
              {i.status === 'interested' ? (
                <span className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => run(i.userId, () => addInterestedToTeam(projectId, i.userId))}
                    disabled={isPending && busyId === i.userId}
                    className="font-label text-xs uppercase tracking-widest text-primary hover:text-primary-container transition-colors disabled:opacity-60"
                  >
                    {isPending && busyId === i.userId ? '…' : 'Add to team'}
                  </button>
                  <button
                    type="button"
                    onClick={() => run(i.userId, () => declineInterest(projectId, i.userId))}
                    disabled={isPending && busyId === i.userId}
                    className="font-label text-xs uppercase tracking-widest text-on-surface-variant hover:text-error transition-colors disabled:opacity-60"
                  >
                    Pass
                  </button>
                </span>
              ) : (
                <span className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant">
                  {INTEREST_STATUS_LABEL[i.status]}
                </span>
              )}
            </div>
            {i.message && <p className="font-body text-sm text-on-surface-variant">“{i.message}”</p>}
          </li>
        ))}
      </ul>
      {error && (
        <div className="bg-error-container p-4 text-on-error-container">
          <p className="font-label text-xs uppercase tracking-widest">{error}</p>
        </div>
      )}
    </div>
  )
}
