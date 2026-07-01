'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { clearActAs, setActAs } from '@/app/dashboard/act-as/actions'
import { ORG_ROLES, ORG_ROLE_LABEL, type OrgRole } from '@/lib/platform/roles'
import { PARTNER_ROLES, PARTNER_ROLE_LABEL, type PartnerRole } from '@/lib/platform/partner-constants'
import type { UserRole } from '@/lib/db/schema'

type OrgOption = { id: string; name: string }
type PartnerOption = { id: string; orgId: string; orgName: string }

// The kinds of user we actually test the app as. This is the vocabulary of the
// tool — a persona bundles a platform role with the context that persona needs,
// so you can't accidentally end up "an org member of no organization".
type Persona = 'apprentice' | 'org_member' | 'partner' | 'hub_staff'

const PERSONA_LABEL: Record<Persona, string> = {
  apprentice: 'Apprentice',
  org_member: 'Organization member',
  partner: 'Partner user',
  hub_staff: 'Hub staff (you)',
}

const PERSONA_HINT: Record<Persona, string> = {
  apprentice: 'An individual doing applied work. No organization or partner context.',
  org_member: 'A member of an organization — pick which one to manage its projects and credits.',
  partner: 'An authorized user on a Community Innovation Partner — pick which partner.',
  hub_staff: 'Your normal view. Applying this clears the persona.',
}

// Reconstruct the persona from a stored "act as" state. A partner context always
// reads as the partner persona; otherwise the platform role is the persona.
function personaFromActive(a: { role: UserRole; partnerId: string | null } | null): Persona {
  if (!a) return 'org_member'
  if (a.partnerId) return 'partner'
  return a.role as Persona
}

