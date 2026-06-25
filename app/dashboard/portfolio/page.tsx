import Link from 'next/link'
import { requireRole } from '@/lib/auth/session'
import { getApprenticeTrackRecord } from '@/lib/platform/feedback'
import { ratingStars } from '@/lib/platform/feedback-types'
import { getApprenticeProfile } from '@/lib/platform/apprentice-profile'
import { AVAILABILITY_LABEL, LINK_FIELDS, type Availability } from '@/lib/platform/apprentice-fields'
import { PROJECT_STATUS_LABEL } from '@/lib/platform/project-status'
import { PageHeader } from '@/components/platform/PageHeader'
import { Metric, MetricGrid } from '@/components/platform/Metric'

// An apprentice's track record: the engagements they've delivered, the credits
// committed to them, and the ratings they've earned. Grows as feedback comes in.
export default async function PortfolioPage() {
  const me = await requireRole('apprentice')
  const [record, profile] = await Promise.all([
    getApprenticeTrackRecord(me.id),
    getApprenticeProfile(me.id),
  ])
  const links = (profile?.links ?? {}) as Record<string, string>

  return (
    <div className="flex flex-col gap-10">
      <PageHeader eyebrow="Track record" title="Your portfolio" />

      {/* Profile summary */}
      <section className="flex flex-col gap-4 bg-surface-container-low p-6 md:p-8">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            <span className="font-headline text-2xl text-on-surface">{me.fullName || 'Your profile'}</span>
            {profile?.headline && <span className="font-body text-on-surface-variant">{profile.headline}</span>}
          </div>
          <div className="flex flex-col items-end gap-1">
            {profile?.availability && (
              <span className="font-label text-[10px] uppercase tracking-widest text-on-tertiary-container bg-tertiary-container px-3 py-1">
                {AVAILABILITY_LABEL[profile.availability as Availability]}
                {profile.hoursPerWeek ? ` · ${profile.hoursPerWeek}h/wk` : ''}
              </span>
            )}
            <Link href="/dashboard/profile" className="font-label text-xs uppercase tracking-widest text-primary hover:text-primary-container transition-colors">
              Edit profile →
            </Link>
          </div>
        </div>
        {profile?.bio && <p className="max-w-2xl font-body text-on-surface-variant">{profile.bio}</p>}
        {profile && profile.skills.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {profile.skills.map((s) => (
              <span key={s} className="bg-surface-container-high px-3 py-1 font-label text-[10px] uppercase tracking-wider text-on-surface-variant">
                {s}
              </span>
            ))}
          </div>
        )}
        {Object.keys(links).length > 0 && (
          <div className="flex flex-wrap gap-x-5 gap-y-1">
            {LINK_FIELDS.filter((l) => links[l.key]).map((l) => (
              <a key={l.key} href={links[l.key]} target="_blank" rel="noreferrer" className="font-label text-xs uppercase tracking-widest text-primary hover:text-primary-container transition-colors">
                {l.label} ↗
              </a>
            ))}
          </div>
        )}
        {!profile && (
          <p className="font-body text-on-surface-variant">
            Add your skills and availability on your{' '}
            <Link href="/dashboard/profile" className="text-primary hover:text-primary-container">
              profile
            </Link>{' '}
            so the hub can match you to projects.
          </p>
        )}
      </section>

      <MetricGrid>
        <Metric tone="primary" label="Projects delivered" value={record.completedCount} sub="Completed engagements" />
        <Metric
          label="Average rating"
          value={record.avgRating != null ? record.avgRating.toFixed(1) : '—'}
          sub={record.ratingCount > 0 ? `${record.ratingCount} ${record.ratingCount === 1 ? 'rating' : 'ratings'}` : 'No ratings yet'}
        />
        <Metric label="Ratings received" value={record.ratingCount} sub="From organizations" />
        <Metric label="Credits committed" value={record.totalCredits.toLocaleString()} sub="To your projects" />
      </MetricGrid>

      <section className="flex flex-col gap-4">
        <h2 className="font-headline text-2xl text-on-surface">Delivered projects</h2>
        {record.projects.length === 0 ? (
          <p className="bg-surface-container-low p-8 font-body text-on-surface-variant">
            Your delivered projects will appear here once engagements you’re on are completed.
          </p>
        ) : (
          <ul className="flex flex-col gap-px border border-outline-variant/30 bg-outline-variant/30">
            {record.projects.map((p) => (
              <li key={p.id}>
                <Link href={`/dashboard/projects/${p.id}`} className="flex flex-wrap items-center justify-between gap-4 bg-surface px-5 py-4 hover:bg-surface-container-low transition-colors">
                  <span className="flex min-w-0 flex-col">
                    <span className="font-body text-on-surface">{p.title}</span>
                    <span className="font-label text-xs uppercase tracking-widest text-on-surface-variant">
                      {[p.orgName, p.roleOnProject, PROJECT_STATUS_LABEL[p.status]].filter(Boolean).join(' · ')}
                      {p.creditsSpent > 0 ? ` · ${p.creditsSpent} credits` : ''}
                    </span>
                  </span>
                  <span className="text-primary" title={p.avgRating != null ? `${p.avgRating} / 5` : 'Not rated'}>
                    {p.avgRating != null ? ratingStars(p.avgRating) : '—'}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
