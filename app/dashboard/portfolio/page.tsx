import Link from 'next/link'
import { requireRole } from '@/lib/auth/session'
import { getApprenticeTrackRecord } from '@/lib/platform/feedback'
import { ratingStars } from '@/lib/platform/feedback-types'
import { PROJECT_STATUS_LABEL } from '@/lib/platform/project-status'
import { PageHeader } from '@/components/platform/PageHeader'
import { Metric, MetricGrid } from '@/components/platform/Metric'

// An apprentice's track record: the engagements they've delivered, the credits
// committed to them, and the ratings they've earned. Grows as feedback comes in.
export default async function PortfolioPage() {
  const me = await requireRole('apprentice')
  const record = await getApprenticeTrackRecord(me.id)

  return (
    <div className="flex flex-col gap-10">
      <PageHeader eyebrow="Track record" title="Your portfolio" />

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
