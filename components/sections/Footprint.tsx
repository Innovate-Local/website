import { USMap } from '@/components/ui/USMap'

export function Footprint() {
  return (
    <section className="bg-surface-container-high py-24 px-6 relative">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-5">
            <h2 className="font-headline text-5xl md:text-6xl tracking-tighter text-on-surface mb-8">
              Not consulting.
              <br />
              Not a boot camp.
              <br />
              Applied deployment.
            </h2>
            <div className="inline-block bg-tertiary-container text-on-tertiary-container px-4 py-2 font-label text-xs uppercase tracking-widest mt-4">
              Status // Operational
            </div>
          </div>

          <div className="lg:col-span-7 bg-surface p-4 relative">
            <USMap />
          </div>
        </div>
      </div>
    </section>
  )
}
