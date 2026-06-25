'use client'

import { useRef, useState, useTransition } from 'react'
import {
  addDeliverable,
  changeDeliverableStatus,
  removeDeliverable,
} from '@/app/dashboard/projects/deliverable-actions'
import {
  DELIVERABLE_STATUSES,
  DELIVERABLE_STATUS_LABEL,
  type DeliverableStatus,
} from '@/lib/platform/deliverable-status'
import { inputClass, labelClass, primaryButtonClass } from './styles'
import type { ProjectDeliverable } from '@/lib/db/schema'

function fmtDate(d: string | null): string | null {
  if (!d) return null
  return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// Deliverables on a project. Staff + the assigned team can add, move status, and
// remove; everyone else sees a read-only checklist.
export function ProjectDeliverables({
  projectId,
  deliverables,
  canManage,
}: {
  projectId: string
  deliverables: ProjectDeliverable[]
  canManage: boolean
}) {
  const formRef = useRef<HTMLFormElement>(null)
  const [isPending, startTransition] = useTransition()
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)

  function onAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    setError(null)
    startTransition(async () => {
      const result = await addDeliverable(projectId, formData)
      if (result.ok) {
        formRef.current?.reset()
        setAdding(false)
      } else setError(result.error)
    })
  }

  function onStatus(id: string, status: DeliverableStatus) {
    setError(null)
    setBusyId(id)
    startTransition(async () => {
      const result = await changeDeliverableStatus(id, status)
      setBusyId(null)
      if (!result.ok) setError(result.error)
    })
  }

  function onRemove(id: string) {
    setError(null)
    setBusyId(id)
    startTransition(async () => {
      const result = await removeDeliverable(id)
      setBusyId(null)
      if (!result.ok) setError(result.error)
    })
  }

  const done = deliverables.filter((d) => d.status === 'done').length

  return (
    <div className="flex flex-col gap-4">
      {deliverables.length === 0 ? (
        <p className="font-body text-on-surface-variant">No deliverables yet.</p>
      ) : (
        <>
          <span className="font-label text-xs uppercase tracking-widest text-on-surface-variant">
            {done} of {deliverables.length} done
          </span>
          <ul className="flex flex-col gap-px border border-outline-variant/30 bg-outline-variant/30">
            {deliverables.map((d) => (
              <li key={d.id} className="flex flex-wrap items-start justify-between gap-4 bg-surface px-5 py-4">
                <span className="flex min-w-0 flex-col">
                  <span className={`font-body ${d.status === 'done' ? 'text-on-surface-variant line-through' : 'text-on-surface'}`}>
                    {d.title}
                  </span>
                  {d.description && <span className="font-body text-sm text-on-surface-variant">{d.description}</span>}
                  {d.dueDate && (
                    <span className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant">
                      Due {fmtDate(d.dueDate)}
                    </span>
                  )}
                </span>
                {canManage ? (
                  <span className="flex items-center gap-3">
                    <select
                      value={d.status}
                      disabled={isPending && busyId === d.id}
                      onChange={(e) => onStatus(d.id, e.target.value as DeliverableStatus)}
                      className="border-0 border-b-2 border-transparent bg-surface-container-high px-3 py-2 text-sm text-on-surface transition-colors focus:border-secondary focus:ring-0 disabled:opacity-60"
                    >
                      {DELIVERABLE_STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {DELIVERABLE_STATUS_LABEL[s]}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => onRemove(d.id)}
                      disabled={isPending && busyId === d.id}
                      className="font-label text-xs uppercase tracking-widest text-on-surface-variant hover:text-error transition-colors disabled:opacity-60"
                    >
                      Remove
                    </button>
                  </span>
                ) : (
                  <span className="font-label text-[10px] uppercase tracking-widest text-on-tertiary-container bg-tertiary-container px-3 py-1">
                    {DELIVERABLE_STATUS_LABEL[d.status]}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </>
      )}

      {canManage &&
        (adding ? (
          <form ref={formRef} onSubmit={onAdd} className="flex flex-col gap-3 bg-surface-container-low p-5">
            <div className="flex flex-col gap-2">
              <label htmlFor="deliverable-title" className={labelClass}>
                Deliverable
              </label>
              <input id="deliverable-title" name="title" required placeholder="What needs to be produced?" disabled={isPending} className={inputClass} />
            </div>
            <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
              <input name="description" placeholder="Optional detail" disabled={isPending} className={inputClass} />
              <input name="dueDate" type="date" disabled={isPending} className={inputClass} />
            </div>
            <div className="flex items-center gap-4">
              <button type="submit" disabled={isPending} className={primaryButtonClass}>
                {isPending ? 'Adding…' : 'Add deliverable'}
              </button>
              <button type="button" onClick={() => setAdding(false)} disabled={isPending} className="font-label text-xs uppercase tracking-widest text-on-surface-variant hover:text-primary transition-colors">
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="self-start font-label text-xs uppercase tracking-widest text-primary hover:text-primary-container transition-colors"
          >
            + Add deliverable
          </button>
        ))}

      {error && (
        <div className="bg-error-container p-4 text-on-error-container">
          <p className="font-label text-xs uppercase tracking-widest">{error}</p>
        </div>
      )}
    </div>
  )
}
