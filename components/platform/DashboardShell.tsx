import Link from 'next/link'
import type { Profile } from '@/lib/db/schema'
import { navForRole } from '@/lib/platform/roles'
import { getPartnerForUser } from '@/lib/platform/partners'
import { RoleBadge } from './RoleBadge'
import { DashboardNav } from './DashboardNav'

// Authenticated app frame: brand + role + nav in a sidebar (desktop) / header
// (mobile), with the page content beside it. Server component; the only
// interactive piece (active-link highlighting) lives in DashboardNav.
export async function DashboardShell({
  profile,
  children,
}: {
  profile: Profile
  children: React.ReactNode
}) {
  const items = navForRole(profile.role)

  // Authorized users on a Community Innovation Partner get a console link,
  // regardless of their platform role. Slot it in before Profile (last item).
  if (profile.role !== 'hub_staff' && (await getPartnerForUser(profile.id))) {
    items.splice(Math.max(0, items.length - 1), 0, {
      href: '/dashboard/partner',
      label: 'Partner Console',
    })
  }

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-surface">
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
  )
}
