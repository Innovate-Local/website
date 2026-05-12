export function GetLocal() {
  return (
    <section className="bg-surface py-24 px-6 relative">
      <div className="max-w-7xl mx-auto">
        <h2 className="font-headline text-4xl md:text-6xl tracking-tighter text-on-surface max-w-4xl mb-16">
          When local businesses thrive with AI, the whole community{' '}
          <span className="italic text-primary">rises</span>.
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          <div className="bg-surface-container-low p-12 border-t-4 border-primary">
            <span className="material-symbols-outlined text-4xl text-primary mb-6 block" aria-hidden="true">
              work
            </span>
            <h3 className="font-headline text-3xl mb-4">More jobs.</h3>
            <p className="font-body text-on-surface-variant text-sm">
              Expanding capacity necessitates expanding teams.
            </p>
          </div>
          <div className="bg-surface-container-low p-12 border-t-4 border-primary">
            <span className="material-symbols-outlined text-4xl text-primary mb-6 block" aria-hidden="true">
              trending_up
            </span>
            <h3 className="font-headline text-3xl mb-4">More revenue.</h3>
            <p className="font-body text-on-surface-variant text-sm">
              Efficiency drives margins and market reach.
            </p>
          </div>
          <div className="bg-surface-container-low p-12 border-t-4 border-primary">
            <span className="material-symbols-outlined text-4xl text-primary mb-6 block" aria-hidden="true">
              bolt
            </span>
            <h3 className="font-headline text-3xl mb-4">More capacity.</h3>
            <p className="font-body text-on-surface-variant text-sm">
              Unlocking time for strategic growth.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center border-t border-outline-variant/20 pt-16">
          <div className="lg:col-span-4">
            <div className="flex items-baseline gap-4">
              <span className="font-headline text-7xl sm:text-8xl md:text-9xl text-primary tracking-tighter leading-none">
                3×
              </span>
              <span className="font-label text-sm uppercase tracking-widest text-on-surface-variant">
                or more
              </span>
            </div>
          </div>
          <div className="lg:col-span-8">
            <p className="font-headline italic text-2xl md:text-3xl text-on-surface leading-snug max-w-2xl">
              Every dollar spent locally recirculates more than three times compared to one spent at a chain.
            </p>
            <div className="mt-6 flex flex-col gap-2 max-w-md">
              <div className="flex justify-between items-center border-b border-outline-variant/30 py-2">
                <span className="font-label text-xs font-medium uppercase tracking-widest text-on-surface">
                  Chain dollar
                </span>
                <span className="font-label text-sm text-on-surface-variant">1.0×</span>
              </div>
              <div className="flex justify-between items-center border-b border-outline-variant/30 py-2">
                <span className="font-label text-xs font-medium uppercase tracking-widest text-on-surface">
                  Local dollar
                </span>
                <span className="font-label text-sm text-primary">3.0×+</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
