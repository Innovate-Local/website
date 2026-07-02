import { requireRole } from '@/lib/auth/session'
import { getFinanceSnapshot } from '@/lib/platform/finance'
import {
  getAiSpendByFeature,
  getAiSpendByOrg,
  getAiSpendByProject,
  getAiSpendSummary,
  getRecentAiEvents,
} from '@/lib/platform/ai-usage'
import { formatMoney } from '@/lib/platform/billing-plans'
import { formatMicros } from '@/lib/ai/pricing'
import { PageHeader } from '@/components/platform/PageHeader'
import { MetricGrid, Metric } from '@/components/platform/Metric'

// Live Stripe calls happen here — give the request headroom past the 10s default.
export const maxDuration = 30

const FEATURE_LABEL: Record<string, string> = {
  competency_interview: 'Competency interview',
  competency_score: 'Competency scoring',
  complexity_interview: 'Discovery interview',
  complexity_score: 'Complexity scoring',
  project_draft: 'Project drafting',
}
const featureLabel = (k: string) => FEATURE_LABEL[k] ?? k

// micro-USD → cents (1 cent = 10,000 micro-USD).
const microsToCents = (m: number) => m / 10_000

export default async function InsightsPage() {
  await requireRole('hub_staff')

  const [finance, spend30, spendAll, byFeature, byOrg, byProject, recent] = await Promise.all([
    getFinanceSnapshot(),
    getAiSpendSummary(30),
    getAiSpendSummary(),
    getAiSpendByFeature(30),
    getAiSpendByOrg(30),
    getAiSpendByProject(30),
    getRecentAiEvents(15),
  ])

  const marginCents = finance.grossVolume30dCents - microsToCents(spend30.costMicros)

  return (
    <div className="flex flex-col gap-10">
      <PageHeader eyebrow="Hub" title="Insights" />

      {/* Revenue — live from Stripe */}
      <section className="flex flex-col gap-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-heading text-2xl text-on-surface">Revenue</h2>
          <span className="font-label text-xs uppercase tracking-widest text-on-surface-variant">Live · Stripe</span>
        </div>
        {!finance.ok && (
          <p className="bg-surface-container p-4 font-body text-sm text-on-surface-variant">
            Couldn’t reach Stripe{finance.error ? `: ${finance.error}` : ''}. Figures below may be unavailable.
          </p>
        )}
        <MetricGrid>
          <Metric label="MRR" value={formatMoney(finance.mrrCents)} sub={`${finance.activeSubscriptions} active subs`} tone="primary" />
          <Metric label="Gross volume (30d)" value={formatMoney(finance.grossVolume30dCents)} sub="Succeeded charges, net refunds" />
          <Metric label="Balance available" value={formatMoney(finance.balanceAvailableCents)} />
          <Metric label="Balance pending" value={formatMoney(finance.balancePendingCents)} />
        </MetricGrid>
      </section>

      {/* AI cost */}
      <section className="flex flex-col gap-4">
        <h2 className="font-heading text-2xl text-on-surface">AI cost</h2>
        <MetricGrid>
          <Metric label="Spend (30d)" value={formatMicros(spend30.costMicros)} sub={`${spend30.calls} calls`} tone="primary" />
          <Metric label="Spend (all time)" value={formatMicros(spendAll.costMicros)} sub={`${spendAll.calls} calls`} />
          <Metric label="Tokens (30d)" value={spend30.totalTokens.toLocaleString()} />
          <Metric
            label="Revenue − AI (30d)"
            value={formatMoney(marginCents)}
            sub="Gross volume less AI cost"
          />
        </MetricGrid>
        <p className="font-body text-xs text-outline-variant">
          Cost uses placeholder model rates in <code>lib/ai/pricing.ts</code> — set them to your actual OpenAI pricing.
        </p>
      </section>

      {/* By feature */}
      <SpendTable
        title="AI spend by feature (30d)"
        rows={byFeature.map((f) => ({ label: featureLabel(f.feature), cost: f.costMicros, meta: `${f.calls} calls · ${f.tokens.toLocaleString()} tokens` }))}
      />

      {/* By org + project */}
      <div className="grid gap-8 lg:grid-cols-2">
        <SpendTable
          title="Top orgs by AI cost (30d)"
          rows={byOrg.map((o) => ({ label: o.orgName ?? 'Unknown org', cost: o.costMicros, meta: `${o.calls} calls` }))}
        />
        <SpendTable
          title="Top projects by AI cost (30d)"
          rows={byProject.map((p) => ({ label: p.title ?? 'Unknown project', cost: p.costMicros, meta: `${p.calls} calls` }))}
        />
      </div>

      {/* Recent calls */}
      <section className="flex flex-col gap-4">
        <h2 className="font-heading text-2xl text-on-surface">Recent AI calls</h2>
        <div className="flex flex-col divide-y divide-outline-variant bg-surface-container">
          {recent.length === 0 && <p className="p-4 font-body text-sm text-on-surface-variant">No AI calls recorded yet.</p>}
          {recent.map((r) => (
            <div key={r.id} className="flex flex-wrap items-baseline justify-between gap-2 p-4">
              <span className="font-body text-sm text-on-surface">{featureLabel(r.feature)}</span>
              <span className="font-label text-xs text-on-surface-variant">
                {r.model} · {r.totalTokens.toLocaleString()} tok · {formatMicros(r.costMicros)}
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

function SpendTable({ title, rows }: { title: string; rows: { label: string; cost: number; meta: string }[] }) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="font-heading text-2xl text-on-surface">{title}</h2>
      <div className="flex flex-col divide-y divide-outline-variant bg-surface-container">
        {rows.length === 0 && <p className="p-4 font-body text-sm text-on-surface-variant">No data yet.</p>}
        {rows.map((r, i) => (
          <div key={i} className="flex flex-wrap items-baseline justify-between gap-2 p-4">
            <span className="flex flex-col">
              <span className="font-body text-sm text-on-surface">{r.label}</span>
              <span className="font-label text-xs text-on-surface-variant">{r.meta}</span>
            </span>
            <span className="font-body text-sm tabular-nums text-on-surface">{formatMicros(r.cost)}</span>
          </div>
        ))}
      </div>
    </section>
  )
}
