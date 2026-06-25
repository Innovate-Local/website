import type { Metadata } from 'next'
import { requireProfile } from '@/lib/auth/session'
import { DashboardShell } from '@/components/platform/DashboardShell'

export const metadata: Metadata = {
  title: 'Dashboard // InnovateLocal',
  robots: { index: false, follow: false },
}

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  // Gate + load the profile once for the whole authenticated tree. Middleware
  // already blocks anonymous access; this also guarantees a provisioned profile.
  const profile = await requireProfile()

  return <DashboardShell profile={profile}>{children}</DashboardShell>
}
