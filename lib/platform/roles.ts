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

// Navigation destinations per role. Today the platform ships the shared
// foundation, so every role gets Home + Profile; role-specific destinations
// (Projects, Organizations, People, …) get added here as those slices land.
export function navForRole(role: UserRole): NavItem[] {
  const base: NavItem[] = [
    { href: '/dashboard', label: 'Home' },
    { href: '/dashboard/profile', label: 'Profile' },
  ]
  return base
}
