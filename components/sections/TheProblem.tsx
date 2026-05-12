export function TheProblem() {
  return (
    <section className="bg-surface-container-low py-24 px-6 relative">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24 items-center">
        <div className="relative bg-surface-container-highest p-12 lg:p-24 aspect-square flex flex-col justify-center items-center">
          <span className="font-headline text-9xl text-primary tracking-tighter">2</span>
          <svg className="text-secondary my-8" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" aria-hidden="true">
            <line x1="12" y1="5" x2="12" y2="19" />
            <polyline points="19 12 12 19 5 12" />
          </svg>
          <span className="font-headline text-9xl text-on-surface tracking-tighter">10</span>
        </div>

        <div>
          <blockquote className="font-headline italic text-4xl md:text-5xl leading-tight text-on-surface mb-8">
            &ldquo;They need someone to walk in the door and help.&rdquo;
          </blockquote>
          <p className="font-body text-lg text-on-surface-variant leading-relaxed max-w-xl">
            The tools exist. The potential is massive. But adoption at the local level requires
            human infrastructure. It requires trust, presence, and applied expertise.
          </p>
        </div>
      </div>
    </section>
  )
}
