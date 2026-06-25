import Link from 'next/link'
import { requireProfile } from '@/lib/auth/session'
import { ROLE_TAGLINE } from '@/lib/platform/roles'
import type { UserRole } from '@/lib/db/schema'

// Role-routed home. For the foundation each role lands on a tailored welcome;
// the role-specific tools (projects, organizations, people) attach here as those
// slices ship. Adding a role = adding an entry to ROLE_HOME.
const ROLE_HOME: Record<UserRole, { heading: string; blurb: string }> = {
  apprentice: {
    heading: 'Your apprentice workspace',
    blurb:
      'This is where your profile, resume, and project assignments will live. Keep your profile current so hub staff can match you to the right work.',
  },
  org_member: {
    heading: 'Your organization’s workspace',
    blurb:
      'This is where you’ll submit problems, follow the projects your hub team is running for you, and reach your hub contacts.',
  },
  hub_staff: {
    heading: 'Hub operations',
    blurb:
      'This is where you’ll turn inquiries into scoped projects, assign apprentice teams, and track engagements to delivery.',
  },
}

export default async function DashboardHome() {
  const profile = await requireProfile()
  const home = ROLE_HOME[profile.role]
  const firstName = profile.fullName?.split(' ')[0]

  return (
    <div className="flex flex-col gap-10 max-w-3xl">
      <header className="flex flex-col gap-3">
        <span className="annotation">{ROLE_TAGLINE[profile.role]}</span>
        <h1 className="font-headline text-5xl md:text-6xl leading-[0.95] tracking-tight text-on-surface">
          {firstName ? `Welcome, ${firstName}.` : 'Welcome.'}
        </h1>
      </header>

      <section className="bg-surface-container-low p-8 md:p-10 flex flex-col gap-4">
        <h2 className="font-headline text-2xl text-on-surface">{home.heading}</h2>
        <p className="font-body text-on-surface-variant leading-relaxed">{home.blurb}</p>
        <Link
          href="/dashboard/profile"
          className="self-start mt-2 font-label text-xs uppercase tracking-widest text-primary hover:text-primary-container transition-colors"
        >
          Review your profile →
        </Link>
      </section>
    </div>
  )
}
