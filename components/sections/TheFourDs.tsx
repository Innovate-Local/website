import { TiltCard } from '@/components/ui/TiltCard'

const principles = [
  {
    number: '01',
    title: 'Expand.',
    icon: 'groups',
    body: 'Access to capabilities that were previously reserved for large organizations.',
  },
  {
    number: '02',
    title: 'Simplify.',
    icon: 'cloud_off',
    body: 'No server rooms. No IT departments. No six-month implementation cycles.',
  },
  {
    number: '03',
    title: 'Reduce.',
    icon: 'savings',
    body: 'AI tools do in minutes what used to take days of billable hours.',
  },
  {
    number: '04',
    title: 'Connect.',
    icon: 'hub',
    body: 'Local businesses connected directly to the intelligence they need. No middlemen.',
  },
]

export function TheFourDs() {
  return (
    <section
      id="the-four-ds"
      className="bg-surface-container-highest py-24 px-6 relative border-t-8 border-surface"
    >
      <div className="max-w-7xl mx-auto">
        <div className="mb-16 border-b-2 border-surface-container-high pb-6">
          <h2 className="font-headline text-4xl md:text-5xl tracking-tight text-on-surface">
            What AI <span className="italic text-primary">unlocks</span>.
          </h2>
        </div>

        <div
          className="grid grid-cols-1 md:grid-cols-2 gap-8"
          style={{ perspective: '1400px' }}
        >
          {principles.map(({ number, title, icon, body }) => (
            <TiltCard key={number}>
              <div className="bg-surface border border-outline-variant/30 shadow-[0_20px_60px_-20px_rgba(126,87,0,0.18)] p-10 md:p-12 min-h-[360px] flex flex-col gap-6">
                <div className="flex items-center justify-between border-b border-outline-variant/25 pb-4">
                  <span className="font-label text-xs font-medium uppercase tracking-widest text-primary">
                    {number} / 04
                  </span>
                  <span className="material-symbols-outlined text-3xl text-primary" aria-hidden="true">
                    {icon}
                  </span>
                </div>
                <div className="flex-grow flex flex-col justify-between gap-6">
                  <h3 className="font-headline text-4xl md:text-5xl lg:text-6xl text-on-surface tracking-tight leading-none">
                    {title}
                  </h3>
                  <p className="font-body text-base text-on-surface-variant leading-relaxed">
                    {body}
                  </p>
                </div>
              </div>
            </TiltCard>
          ))}
        </div>
      </div>
    </section>
  )
}
