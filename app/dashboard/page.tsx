import Link from 'next/link'
import { requireProfile } from '@/lib/auth/session'
import { ROLE_TAGLINE } from '@/lib/platform/roles'
import type { UserRole } from '@/lib/db/schema'

// Role-routed home. For the foundation each role lands on a tailored welcome
// plus quick links to its tools. Adding a role = adding an entry to ROLE_HOME.
type HomeLink = { href: string; label: string }
const ROLE_HOME: Record<UserRole, { heading: string; blurb: string; links: HomeLink[] }> = {
  apprentice: {
    heading: 'Your apprentice workspace',
    blurb:
      'Keep your profile and resume current, and follow the projects you’re assigned to.',
    links: [
      { href: '/dashboard/projects', label: 'Your projects' },
      { href: '/dashboard/resume', label: 'Manage your resume' },
    ],
  },
  org_member: {
    heading: 'Your organization’s workspace',
    blurb:
      'Follow the projects your hub team is running for your organization.',
    links: [{ href: '/dashboard/projects', label: 'Your projects' }],
  },
  hub_staff: {
    heading: 'Hub operations',
    blurb:
      'Scope projects from organizations, assign apprentice teams, and move engagements through to delivery.',
    links: [
      { href: '/dashboard/projects', label: 'Manage projects' },
      { href: '/dashboard/people', label: 'Manage people' },
      { href: '/dashboard/organizations', label: 'Manage organizations' },
    ],
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
        <div className="flex flex-wrap gap-x-6 gap-y-2 mt-2">
          {home.links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="font-label text-xs uppercase tracking-widest text-primary hover:text-primary-container transition-colors"
            >
              {l.label} →
            </Link>
          ))}
        </div>
      </section>
    </div>
  )
}
