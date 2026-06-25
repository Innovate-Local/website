'use client'

import { useState, useTransition } from 'react'
import { setProjectStatus } from '@/app/dashboard/projects/actions'
import { PROJECT_STATUSES, PROJECT_STATUS_LABEL, type ProjectStatus } from '@/lib/platform/project-status'

// Staff control to advance/change a project's status, with a visual stepper of
// the lifecycle above the selector.
export function ProjectStatusControl({
  projectId,
  status,
}: {
  projectId: string
  status: ProjectStatus
}) {
  const [current, setCurrent] = useState<ProjectStatus>(status)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function onChange(next: ProjectStatus) {
    const previous = current
    setCurrent(next)
    setError(null)
    startTransition(async () => {
      const result = await setProjectStatus(projectId, next)
      if (!result.ok) {
        setCurrent(previous)
        setError(result.error)
      }
    })
  }

  const currentIndex = PROJECT_STATUSES.indexOf(current)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        {PROJECT_STATUSES.map((s, i) => (
          <span
            key={s}
            className={`font-label text-[10px] uppercase tracking-widest px-3 py-1 ${
              i <= currentIndex
                ? 'bg-primary text-on-primary'
                : 'bg-surface-container-high text-on-surface-variant'
            }`}
          >
            {PROJECT_STATUS_LABEL[s]}
          </span>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <label htmlFor="status" className="font-label text-xs uppercase tracking-widest text-on-surface-variant">
          Set status
        </label>
        <select
          id="status"
          value={current}
          disabled={isPending}
          onChange={(e) => onChange(e.target.value as ProjectStatus)}
          className="bg-surface-container-high border-0 border-b-2 border-transparent text-on-surface py-2 px-3 text-sm focus:ring-0 focus:border-secondary transition-colors disabled:opacity-60"
        >
          {PROJECT_STATUSES.map((s) => (
            <option key={s} value={s}>{PROJECT_STATUS_LABEL[s]}</option>
          ))}
        </select>
        {error && <span className="font-label text-[10px] uppercase tracking-widest text-error">{error}</span>}
      </div>
    </div>
  )
}
