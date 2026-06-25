// Standard dashboard page header (eyebrow + headline + optional actions),
// matching the marketing site's annotation/headline treatment.
export function PageHeader({
  eyebrow,
  title,
  actions,
}: {
  eyebrow: string
  title: string
  actions?: React.ReactNode
}) {
  return (
    <header className="flex flex-col gap-3 mb-10 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex flex-col gap-3">
        <span className="annotation">{eyebrow}</span>
        <h1 className="font-headline text-5xl md:text-6xl leading-[0.95] tracking-tight text-on-surface">
          {title}
        </h1>
      </div>
      {actions}
    </header>
  )
}
