import Link from 'next/link'
import type { Profile } from '@/lib/db/schema'
import { getActAs, getRealProfile } from '@/lib/auth/session'
import { navForRole } from '@/lib/platform/roles'
import { getPartnerForUser, listPartners } from '@/lib/platform/partners'
import { listAllOrgs } from '@/lib/platform/credits'
import { RoleBadge } from './RoleBadge'
import { DashboardNav } from './DashboardNav'
import { ActAsBar } from './ActAsBar'

// Authenticated app frame: brand + role + nav in a sidebar (desktop) / header
// (mobile), with the page content beside it. Server component; the only
// interactive pieces (active-link highlighting, act-as switcher) are children.
export async function DashboardShell({
  profile,
  children,
}: {
  profile: Profile
  children: React.ReactNode
}) {
  const items = navForRole(profile.role)

  // Real (unimpersonated) identity — the "act as" tool is for real hub_staff.
  const real = await getRealProfile()
  const isStaff = real?.role === 'hub_staff'
  const actAs = isStaff ? await getActAs() : null

  // Authorized users on a Community Innovation Partner get a console link,
  // regardless of their platform role — as does a staff dev acting as a partner.
  // While impersonating (actAs set), the link tracks the persona's partner
  // context only; the real staff account's own membership must not leak into
  // every persona.
  const showPartner = actAs
    ? Boolean(actAs.partnerId)
    : profile.role !== 'hub_staff' && Boolean(await getPartnerForUser(profile.id))
  if (showPartner && !items.some((i) => i.href === '/dashboard/partner')) {
    items.splice(Math.max(0, items.length - 1), 0, {
      href: '/dashboard/partner',
      label: 'Partner Console',
    })
  }

  // Act-as bar (staff only): persona status + switcher.
  let bar: React.ReactNode = null
  if (isStaff) {
    const [orgs, partners] = await Promise.all([listAllOrgs(), listPartners()])
    const partnerOptions = partners.map((p) => ({ id: p.id, orgId: p.orgId, orgName: p.orgName }))
    bar = (
      <ActAsBar
        active={actAs}
        orgs={orgs}
        partners={partnerOptions}
        orgName={actAs?.orgId ? (orgs.find((o) => o.id === actAs.orgId)?.name ?? null) : null}
        partnerName={
          actAs?.partnerId ? (partnerOptions.find((p) => p.id === actAs.partnerId)?.orgName ?? null) : null
        }
      />
    )
  }

  return (
    <div className="min-h-screen w-full flex flex-col bg-surface">
      {bar}
      <div className="flex w-full flex-grow flex-col lg:flex-row">
        <aside className="lg:w-72 lg:min-h-screen border-b lg:border-b-0 lg:border-r border-outline-variant/30 flex flex-col gap-8 p-6 lg:p-8">
          <div className="flex items-center justify-between lg:flex-col lg:items-start gap-4">
            <Link href="/dashboard" className="font-headline text-2xl tracking-tight text-on-surface">
              InnovateLocal
            </Link>
            <RoleBadge role={profile.role} />
          </div>

          <DashboardNav items={items} />

          <div className="mt-auto flex flex-col gap-3 pt-6 border-t border-outline-variant/30">
            <div className="font-label text-xs text-on-surface-variant truncate">
              {profile.fullName || profile.email}
            </div>
            <form action="/auth/signout" method="post">
              <button
                type="submit"
                className="font-label text-xs uppercase tracking-widest text-on-surface-variant hover:text-primary transition-colors"
              >
                Sign out
              </button>
            </form>
          </div>
        </aside>

        <main id="main-content" className="flex-grow w-full max-w-screen-xl mx-auto px-6 md:px-12 py-10 md:py-16">
          {children}
        </main>
      </div>
    </div>
  )
}
