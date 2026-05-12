import { ArtifactPlaceholder } from '@/components/ui/ArtifactPlaceholder'

type Annotation = {
  label: string
  description: string
  position: string
}

const annotations: Annotation[] = [
  {
    label: 'Grip',
    description: 'Local, in-community, neighbor-led.',
    position: 'top-[12%] left-[4%]',
  },
  {
    label: 'Handle',
    description: 'Built on existing university and community relationships.',
    position: 'top-[4%] left-[42%]',
  },
  {
    label: 'Ferrule',
    description: 'Structured partnership — not ad-hoc.',
    position: 'bottom-[12%] left-[62%]',
  },
  {
    label: 'Edge',
    description: 'Applied deployment, not coursework.',
    position: 'top-[22%] right-[6%]',
  },
]

export function DiagonalArtifact() {
  return (
    <section className="bg-surface-container py-32 px-6 relative overflow-hidden">
      <div className="absolute top-8 right-8 font-label text-xs uppercase tracking-widest text-on-surface-variant flex items-center gap-2">
        <span className="w-4 h-px bg-on-surface-variant" />
        Section_03A // Apparatus_Study
      </div>

      <div className="max-w-7xl mx-auto">
        <div className="max-w-3xl mb-16">
          <p className="font-label text-xs uppercase tracking-widest text-on-surface-variant mb-4">
            Fig. 3 // Tool Of The Trade
          </p>
          <h2 className="font-headline text-4xl md:text-5xl tracking-tight text-on-surface leading-tight">
            One tool. Five points of contact. Local at every one.
          </h2>
        </div>

        {/* The artifact itself — rotated across the composition with annotations pinned around it */}
        <div className="relative w-full aspect-[16/9] bg-surface-container-lowest">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-[110%] -rotate-6">
              <ArtifactPlaceholder className="w-full h-auto text-on-surface" />
            </div>
          </div>

          {annotations.map((a) => (
            <div key={a.label} className={`absolute ${a.position} max-w-[180px]`}>
              <div className="flex items-start gap-2">
                <span className="w-2 h-2 bg-primary mt-1 flex-shrink-0" />
                <div>
                  <div className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant mb-1">
                    {a.label}
                  </div>
                  <div className="font-body text-sm text-on-surface leading-snug">
                    {a.description}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-16 max-w-3xl ml-auto text-right">
          <p className="font-headline italic text-2xl md:text-3xl text-on-surface-variant leading-snug">
            Neighbors, not contractors.
            <br />
            No cold starts. No parachuting in.
          </p>
        </div>
      </div>
    </section>
  )
}
