import type { Metadata } from 'next'
import { Navigation } from '@/components/layout/Navigation'
import { Footer } from '@/components/layout/Footer'
import { Reveal } from '@/components/ui/Reveal'
import { ContactForm } from '@/components/ui/ContactForm'
import { PartnerHero } from '@/components/sections/partner/PartnerHero'
import { PartnerTiers } from '@/components/sections/partner/PartnerTiers'
import { PartnerBenefits } from '@/components/sections/partner/PartnerBenefits'
import type { SupportingFormField } from '@/components/layout/SupportingPageShell'

export const metadata: Metadata = {
  title: 'Community Innovation Partner // Innovate Local',
  description:
    'Community Innovation Partners are the anchor investors who make Innovate Local possible — and who receive a structured portfolio of brand, employee, customer, and community outcomes in return.',
}

// Field ids double as the keys saved to the inquiry payload (and, later, the keys
// the auto-reply system will read). Keep them stable and descriptive.
const PARTNER_FIELDS: SupportingFormField[] = [
  { id: 'fullName', label: 'Full Name', type: 'text', placeholder: 'First and last', required: true },
  { id: 'title', label: 'Title', type: 'text', placeholder: 'Your role', required: true },
  { id: 'email', label: 'Email', type: 'email', placeholder: 'Work email', required: true },
  {
    id: 'organization',
    label: 'Organization',
    type: 'text',
    placeholder: 'Institution name',
    required: true,
  },
  {
    id: 'tier',
    label: 'Tier Interest',
    type: 'radio',
    required: false,
    colSpan: 2,
    options: [
      { value: 'catalyst', label: 'Community Catalyst' },
      { value: 'anchor', label: 'Anchor Partner' },
      { value: 'keystone', label: 'Keystone Partner' },
      { value: 'unsure', label: 'Not sure yet' },
    ],
  },
  {
    id: 'context',
    label: "What's driving your interest?",
    type: 'textarea',
    placeholder: 'A sentence or two is plenty.',
    required: false,
    colSpan: 2,
    rows: 4,
  },
]

export default function PartnerPage() {
  return (
    <>
      <Navigation />
      <main id="main-content">
        <PartnerHero />

        <Reveal>
          <PartnerTiers />
        </Reveal>

        <Reveal>
          <PartnerBenefits />
        </Reveal>

        <Reveal>
          <section
            id="partner-form"
            className="bg-surface-container-low py-24 md:py-32 px-6 scroll-mt-24"
          >
            <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
              <div className="flex flex-col gap-6">
                <p className="flex items-center gap-4 font-label text-[11px] tracking-[0.28em] uppercase text-primary font-medium">
                  <span aria-hidden="true" className="inline-block w-8 h-[2px] bg-primary" />
                  Partnership Intake
                </p>
                <h2 className="font-headline text-3xl md:text-4xl lg:text-5xl tracking-tight leading-tight text-on-surface">
                  Tell us about your institution.
                </h2>
                <p className="font-body text-lg text-on-surface-variant leading-relaxed max-w-md">
                  Fill out the form and someone from our team will follow up within two weeks.
                </p>
                <p className="font-label text-[11px] tracking-[0.18em] uppercase text-on-surface-variant/70 mt-2">
                  // Responses reviewed by the Innovate Local partnership team
                </p>
              </div>

              <div className="bg-surface p-8 md:p-12">
                <ContactForm type="partner" fields={PARTNER_FIELDS} submitLabel="Submit Inquiry" />
              </div>
            </div>
          </section>
        </Reveal>
      </main>
      <Footer />
    </>
  )
}
