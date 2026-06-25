// Role presentation + navigation, kept in one place so adding a role or a nav
// destination is a single edit. The data model's role union lives in
// lib/db/schema.ts (UserRole); this maps it to UI.
import type { UserRole } from '@/lib/db/schema'

export const ROLE_LABEL: Record<UserRole, string> = {
  apprentice: 'Apprentice',
  org_member: 'Member',
  hub_staff: 'Hub Staff',
}

export const ROLE_TAGLINE: Record<UserRole, string> = {
  apprentice: 'Applied work, in your community.',
  org_member: 'Your organization’s hub workspace.',
  hub_staff: 'Run the hub.',
}

export type NavItem = { href: string; label: string }

// Navigation destinations per role. Home + Profile are universal; role-specific
// destinations slot in between. Extend the per-role arrays as new slices land.
export function navForRole(role: UserRole): NavItem[] {
  const home: NavItem = { href: '/dashboard', label: 'Home' }
  const profile: NavItem = { href: '/dashboard/profile', label: 'Profile' }

  switch (role) {
    case 'hub_staff':
      return [
        home,
        { href: '/dashboard/people', label: 'People' },
        { href: '/dashboard/organizations', label: 'Organizations' },
        profile,
      ]
    case 'apprentice':
      return [home, { href: '/dashboard/resume', label: 'Resume' }, profile]
    case 'org_member':
    default:
      return [home, profile]
  }
}
