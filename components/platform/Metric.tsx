// Presentational metric card + grid. Server-safe (no client hooks), shared by
// the dashboard home and the credits console. Modern Bureau: square corners,
// serif numerals, the primary tone inverts for the headline figure.
import type { ReactNode } from 'react'

export function MetricGrid({ children }: { children: ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-px bg-outline-variant/30 border border-outline-variant/30 sm:grid-cols-2 lg:grid-cols-4">
      {children}
    </div>
  )
}

export function Metric({
  label,
  value,
  sub,
  tone = 'default',
}: {
  label: string
  value: ReactNode
  sub?: ReactNode
  tone?: 'default' | 'primary'
}) {
  const primary = tone === 'primary'
  return (
    <div className={`flex flex-col gap-2 p-7 ${primary ? 'bg-inverse-surface' : 'bg-surface'}`}>
      <span
        className={`font-label text-xs font-semibold uppercase tracking-widest ${
          primary ? 'text-inverse-on-surface/70' : 'text-on-surface-variant'
        }`}
      >
        {label}
      </span>
      <span
        className={`font-headline text-5xl leading-none tracking-tight ${
          primary ? 'text-inverse-on-surface' : 'text-on-surface'
        }`}
      >
        {value}
      </span>
      {sub != null && (
        <span
          className={`text-sm leading-snug ${primary ? 'text-inverse-on-surface/60' : 'text-on-surface-variant'}`}
        >
          {sub}
        </span>
      )}
    </div>
  )
}
