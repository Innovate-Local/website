'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { clearActAs, setActAs } from '@/app/dashboard/act-as/actions'
import { ROLE_LABEL } from '@/lib/platform/roles'
import type { UserRole } from '@/lib/db/schema'

type OrgOption = { id: string; name: string }
type PartnerOption = { id: string; orgName: string }

// Staff-only developer bar: view/use the app as another persona (role + org /
// partner context) without a separate login. Rendered by DashboardShell for real
// hub_staff. When a persona is active it shows on a colored bar with a one-click
// exit; otherwise it's a slim "act as" launcher.
export function ActAsBar({
  active,
  orgs,
  partners,
  orgName,
  partnerName,
}: {
  active: { role: UserRole; orgId: string | null; partnerId: string | null } | null
  orgs: OrgOption[]
  partners: PartnerOption[]
  orgName: string | null
  partnerName: string | null
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [role, setRole] = useState<UserRole>(active?.role ?? 'org_member')
  const [orgId, setOrgId] = useState(active?.orgId ?? '')
  const [partnerId, setPartnerId] = useState(active?.partnerId ?? '')
  const [isPending, startTransition] = useTransition()

  function apply() {
    const fd = new FormData()
    fd.set('role', role)
    if (orgId) fd.set('orgId', orgId)
    if (partnerId) fd.set('partnerId', partnerId)
    startTransition(async () => {
      await setActAs(fd)
      setOpen(false)
      router.refresh()
    })
  }
  function exit() {
    startTransition(async () => {
      await clearActAs()
      setOpen(false)
      router.refresh()
    })
  }

  const contextLabel = [active?.role ? ROLE_LABEL[active.role] : null, orgName, partnerName]
    .filter(Boolean)
    .join(' · ')

  return (
    <div className={active ? 'bg-inverse-surface text-inverse-on-surface' : 'bg-surface-container-high text-on-surface'}>
      <div className="mx-auto flex max-w-screen-xl flex-wrap items-center gap-3 px-6 py-2.5 md:px-12">
        <span className="font-label text-[10px] font-bold uppercase tracking-widest">
          {active ? '● Acting as' : 'Developer'}
        </span>
        {active ? (
          <span className="text-sm font-medium">{contextLabel || ROLE_LABEL[active.role]}</span>
        ) : (
          <span className="text-sm text-on-surface-variant">View the app as another account type.</span>
        )}
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => setOpen((o) => !o)}
            disabled={isPending}
            className={`font-label text-[10px] font-bold uppercase tracking-widest ${active ? 'text-inverse-primary hover:opacity-80' : 'text-primary hover:text-secondary'}`}
          >
            {open ? 'Close' : active ? 'Change' : 'Act as…'}
          </button>
          {active && (
            <button
              onClick={exit}
              disabled={isPending}
              className="bg-inverse-primary px-3 py-1 font-label text-[10px] font-bold uppercase tracking-widest text-inverse-surface hover:opacity-90"
            >
              Exit
            </button>
          )}
        </div>
      </div>

      {open && (
        <div className="border-t border-outline-variant/30 bg-surface text-on-surface">
          <div className="mx-auto flex max-w-screen-xl flex-wrap items-end gap-4 px-6 py-4 md:px-12">
            <label className="flex flex-col gap-1">
              <span className="font-label text-[10px] font-semibold uppercase tracking-widest text-on-surface-variant">
                Role
              </span>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as UserRole)}
                disabled={isPending}
                className="bg-surface-container-high px-3 py-2 text-sm outline-none"
              >
                {(['apprentice', 'org_member', 'hub_staff'] as UserRole[]).map((r) => (
                  <option key={r} value={r}>
                    {ROLE_LABEL[r]}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1">
              <span className="font-label text-[10px] font-semibold uppercase tracking-widest text-on-surface-variant">
                Organization (context)
              </span>
              <select
                value={orgId}
                onChange={(e) => setOrgId(e.target.value)}
                disabled={isPending}
                className="min-w-[200px] bg-surface-container-high px-3 py-2 text-sm outline-none"
              >
                <option value="">— none —</option>
                {orgs.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1">
              <span className="font-label text-[10px] font-semibold uppercase tracking-widest text-on-surface-variant">
                Partner console (context)
              </span>
              <select
                value={partnerId}
                onChange={(e) => setPartnerId(e.target.value)}
                disabled={isPending}
                className="min-w-[200px] bg-surface-container-high px-3 py-2 text-sm outline-none"
              >
                <option value="">— none —</option>
                {partners.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.orgName}
                  </option>
                ))}
              </select>
            </label>

            <button
              onClick={apply}
              disabled={isPending}
              className="bg-primary px-6 py-2.5 font-label text-xs font-bold uppercase tracking-widest text-on-primary hover:bg-primary-container disabled:opacity-60"
            >
              {isPending ? 'Applying…' : 'Apply'}
            </button>
            <p className="w-full text-xs text-on-surface-variant">
              You stay signed in as yourself — this only changes what you see and can do, for testing.
              Staff powers are retained, so actions still succeed.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
