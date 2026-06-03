// Partner page hero. Large serif headline + lede, on the warm-bone surface,
// following the same scale/rhythm as the home Hero and supporting-page headings.
export function PartnerHero() {
  return (
    <section className="bg-surface pt-16 pb-20 md:pt-24 md:pb-28 px-6 relative overflow-hidden">
      <div className="max-w-7xl mx-auto">
        <p className="font-label text-[11px] tracking-[0.28em] uppercase text-primary font-medium mb-6">
          // Community Innovation Partner — CIP Program
        </p>
        <h1 className="font-headline text-6xl md:text-8xl lg:text-[7.5rem] leading-[0.95] tracking-tight text-on-surface mb-10">
          Community
          <br />
          Innovation
          <br />
          Partner.
        </h1>
        <p className="font-headline text-2xl md:text-3xl leading-snug text-on-surface max-w-3xl mb-6">
          This is not a sponsorship. It is an anchor investment in community-owned AI infrastructure.
        </p>
        <p className="font-body text-base md:text-lg text-on-surface-variant leading-relaxed max-w-2xl">
          CIPs fund the operating capacity that makes Innovate Local run — and receive a structured
          portfolio of brand, employee, customer, and community outcomes in return. Every dollar maps
          to a deployable service and a measurable outcome.
        </p>
      </div>
    </section>
  )
}
