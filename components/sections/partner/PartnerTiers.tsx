'use client'

// Partner page — the three CIP tiers. Cards are separated by thin warm-bone
// gaps (gap-1 on a surface band) rather than borders, and the highlight rows use
// soft low-opacity dividers, matching the site's restrained "no hard lines" feel.
// The three backgrounds form a gentle light-to-deeper ramp (low → high → dim).
import { useTierSelection, type TierValue } from './TierSelection'

type Tier = {
  badge: string
  name: string
  desc: string
  highlights: string[]
  bg: string
  // Must match the matching option value in the form's "Tier Interest" field.
  formValue: TierValue
}

const TIERS: Tier[] = [
  {
    badge: '// Tier One',
    name: 'Community Catalyst',
    desc: 'For credit unions, regional firms, and midsize employers seeking a right-sized community investment.',
    highlights: [
      '125 Innovation Credits to deploy',
      'Sponsor 4 community memberships',
      'Employee workshop access',
    ],
    bg: 'bg-surface-container-low',
    formValue: 'catalyst',
  },
  {
    badge: '// Tier Two',
    name: 'Anchor Partner',
    desc: 'For regional banks, healthcare networks, and employers with active community investment programs.',
    highlights: [
      '375 Innovation Credits to deploy',
      'Sponsor 10 community memberships',
      'AI literacy program for up to 20 staff',
    ],
    bg: 'bg-surface-container-high',
    formValue: 'anchor',
  },
  {
    badge: '// Tier Three',
    name: 'Keystone Partner',
    desc: 'For institutions making AI and community innovation a top strategic priority.',
    highlights: [
      '750 Innovation Credits to deploy',
      'Sponsor 25 community memberships',
      'Program naming rights + Founding designation',
    ],
    bg: 'bg-surface-dim',
    formValue: 'keystone',
  },
]

export function PartnerTiers() {
  const { selectTier } = useTierSelection()
  return (
    <section className="bg-surface-container-low py-24 md:py-32 px-6">
      <div className="max-w-7xl mx-auto">
        <p className="flex items-center gap-4 font-label text-[11px] tracking-[0.28em] uppercase text-primary font-medium mb-8">
          <span aria-hidden="true" className="inline-block w-8 h-[2px] bg-primary" />
          Partnership Tiers
        </p>
        <h2 className="font-headline text-4xl md:text-5xl tracking-tight leading-tight text-on-surface mb-6 max-w-2xl">
          Three tiers. The same structure at every level.
        </h2>
        <p className="font-body text-lg text-on-surface leading-relaxed max-w-3xl">
          Every CIP investment splits 50/50. Half funds shared operations. Half converts into
          Innovation Credits your institution deploys throughout the year — to your employees, your
          customers, and your community.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-1 mt-14">
          {TIERS.map((tier) => (
            <div key={tier.name} className={`${tier.bg} p-10 flex flex-col`}>
              <p className="font-label text-[10px] tracking-[0.28em] uppercase font-bold mb-5 text-primary">
                {tier.badge}
              </p>
              <h3 className="font-headline text-3xl tracking-tight mb-2 text-on-surface">
                {tier.name}
              </h3>
              <p className="font-body text-base leading-relaxed mb-7 text-on-surface-variant">
                {tier.desc}
              </p>
              <div className="flex flex-col mb-8 border-t border-outline-variant/40">
                {tier.highlights.map((h) => (
                  <p
                    key={h}
                    className="font-body text-[15px] leading-snug py-3.5 border-b border-outline-variant/40 text-on-surface"
                  >
                    {h}
                  </p>
                ))}
              </div>
              <a
                href="#partner-form"
                onClick={() => selectTier(tier.formValue)}
                className="mt-auto inline-block text-center font-label text-[11px] tracking-[0.22em] uppercase font-bold px-7 py-4 transition-colors bg-primary text-on-primary hover:bg-secondary"
              >
                Select
              </a>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
