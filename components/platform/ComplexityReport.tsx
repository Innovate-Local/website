// Presentational Project Complexity report for a scored ComplexityResult, plus
// the five discovery briefs. Server component (no interactivity).
import { PROJECT_TYPE_LABEL } from '@/lib/matchcore/types'
import type { ComplexityResult } from '@/lib/matchcore/types'

export function ComplexityReport({ result }: { result: ComplexityResult }) {
  return (
    <div className="flex flex-col gap-6 bg-surface-container p-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-label text-xs uppercase tracking-widest text-on-surface-variant">
            Project Complexity · {result.complexity}
          </p>
          <p className="font-heading text-4xl text-on-surface">
            {result.pcs}
            <span className="text-xl text-on-surface-variant"> / {result.pcsMax}</span>
          </p>
        </div>
        <div className="text-right">
          <p className="font-label text-xs uppercase tracking-widest text-on-surface-variant">Type</p>
          <p className="font-body text-sm text-on-surface">
            {PROJECT_TYPE_LABEL[result.projectType]}
            {result.secondaryType ? ` · ${PROJECT_TYPE_LABEL[result.secondaryType]}` : ''}
          </p>
          <p className="font-label text-xs text-outline-variant">{result.classificationConfidence} confidence</p>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {result.dimensions.map((d) => (
          <div key={d.dimension} className="flex flex-col gap-1">
            <div className="flex items-baseline justify-between gap-2">
              <span className="font-body text-sm text-on-surface">{d.label}</span>
              <span className="font-label text-xs text-on-surface-variant">
                {d.points}/{d.max}
              </span>
            </div>
            <p className="font-body text-xs text-on-surface-variant">{d.rationale}</p>
          </div>
        ))}
      </div>

      {result.summary && <p className="font-body text-sm text-on-surface-variant">{result.summary}</p>}

      <details className="font-body text-sm text-on-surface-variant">
        <summary className="cursor-pointer font-label text-xs uppercase tracking-widest">Discovery briefs</summary>
        <div className="mt-3 flex flex-col gap-4">
          {result.briefs.map((b) => (
            <div key={b.key}>
              <p className="font-label text-xs uppercase tracking-widest text-on-surface">
                {b.key} · {b.title}
              </p>
              <p className="mt-1 whitespace-pre-wrap">{b.content}</p>
            </div>
          ))}
        </div>
      </details>
    </div>
  )
}
