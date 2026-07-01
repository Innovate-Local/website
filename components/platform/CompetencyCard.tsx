// Presentational Student Profile Card for a scored CompetencyResult. No
// interactivity — safe as a server component. Approval / re-take controls are
// composed alongside it by the page.
import type { CompetencyResult } from '@/lib/matchcore/types'

function Bar({ points, max }: { points: number; max: number }) {
  const pct = max ? Math.round((points / max) * 100) : 0
  return (
    <div className="h-2 w-full bg-surface-container-high">
      <div className="h-2 bg-primary" style={{ width: `${pct}%` }} />
    </div>
  )
}

export function CompetencyCard({ result, statusLabel }: { result: CompetencyResult; statusLabel?: string }) {
  return (
    <div className="flex flex-col gap-6 bg-surface-container p-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-label text-xs uppercase tracking-widest text-on-surface-variant">
            Composite Readiness · {result.crrTier}
          </p>
          <p className="font-heading text-4xl text-on-surface">
            {result.crr}
            <span className="text-xl text-on-surface-variant"> / {result.crrMax}</span>
          </p>
        </div>
        {statusLabel && (
          <span className="font-label text-xs uppercase tracking-widest text-on-surface-variant">{statusLabel}</span>
        )}
      </div>

      <div className="flex flex-col gap-4">
        {result.sections.map((s) => (
          <div key={s.section} className="flex flex-col gap-1.5">
            <div className="flex items-baseline justify-between gap-2">
              <span className="font-body text-sm text-on-surface">{s.label}</span>
              <span className="font-label text-xs text-on-surface-variant">
                {s.points}/{s.max} · {s.tier}
              </span>
            </div>
            <Bar points={s.points} max={s.max} />
          </div>
        ))}
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <p className="font-label text-xs uppercase tracking-widest text-on-surface-variant">Strengths</p>
          <ul className="mt-1 list-disc pl-5 font-body text-sm text-on-surface">
            {result.strengths.map((x, i) => (
              <li key={i}>{x}</li>
            ))}
          </ul>
        </div>
        <div>
          <p className="font-label text-xs uppercase tracking-widest text-on-surface-variant">Growth area</p>
          <ul className="mt-1 list-disc pl-5 font-body text-sm text-on-surface">
            {result.growthAreas.map((x, i) => (
              <li key={i}>{x}</li>
            ))}
          </ul>
        </div>
      </div>

      {result.summary && <p className="font-body text-sm text-on-surface-variant">{result.summary}</p>}

      <details className="font-body text-sm text-on-surface-variant">
        <summary className="cursor-pointer font-label text-xs uppercase tracking-widest">Evidence detail</summary>
        <div className="mt-3 flex flex-col gap-3">
          {result.sections.map((s) => (
            <div key={s.section}>
              <p className="font-label text-xs uppercase tracking-widest text-on-surface">{s.label}</p>
              <ul className="mt-1 flex flex-col gap-1">
                {s.criteria.map((c) => (
                  <li key={c.criterion} className="flex gap-2">
                    <span className="shrink-0 font-label text-xs text-outline-variant">
                      {c.points}/{c.max}
                    </span>
                    <span>{c.evidence}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </details>
    </div>
  )
}
