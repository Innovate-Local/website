export function Hero() {
  return (
    <section className="bg-surface py-24 md:py-40 px-6 relative overflow-hidden">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-12 items-end">
        <div className="md:col-span-10 lg:col-span-9">
          <h1 className="font-headline text-5xl md:text-7xl lg:text-8xl tracking-tighter leading-[0.95] text-on-surface mb-8">
            AI is the <span className="italic text-primary">greatest</span> force multiplier small businesses have ever had.
          </h1>
        </div>
        <div className="md:col-span-8">
          <p className="font-body text-xl md:text-2xl text-on-surface-variant leading-relaxed pl-8 border-l-4 border-primary">
            The question is whether every community gets access.
          </p>
        </div>
      </div>
    </section>
  )
}
