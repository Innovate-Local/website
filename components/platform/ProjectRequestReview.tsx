'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { convertProjectRequest, declineProjectRequest } from '@/app/dashboard/projects/request-actions'
import { inputClass } from './styles'
import type { RequestRow } from '@/lib/platform/project-requests'

// Staff: review open project requests — convert to a project or decline w/ reason.
export function ProjectRequestReview({ requests }: { requests: RequestRow[] }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [busyId, setBusyId] = useState<string | null>(null)
  const [decliningId, setDecliningId] = useState<string | null>(null)
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)

  if (requests.length === 0) {
    return <p className="font-body text-on-surface-variant">No open requests.</p>
  }

  function convert(id: string) {
    setError(null)
    setBusyId(id)
    startTransition(async () => {
      const r = await convertProjectRequest(id)
      setBusyId(null)
      if (r.ok && r.id) router.push(`/dashboard/projects/${r.id}`)
      else if (!r.ok) setError(r.error)
    })
  }

  function decline(id: string) {
    setError(null)
    setBusyId(id)
    startTransition(async () => {
      const r = await declineProjectRequest(id, reason)
      setBusyId(null)
      if (r.ok) {
        setDecliningId(null)
        setReason('')
      } else setError(r.error)
    })
  }

  return (
    <div className="flex flex-col gap-4">
      <ul className="flex flex-col gap-px border border-outline-variant/30 bg-outline-variant/30">
        {requests.map((req) => (
          <li key={req.id} className="flex flex-col gap-3 bg-surface px-5 py-4">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <span className="flex min-w-0 flex-col">
                <span className="font-body text-on-surface">{req.title}</span>
                <span className="font-label text-xs uppercase tracking-widest text-on-surface-variant">
                  {[req.orgName, req.submittedByName].filter(Boolean).join(' · ')}
                </span>
              </span>
              {decliningId !== req.id && (
                <span className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => convert(req.id)}
                    disabled={isPending && busyId === req.id}
                    className="font-label text-xs uppercase tracking-widest text-primary hover:text-primary-container transition-colors disabled:opacity-60"
                  >
                    {isPending && busyId === req.id ? '…' : 'Convert to project'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDecliningId(req.id)
                      setReason('')
                      setError(null)
                    }}
                    disabled={isPending && busyId === req.id}
                    className="font-label text-xs uppercase tracking-widest text-on-surface-variant hover:text-error transition-colors disabled:opacity-60"
                  >
                    Decline
                  </button>
                </span>
              )}
            </div>
            {req.summary && <p className="font-body text-sm text-on-surface-variant">{req.summary}</p>}
            {req.problemStatement && (
              <p className="font-body text-sm text-on-surface-variant whitespace-pre-wrap">{req.problemStatement}</p>
            )}
            {decliningId === req.id && (
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                <input
                  value={reason}
                  autoFocus
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Reason (shared with the requester, optional)"
                  disabled={isPending && busyId === req.id}
                  className={`${inputClass} flex-grow`}
                />
                <button
                  type="button"
                  onClick={() => decline(req.id)}
                  disabled={isPending && busyId === req.id}
                  className="bg-error px-5 py-4 font-label text-xs font-bold uppercase tracking-widest text-on-error transition-colors disabled:opacity-60"
                >
                  {isPending && busyId === req.id ? 'Declining…' : 'Confirm decline'}
                </button>
                <button
                  type="button"
                  onClick={() => setDecliningId(null)}
                  className="font-label text-xs uppercase tracking-widest text-on-surface-variant hover:text-on-surface transition-colors"
                >
                  Cancel
                </button>
              </div>
            )}
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