// Staff-only developer bar: view/use the app as another persona (a kind of user +
// the context it needs) without a separate login. Rendered by DashboardShell for
// real hub_staff. When a persona is active it shows on a colored bar with a
// one-click exit; otherwise it's a slim "act as" launcher.
export function ActAsBar({
  active,
  orgs,
  partners,
  orgName,
  partnerName,
}: {
  active:
    | { role: UserRole; orgId: string | null; partnerId: string | null; orgRole: OrgRole; partnerRole: PartnerRole }
    | null
  orgs: OrgOption[]
  partners: PartnerOption[]
  orgName: string | null
  partnerName: string | null
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [persona, setPersona] = useState<Persona>(personaFromActive(active))
  const [orgId, setOrgId] = useState(active?.orgId ?? '')
  const [partnerId, setPartnerId] = useState(active?.partnerId ?? '')
  const [orgRole, setOrgRole] = useState<OrgRole>(active?.orgRole ?? 'admin')
  const [partnerRole, setPartnerRole] = useState<PartnerRole>(active?.partnerRole ?? 'admin')
  const [isPending, startTransition] = useTransition()

  // What context the chosen persona requires before it can be applied.
  const needsOrg = persona === 'org_member'
  const needsPartner = persona === 'partner'
  const canApply = (!needsOrg || Boolean(orgId)) && (!needsPartner || Boolean(partnerId))

  function apply() {
    if (!canApply) return
    const fd = new FormData()
    if (persona === 'apprentice') {
      fd.set('role', 'apprentice')
    } else if (persona === 'org_member') {
      fd.set('role', 'org_member')
      fd.set('orgId', orgId)
      fd.set('orgRole', orgRole)
    } else if (persona === 'partner') {
      // A partner user is scoped to its partner AND that partner's own org, so
      // the console and the org workspace both work under the persona.
      fd.set('role', 'org_member')
      fd.set('partnerId', partnerId)
      fd.set('partnerRole', partnerRole)
      const org = partners.find((p) => p.id === partnerId)?.orgId
      if (org) fd.set('orgId', org)
    } else {
      // hub_staff with no context — setActAs treats this as "clear persona".
      fd.set('role', 'hub_staff')
    }
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

  const activePersona = active ? personaFromActive(active) : null
  const activeContext =
    activePersona === 'partner' ? partnerName : activePersona === 'org_member' ? orgName : null
  const activeSubRole =
    activePersona === 'partner'
      ? PARTNER_ROLE_LABEL[active!.partnerRole]
      : activePersona === 'org_member'
        ? ORG_ROLE_LABEL[active!.orgRole]
        : null
  const contextLabel = activePersona
    ? [PERSONA_LABEL[activePersona], activeSubRole, activeContext].filter(Boolean).join(' · ')
    : ''

  return (
    <div className={active ? 'bg-inverse-surface text-inverse-on-surface' : 'bg-surface-container-high text-on-surface'}>
      <div className="mx-auto flex max-w-screen-xl flex-wrap items-center gap-3 px-6 py-2.5 md:px-12">
        <span className="font-label text-[10px] font-bold uppercase tracking-widest">
          {active ? '● Acting as' : 'Developer'}
        </span>
        {active ? (
          <span className="text-sm font-medium">{contextLabel || PERSONA_LABEL[personaFromActive(active)]}</span>
        ) : (
          <span className="text-sm text-on-surface-variant">View the app as another kind of user.</span>
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
                Act as
              </span>
              <select
                value={persona}
                onChange={(e) => setPersona(e.target.value as Persona)}
                disabled={isPending}
                className="min-w-[200px] bg-surface-container-high px-3 py-2 text-sm outline-none"
              >
                {(['apprentice', 'org_member', 'partner', 'hub_staff'] as Persona[]).map((p) => (
                  <option key={p} value={p}>
                    {PERSONA_LABEL[p]}
                  </option>
                ))}
              </select>
            </label>

            {/* Only the context the chosen persona actually needs is shown. */}
            {needsOrg && (
              <label className="flex flex-col gap-1">
                <span className="font-label text-[10px] font-semibold uppercase tracking-widest text-on-surface-variant">
                  Organization <span className="text-error">*</span>
                </span>
                <select
                  value={orgId}
                  onChange={(e) => setOrgId(e.target.value)}
                  disabled={isPending}
                  className="min-w-[220px] bg-surface-container-high px-3 py-2 text-sm outline-none"
                >
                  <option value="">— choose an organization —</option>
                  {orgs.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name}
                    </option>
                  ))}
                </select>
              </label>
            )}

            {needsOrg && (
              <label className="flex flex-col gap-1">
                <span className="font-label text-[10px] font-semibold uppercase tracking-widest text-on-surface-variant">
                  Role in org
                </span>
                <select
                  value={orgRole}
                  onChange={(e) => setOrgRole(e.target.value as OrgRole)}
                  disabled={isPending}
                  className="bg-surface-container-high px-3 py-2 text-sm outline-none"
                >
                  {ORG_ROLES.map((r) => (
                    <option key={r} value={r}>
                      {ORG_ROLE_LABEL[r]}
                    </option>
                  ))}
                </select>
              </label>
            )}

            {needsPartner && (
              <label className="flex flex-col gap-1">
                <span className="font-label text-[10px] font-semibold uppercase tracking-widest text-on-surface-variant">
                  Partner <span className="text-error">*</span>
                </span>
                <select
                  value={partnerId}
                  onChange={(e) => setPartnerId(e.target.value)}
                  disabled={isPending}
                  className="min-w-[220px] bg-surface-container-high px-3 py-2 text-sm outline-none"
                >
                  <option value="">— choose a partner —</option>
                  {partners.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.orgName}
                    </option>
                  ))}
                </select>
              </label>
            )}

            {needsPartner && (
              <label className="flex flex-col gap-1">
                <span className="font-label text-[10px] font-semibold uppercase tracking-widest text-on-surface-variant">
                  Partner role
                </span>
                <select
                  value={partnerRole}
                  onChange={(e) => setPartnerRole(e.target.value as PartnerRole)}
                  disabled={isPending}
                  className="bg-surface-container-high px-3 py-2 text-sm outline-none"
                >
                  {PARTNER_ROLES.map((r) => (
                    <option key={r} value={r}>
                      {PARTNER_ROLE_LABEL[r]}
                    </option>
                  ))}
                </select>
              </label>
            )}

            <button
              onClick={apply}
              disabled={isPending || !canApply}
              className="bg-primary px-6 py-2.5 font-label text-xs font-bold uppercase tracking-widest text-on-primary hover:bg-primary-container disabled:opacity-60"
            >
              {isPending ? 'Applying…' : 'Apply'}
            </button>

            <p className="w-full text-xs text-on-surface-variant">
              {PERSONA_HINT[persona]}
              {!canApply && (
                <span className="text-error">
                  {' '}
                  {needsOrg ? 'Select an organization to continue.' : 'Select a partner to continue.'}
                </span>
              )}
            </p>
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
