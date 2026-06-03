import type { Metadata } from 'next'
import Link from 'next/link'
import { Navigation } from '@/components/layout/Navigation'
import { Footer } from '@/components/layout/Footer'
import { MembersForm } from '@/components/ui/MembersForm'

export const metadata: Metadata = {
  title: 'Members // InnovateLocal',
  description:
    'Members come to InnovateLocal to put AI to work on real problems — with student talent, shared tooling, and a regional peer network. Reserve a seat at the next Membership Information Session.',
}

const BENEFITS = [
  {
    number: '01',
    title: 'A curated AI tool stack.',
    body: 'Working tools, playbooks, and templates. No building from scratch.',
  },
  {
    number: '02',
    title: 'Real student talent on your real problems.',
    body: 'Penn State student engineers and apprentices, supervised by experienced staff, working on what you actually need.',
  },
  {
    number: '03',
    title: 'A regional peer network.',
    body: 'A hub, workshops, and peer cohorts of other local businesses and nonprofits working through the same things.',
  },
  {
    number: '04',
    title: 'Practical, hands-on training.',
    body: 'You leave with something working. Not a slide deck about AI strategy.',
  },
  {
    number: '05',
    title: 'Capability that stays.',
    body: 'When projects close, the tools, the documentation, and the know-how stay with your team.',
  },
]

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-4 font-label text-xs uppercase tracking-widest text-primary font-medium mb-8">
      <span className="inline-block w-8 h-[2px] bg-primary" aria-hidden="true" />
      {children}
    </div>
  )
}

export default function MembersPage() {
  return (
    <>
      <Navigation />
      <main id="main-content" className="bg-surface">
        {/* HERO */}
        <section className="px-6 md:px-14 pt-16 md:pt-24 pb-16 md:pb-24 max-w-[1140px]">
          <Link
            href="/"
            className="inline-flex items-center gap-2 font-label text-xs uppercase tracking-widest text-on-surface-variant hover:text-primary transition-colors mb-12"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
            Return Home
          </Link>

          <div className="font-label text-xs uppercase tracking-widest text-primary font-medium mb-8">
            For Local Businesses &amp; Nonprofits &nbsp;·&nbsp; Membership Information Session
          </div>
          <h1 className="font-headline text-6xl md:text-8xl tracking-tighter text-on-surface mb-10 leading-none">
            Members.
          </h1>
          <p className="font-body text-xl md:text-2xl text-on-surface-variant leading-relaxed max-w-2xl pl-8 border-l-4 border-primary">
            InnovateLocal is a community-focused AI institution being built in
            Central PA. Members are the businesses and nonprofits that come here
            to put AI to work, with real student talent, shared infrastructure,
            and a regional peer network of others doing the same.
          </p>
        </section>

        {/* WHAT MEMBERSHIP IS */}
        <section className="bg-surface-container-low px-6 md:px-14 py-16 md:py-20">
          <div className="max-w-[1140px]">
            <SectionLabel>SECTION 01 // What Membership Is</SectionLabel>
            <h2 className="font-headline text-4xl md:text-5xl lg:text-6xl tracking-tighter leading-tight text-on-surface mb-8 max-w-3xl">
              One subscription. The full AI capability stack.
            </h2>
            <div className="space-y-5 max-w-2xl">
              <p className="font-body text-lg md:text-xl leading-relaxed text-on-surface-variant">
                Membership is a subscription that puts a complete AI capability
                within reach of any local business or nonprofit, for a fraction
                of what each piece would cost on its own. That capability
                includes tools, student project teams, hands-on training, and a
                regional peer community.
              </p>
              <p className="font-body text-lg md:text-xl leading-relaxed text-on-surface-variant">
                You bring the real problems. We bring the people, the tools, and
                the working environment to put AI to work on them.
              </p>
            </div>
          </div>
        </section>

        {/* WHAT MEMBERS GET */}
        <section className="px-6 md:px-14 py-16 md:py-20">
          <div className="max-w-[1140px]">
            <SectionLabel>SECTION 02 // What Members Get</SectionLabel>
            <h2 className="font-headline text-4xl md:text-5xl lg:text-6xl tracking-tighter leading-tight text-on-surface mb-12 max-w-3xl">
              The things AI consultants charge ten times the price for.
            </h2>

            <div className="flex flex-col">
              {BENEFITS.map((b, i) => (
                <div
                  key={b.number}
                  className={`grid grid-cols-[56px_1fr] gap-6 items-start px-4 md:px-8 py-6 ${
                    i % 2 === 1 ? 'bg-surface-container-low' : ''
                  }`}
                >
                  <span className="font-headline text-2xl text-secondary italic pt-1">
                    {b.number}
                  </span>
                  <div className="font-body text-base md:text-lg text-on-surface-variant leading-relaxed">
                    <strong className="text-on-surface font-semibold">{b.title}</strong>{' '}
                    {b.body}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA + FORM */}
        <section
          id="reserve"
          className="bg-surface-container-low px-6 md:px-14 py-16 md:py-20"
        >
          <div className="max-w-[1140px] grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-start">
            <div className="flex flex-col">
              <SectionLabel>SECTION 03 // Membership Information Session</SectionLabel>
              <h2 className="font-headline text-3xl md:text-4xl lg:text-5xl tracking-tighter leading-tight text-on-surface mb-6">
                A 60-minute conversation about what membership actually looks like.
              </h2>
              <p className="font-body text-base md:text-lg text-on-surface-variant leading-relaxed mb-4">
                How InnovateLocal works. Who it&rsquo;s for. What membership
                includes. How to join. Bring questions about your business or
                your nonprofit. We&rsquo;ll talk through where AI can help.
              </p>
              <p className="font-body text-base md:text-lg text-on-surface-variant leading-relaxed mb-8">
                Sessions run monthly, in person at the State College hub and
                virtually.
              </p>
              <a
                href="#reserve-form"
                className="self-start inline-flex items-center gap-3 bg-primary hover:bg-secondary text-on-primary px-8 py-4 font-label text-[13px] uppercase tracking-[0.22em] font-bold transition-colors group"
              >
                Reserve Your Seat
                <svg className="transform group-hover:translate-x-1 transition-transform" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </a>
            </div>

            <div id="reserve-form" className="bg-surface p-8 md:p-12 w-full">
              <MembersForm />
            </div>
          </div>
        </section>

        {/* Closing annotation */}
        <div className="px-6 md:px-14 py-10 md:py-12 text-center">
          <span className="font-label text-xs uppercase tracking-widest text-primary font-bold">
            // A Public Works for the AI Era
          </span>
        </div>
      </main>
      <Footer />
    </>
  )
}
