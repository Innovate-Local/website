import type { Metadata } from 'next'
import Link from 'next/link'
import { Navigation } from '@/components/layout/Navigation'
import { Footer } from '@/components/layout/Footer'
import { P } from '@/components/layout/LegalPageLayout'

export const metadata: Metadata = {
  title: 'Contact // InnovateLocal',
  description:
    'Get in touch with InnovateLocal, a community-focused AI institution operated by Radians per Second Squared, LLC.',
}

export default function ContactPage() {
  return (
    <>
      <Navigation />
      <main id="main-content" className="bg-surface min-h-screen">
        <div className="max-w-3xl mx-auto px-6 py-24 md:py-32">
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

          <h1 className="font-headline text-5xl md:text-6xl tracking-tighter text-on-surface mb-3 leading-none">
            Contact
          </h1>

          <div className="flex flex-col gap-8 mt-8">
            <P>
              {`Questions about InnovateLocal, our policies, or how to get involved? Reach us using the details below.`}
            </P>

            <dl className="flex flex-col gap-6">
              <div>
                <dt className="font-label text-xs uppercase tracking-widest text-on-surface-variant/70 mb-1">
                  Organization
                </dt>
                <dd className="font-body text-base md:text-lg text-on-surface">
                  Radians per Second Squared, LLC
                </dd>
              </div>
              <div>
                <dt className="font-label text-xs uppercase tracking-widest text-on-surface-variant/70 mb-1">
                  Location
                </dt>
                <dd className="font-body text-base md:text-lg text-on-surface">
                  State College, Pennsylvania
                </dd>
              </div>
              <div>
                <dt className="font-label text-xs uppercase tracking-widest text-on-surface-variant/70 mb-1">
                  Email
                </dt>
                <dd className="font-body text-base md:text-lg text-on-surface">
                  <a
                    href="mailto:hello@innovatelocal.ai"
                    className="hover:text-primary transition-colors"
                  >
                    hello@innovatelocal.ai
                  </a>
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
