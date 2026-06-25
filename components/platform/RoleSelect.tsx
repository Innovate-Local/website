'use client'

import { useState, useTransition } from 'react'
import type { UserRole } from '@/lib/db/schema'
import { ROLE_LABEL } from '@/lib/platform/roles'
import { setUserRole } from '@/app/dashboard/people/actions'

const ROLES: UserRole[] = ['apprentice', 'org_member', 'hub_staff']

// Inline role editor for the People table. Optimistic-feeling: shows a pending
// state while the server action runs, and surfaces errors inline.
export function RoleSelect({ userId, role }: { userId: string; role: UserRole }) {
  const [current, setCurrent] = useState<UserRole>(role)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function onChange(next: UserRole) {
    const previous = current
    setCurrent(next)
    setError(null)
    startTransition(async () => {
      const result = await setUserRole(userId, next)
      if (!result.ok) {
        setCurrent(previous)
        setError(result.error)
      }
    })
  }

  return (
    <div className="flex flex-col gap-1">
      <select
        value={current}
        disabled={isPending}
        onChange={(e) => onChange(e.target.value as UserRole)}
        className="bg-surface-container-high border-0 border-b-2 border-transparent text-on-surface py-2 px-3 text-sm focus:ring-0 focus:border-secondary transition-colors disabled:opacity-60"
      >
        {ROLES.map((r) => (
          <option key={r} value={r}>
            {ROLE_LABEL[r]}
          </option>
        ))}
      </select>
      {error && <span className="font-label text-[10px] uppercase tracking-widest text-error">{error}</span>}
    </div>
  )
}
