'use client'

import { useState, useTransition } from 'react'
import { removeMember, setMemberRole } from '@/app/dashboard/organizations/actions'
import { ORG_ROLES, ORG_ROLE_LABEL, type OrgRole } from '@/lib/platform/roles'
import type { OrgMemberRow } from '@/lib/platform/credits'

// The org's people + hierarchy. Read-only for members; managers (org admins and
// hub staff) get an inline role selector and a remove control per person.
export function OrgMembersPanel({
  orgId,
  members,
  canManage,
}: {
  orgId: string
  members: OrgMemberRow[]
  canManage: boolean
}) {
  const [isPending, startTransition] = useTransition()
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  function onRole(membershipId: string, role: OrgRole) {
    setError(null)
    setBusyId(membershipId)
    startTransition(async () => {
      const result = await setMemberRole(orgId, membershipId, role)
      setBusyId(null)
      if (!result.ok) setError(result.error)
    })
  }

  function onRemove(membershipId: string) {
    setError(null)
    setBusyId(membershipId)
    startTransition(async () => {
      const result = await removeMember(orgId, membershipId)
      setBusyId(null)
      if (!result.ok) setError(result.error)
    })
  }

  if (members.length === 0) {
    return <p className="font-body text-on-surface-variant">No members yet.</p>
  }

  return (
    <div className="flex flex-col gap-4">
      <ul className="flex flex-col gap-px border border-outline-variant/30 bg-outline-variant/30">
        {members.map((m) => (
          <li key={m.membershipId} className="flex flex-wrap items-center justify-between gap-4 bg-surface px-5 py-4">
            <span className="flex min-w-0 flex-col">
              <span className="truncate font-body text-on-surface">{m.fullName || '—'}</span>
              <span className="break-all font-label text-xs text-on-surface-variant">{m.email}</span>
            </span>
            {canManage ? (
              <span className="flex items-center gap-3">
                <select
                  value={m.roleInOrg}
                  disabled={isPending && busyId === m.membershipId}
                  onChange={(e) => onRole(m.membershipId, e.target.value as OrgRole)}
                  className="border-0 border-b-2 border-transparent bg-surface-container-high px-3 py-2 text-sm text-on-surface transition-colors focus:border-secondary focus:ring-0 disabled:opacity-60"
                >
                  {ORG_ROLES.map((r) => (
                    <option key={r} value={r}>
                      {ORG_ROLE_LABEL[r]}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => onRemove(m.membershipId)}
                  disabled={isPending && busyId === m.membershipId}
                  className="font-label text-xs uppercase tracking-widest text-on-surface-variant transition-colors hover:text-error disabled:opacity-60"
                >
                  {busyId === m.membershipId ? '…' : 'Remove'}
                </button>
              </span>
            ) : (
              <span className="font-label text-[10px] uppercase tracking-widest text-on-tertiary-container bg-tertiary-container px-3 py-1">
                {ORG_ROLE_LABEL[m.roleInOrg]}
              </span>
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
