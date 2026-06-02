import type { ReactNode } from 'react'
import Link from 'next/link'
import { Navigation } from '@/components/layout/Navigation'
import { Footer } from '@/components/layout/Footer'

export function LegalPageLayout({
  title,
  effectiveDate,
  children,
}: {
  title: string
  effectiveDate: string
  children: ReactNode
}) {
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
            {title}
          </h1>
          <p className="font-label text-xs uppercase tracking-widest text-on-surface-variant mb-12">
            {`Effective date: ${effectiveDate}`}
          </p>

          <div className="flex flex-col gap-5">{children}</div>
        </div>
      </main>
      <Footer />
    </>
  )
}

export function H2({ children }: { children: ReactNode }) {
  return (
    <h2 className="font-headline text-2xl md:text-3xl text-on-surface mt-8 mb-1 tracking-tight">
      {children}
    </h2>
  )
}

export function P({ children }: { children: ReactNode }) {
  return (
    <p className="font-body text-base md:text-lg text-on-surface-variant leading-relaxed">
      {children}
    </p>
  )
}

export function Sub({ children }: { children: ReactNode }) {
  return (
    <p className="font-body text-base md:text-lg text-on-surface font-semibold leading-relaxed mt-1">
      {children}
    </p>
  )
}

export function UL({ children }: { children: ReactNode }) {
  return (
    <ul className="flex flex-col gap-2 list-disc pl-6 font-body text-base md:text-lg text-on-surface-variant leading-relaxed">
      {children}
    </ul>
  )
}

export function LI({ children }: { children: ReactNode }) {
  return <li>{children}</li>
}

export function B({ children }: { children: ReactNode }) {
  return <strong className="text-on-surface font-semibold">{children}</strong>
}
