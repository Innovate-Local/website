import type { Metadata } from 'next'
import Link from 'next/link'
import { Navigation } from '@/components/layout/Navigation'
import { Footer } from '@/components/layout/Footer'

export const metadata: Metadata = {
  title: 'For Businesses // Innovate Local',
  description:
    'For local businesses, non-profits, and community organizations. A team of AI talent helps solve a problem you have. No big budget required.',
}

export default function BusinessesPage() {
  return (
    <>
      <Navigation />
      <main id="main-content" className="bg-surface min-h-screen">
        <div className="max-w-4xl mx-auto px-6 py-24 md:py-32">
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

          <h1 className="font-headline text-6xl md:text-8xl tracking-tighter text-on-surface mb-12 leading-none">
            Businesses.
          </h1>

          <p className="font-body text-xl md:text-2xl text-on-surface-variant leading-relaxed mb-8">
            You have problems AI can solve. We bring you a team of apprentices
            and engineers who sit with you, understand what you actually need,
            and build it. No big budget. No six-month implementation cycle.
          </p>

          <p className="font-body text-xl md:text-2xl text-on-surface-variant leading-relaxed mb-16">
            All of the capability stays with your team when we leave. Local
            problem, local solution, local benefit.
          </p>

          <Link
            href="/partner"
            className="inline-block bg-primary text-on-primary border border-primary px-10 py-6 font-label text-sm uppercase tracking-widest hover:bg-secondary hover:border-secondary transition-colors"
          >
            Describe Your Challenge
          </Link>
        </div>
      </main>
      <Footer />
    </>
  )
}
