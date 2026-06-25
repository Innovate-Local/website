'use client'

import { useRef, useState, useTransition } from 'react'
import { assignApprentice, removeAssignment } from '@/app/dashboard/projects/actions'
import { inputClass, primaryButtonClass } from './styles'
import type { TeamMember } from '@/lib/platform/projects'

type ApprenticeOption = { id: string; fullName: string | null; email: string | null }

// Staff team manager: list current members (with remove), and add an apprentice
// with a role. Read-only callers render the list separately (see the page).
export function ProjectTeam({
  projectId,
  team,
  apprentices,
}: {
  projectId: string
  team: TeamMember[]
  apprentices: ApprenticeOption[]
}) {
  const formRef = useRef<HTMLFormElement>(null)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  // Apprentices not already on the team.
  const onTeam = new Set(team.map((m) => m.userId))
  const available = apprentices.filter((a) => !onTeam.has(a.id))

  function onAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    setError(null)
    startTransition(async () => {
      const result = await assignApprentice(projectId, formData)
      if (result.ok) formRef.current?.reset()
      else setError(result.error)
    })
  }

  function onRemove(assignmentId: string) {
    setError(null)
    setBusyId(assignmentId)
    startTransition(async () => {
      const result = await removeAssignment(assignmentId, projectId)
      setBusyId(null)
      if (!result.ok) setError(result.error)
    })
  }

  return (
    <div className="flex flex-col gap-5">
      {team.length === 0 ? (
        <p className="font-body text-on-surface-variant">No one assigned yet.</p>
      ) : (
        <ul className="flex flex-col gap-px bg-outline-variant/30 border border-outline-variant/30">
          {team.map((m) => (
            <li key={m.id} className="bg-surface flex items-center justify-between gap-4 px-5 py-4">
              <span className="flex flex-col min-w-0">
                <span className="font-body text-on-surface truncate">{m.fullName || m.email || '—'}</span>
                <span className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant">
                  {m.roleOnProject}
                </span>
              </span>
              <button
                type="button"
                onClick={() => onRemove(m.id)}
                disabled={busyId === m.id}
                className="font-label text-xs uppercase tracking-widest text-on-surface-variant hover:text-error transition-colors disabled:opacity-60"
              >
                {busyId === m.id ? '…' : 'Remove'}
              </button>
            </li>
          ))}
        </ul>
      )}

      {available.length > 0 ? (
        <form ref={formRef} onSubmit={onAdd} className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <select name="userId" required defaultValue="" disabled={isPending} className={`${inputClass} flex-grow`}>
            <option value="" disabled>Add an apprentice…</option>
            {available.map((a) => (
              <option key={a.id} value={a.id}>{a.fullName || a.email}</option>
            ))}
          </select>
          <select name="roleOnProject" defaultValue="member" disabled={isPending} className={`${inputClass} sm:w-40`}>
            <option value="member">Member</option>
            <option value="lead">Lead</option>
          </select>
          <button type="submit" disabled={isPending} className={primaryButtonClass}>
            {isPending ? 'Adding...' : 'Add'}
          </button>
        </form>
      ) : (
        <p className="font-label text-xs uppercase tracking-widest text-on-surface-variant">
          {apprentices.length === 0 ? 'No apprentice accounts yet.' : 'All apprentices are on this team.'}
        </p>
      )}

      {error && (
        <div className="bg-error-container text-on-error-container p-4">
          <p className="font-label text-xs uppercase tracking-widest">{error}</p>
        </div>
      )}
    </div>
  )
}
