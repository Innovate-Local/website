const hubServices = [
  {
    icon: 'school',
    label: 'Training',
    body: 'Workshops and seminars for local businesses and non-profits on AI adoption.',
  },
  {
    icon: 'handshake',
    label: 'Consulting',
    body: 'Hands-on help assessing needs, selecting tools, deploying solutions.',
  },
  {
    icon: 'groups',
    label: 'Experience',
    body: 'University students doing applied deployment work as part of their experiential learning.',
  },
  {
    icon: 'forum',
    label: 'Community',
    body: 'Regular programming keeping local organizations connected and learning.',
  },
]

function ArrowRight() {
  return (
    <svg className="text-primary hidden md:block flex-shrink-0" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" aria-hidden="true">
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  )
}

function ArrowLeft() {
  return (
    <svg className="text-primary hidden md:block flex-shrink-0" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" aria-hidden="true">
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 5 12 12 19" />
    </svg>
  )
}

function ArrowDown() {
  return (
    <svg className="text-primary md:hidden" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" aria-hidden="true">
      <line x1="12" y1="5" x2="12" y2="19" />
      <polyline points="19 12 12 19 5 12" />
    </svg>
  )
}

function ArrowUp() {
  return (
    <svg className="text-primary md:hidden" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" aria-hidden="true">
      <line x1="12" y1="5" x2="12" y2="19" />
      <polyline points="5 12 12 5 19 12" />
    </svg>
  )
}

export function Apparatus() {
  return (
    <section className="bg-surface py-24 px-6 relative">
      <div className="max-w-7xl mx-auto">
        {/* Partnership flow — the three-way structure */}
        <div className="mb-32">
          <h2 className="font-headline text-4xl mb-12 text-center text-on-surface-variant">
            The Infrastructure Flow
          </h2>

          <div className="flex flex-col md:flex-row items-center justify-between gap-8 max-w-4xl mx-auto">
            <div className="bg-surface-container-low p-8 text-center w-full md:w-1/3 relative border border-outline-variant/20">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-surface px-2 font-label text-[10px] text-on-surface-variant uppercase">
                Node_A
              </div>
              <span className="font-headline text-2xl">Universities</span>
              <p className="font-label text-[11px] text-on-surface-variant mt-2 uppercase tracking-wider">
                Provide the talent
              </p>
            </div>

            <ArrowRight />
            <ArrowDown />

            <div className="bg-primary p-8 text-center w-full md:w-1/3 text-on-primary relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary px-2 font-label text-[10px] text-on-primary uppercase">
                Router
              </div>
              <span className="font-headline text-2xl">InnovateLocal</span>
              <p className="font-label text-[11px] text-on-primary mt-2 uppercase tracking-wider opacity-80">
                Provides the structure
              </p>
            </div>

            <ArrowLeft />
            <ArrowUp />

            <div className="bg-surface-container-low p-8 text-center w-full md:w-1/3 relative border border-outline-variant/20">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-surface px-2 font-label text-[10px] text-on-surface-variant uppercase">
                Node_B
              </div>
              <span className="font-headline text-2xl">Organizations</span>
              <p className="font-label text-[11px] text-on-surface-variant mt-2 uppercase tracking-wider">
                Provide the problems
              </p>
            </div>
          </div>
        </div>

        {/* Four hub services — the concrete mechanics */}
        <div className="mb-32">
          <div className="mb-12 border-b-2 border-surface-container-high pb-6">
            <h2 className="font-headline text-4xl md:text-5xl tracking-tight text-on-surface">
              What a hub does.
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-px bg-outline-variant/20">
            {hubServices.map((service) => (
              <div
                key={service.label}
                className="bg-surface p-10 flex flex-col gap-6"
              >
                <span className="material-symbols-outlined text-4xl text-primary" aria-hidden="true">
                  {service.icon}
                </span>
                <div>
                  <h3 className="font-headline text-2xl mb-3 text-on-surface">
                    {service.label}
                  </h3>
                  <p className="font-body text-sm text-on-surface-variant leading-relaxed">
                    {service.body}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* The brand anchor pair — "some of the tools / all of the benefit" */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
          <div>
            <h2 className="font-headline text-4xl md:text-5xl leading-tight text-on-surface">
              Some of the tools come from the broader ecosystem.
            </h2>
          </div>
          <div className="bg-surface-container-low p-12">
            <h2 className="font-headline text-4xl md:text-5xl leading-tight text-primary">
              All of the benefit stays <span className="italic">local</span>.
            </h2>
          </div>
        </div>
      </div>
    </section>
  )
}
