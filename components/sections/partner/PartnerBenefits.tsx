// Partner page — the four categories of return. Two-column grid of tonal panels
// (alternating low/high surface), separated by warm-bone gaps rather than lines.
type Benefit = { num: string; cat: string; title: string; body: string }

const BENEFITS: Benefit[] = [
  {
    num: '01',
    cat: 'Brand',
    title: 'Regional Leadership',
    body: 'Recognition as a regional innovation leader — in the hub, in the press, in co-branded content, and at public events. Your name on the work that modernizes the local economy.',
  },
  {
    num: '02',
    cat: 'Community',
    title: 'Visible Footprint Investment',
    body: 'Sponsor access to InnovateLocal for nonprofits, municipalities, and community organizations in your region. CRA-eligible at every tier, with documented outcomes your institution can stand behind.',
  },
  {
    num: '03',
    cat: 'Customers',
    title: 'A Differentiated Relationship',
    body: 'Give your business customers something no other regional institution can: access to a community AI hub as part of the relationship. A concrete reason to deepen and consolidate.',
  },
  {
    num: '04',
    cat: 'Employees',
    title: 'Capability That Stays',
    body: 'AI literacy programs, executive workshops, and a Penn State student talent pipeline. Your team builds real capability — and gains a lower-risk path to internships and future hiring.',
  },
]

export function PartnerBenefits() {
  return (
    <section className="bg-surface py-24 md:py-32 px-6">
      <div className="max-w-7xl mx-auto">
        <p className="flex items-center gap-4 font-label text-[11px] tracking-[0.28em] uppercase text-primary font-medium mb-8">
          <span aria-hidden="true" className="inline-block w-8 h-[2px] bg-primary" />
          What You Receive
        </p>
        <h2 className="font-headline text-4xl md:text-5xl tracking-tight leading-tight text-on-surface mb-6 max-w-2xl">
          Four categories of structured return.
        </h2>
        <p className="font-body text-lg text-on-surface leading-relaxed max-w-3xl">
          Every CIP benefit maps to one of four areas. Together they make the partnership visible in
          your community, defensible inside your institution, and valuable to your customers and
          team.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-1 mt-14">
          {BENEFITS.map((b, i) => (
            <div
              key={b.num}
              className={`p-10 md:p-12 ${
                i === 0 || i === 3 ? 'bg-surface-container-low' : 'bg-surface-container-high'
              }`}
            >
              <p className="font-label text-[10px] tracking-[0.28em] uppercase font-bold text-primary mb-4">
                {b.num} // {b.cat}
              </p>
              <h3 className="font-headline text-2xl md:text-[26px] tracking-tight text-on-surface mb-3">
                {b.title}
              </h3>
              <p className="font-body text-base text-on-surface-variant leading-relaxed">{b.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
