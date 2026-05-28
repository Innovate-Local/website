'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'

// Use the same SVG file that Next.js serves as the browser-tab favicon, so the
// nav mark and the tab icon render identically (the SVG embeds its own
// Google-Fonts @import for Inter, which only fires reliably when loaded as a
// document — i.e. via <img> — not when inlined).
function ILMark({ className }: { className?: string }) {
  return (
    <Image
      src="/icon.svg"
      alt=""
      width={240}
      height={220}
      className={className}
      priority
      unoptimized
    />
  )
}

// Section anchors on the home page. We construct the href manually so the
// path keeps its trailing slash before the fragment — Next.js's <Link>
// strips it when basePath is set, which on a trailingSlash:true site makes
// the browser do a full navigation instead of a same-page scroll, and the
// canonical-form redirect drops the fragment along the way.
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? ''
const homeAnchor = (id: string) => `${BASE_PATH}/#${id}`

export function Navigation() {
  const [menuOpen, setMenuOpen] = useState(false)

  // Lock body scroll while the overlay is open.
  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = 'hidden'
      return () => {
        document.body.style.overflow = ''
      }
    }
  }, [menuOpen])

  // Close the overlay on Escape.
  useEffect(() => {
    if (!menuOpen) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [menuOpen])

  const close = () => setMenuOpen(false)

  return (
    <>
      <header className="bg-surface sticky w-full z-50 top-0 border-b border-surface-container-low">
        <div className="flex justify-between items-center w-full px-8 py-5 max-w-screen-2xl mx-auto">
          <Link
            href="/"
            className="flex items-center gap-3 font-headline text-2xl font-normal text-on-surface tracking-tight lowercase"
            aria-label="Innovate Local — home"
          >
            <ILMark className="h-8 w-auto" />
            <span>innovate local</span>
          </Link>

          <nav className="hidden md:flex gap-12 items-center" aria-label="Primary">
            <a
              href={homeAnchor('the-model')}
              className="text-on-surface-variant hover:text-primary transition-colors font-headline text-xl lowercase tracking-tight leading-none px-2 py-2"
            >
              the model
            </a>
            <a
              href={homeAnchor('the-four-ds')}
              className="text-on-surface-variant hover:text-primary transition-colors font-headline text-xl lowercase tracking-tight leading-none px-2 py-2"
            >
              principles
            </a>
            <a
              href={homeAnchor('non-profit')}
              className="text-on-surface-variant hover:text-primary transition-colors font-headline text-xl lowercase tracking-tight leading-none px-2 py-2"
            >
              structure
            </a>
          </nav>

          <div className="hidden md:flex gap-3 items-center">
            <Link
              href="/join"
              className="bg-secondary text-on-secondary border border-secondary px-5 py-3 font-headline text-base lowercase tracking-tight hover:bg-primary hover:text-on-primary hover:border-primary transition-colors"
            >
              join
            </Link>
            <Link
              href="/partner"
              className="bg-secondary text-on-secondary border border-secondary px-5 py-3 font-headline text-base lowercase tracking-tight hover:bg-primary hover:text-on-primary hover:border-primary transition-colors"
            >
              partner
            </Link>
          </div>

          <button
            onClick={() => setMenuOpen(true)}
            className="md:hidden text-primary"
            aria-label="Open menu"
            aria-expanded={menuOpen}
            aria-controls="mobile-nav"
          >
            <span className="material-symbols-outlined text-3xl" aria-hidden="true">
              menu
            </span>
          </button>
        </div>
      </header>

      {/* Mobile overlay */}
      {menuOpen && (
        <div
          id="mobile-nav"
          className="fixed inset-0 z-[100] bg-surface overflow-y-auto md:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Site navigation"
        >
          <div className="flex justify-between items-center px-8 py-5 border-b border-surface-container-low">
            <span className="flex items-center gap-3 font-headline text-2xl font-normal text-on-surface tracking-tight lowercase">
              <ILMark className="h-8 w-auto" />
              <span>innovate local</span>
            </span>
            <button
              onClick={close}
              className="text-primary"
              aria-label="Close menu"
            >
              <span className="material-symbols-outlined text-3xl" aria-hidden="true">
                close
              </span>
            </button>
          </div>

          <nav className="flex flex-col p-8 gap-1" aria-label="Primary">
            <a
              href={homeAnchor('the-model')}
              onClick={close}
              className="font-headline text-5xl lowercase tracking-tight leading-none text-on-surface-variant hover:text-primary py-4"
            >
              the model
            </a>
            <a
              href={homeAnchor('the-four-ds')}
              onClick={close}
              className="font-headline text-5xl lowercase tracking-tight leading-none text-on-surface-variant hover:text-primary py-4"
            >
              principles
            </a>
            <a
              href={homeAnchor('non-profit')}
              onClick={close}
              className="font-headline text-5xl lowercase tracking-tight leading-none text-on-surface-variant hover:text-primary py-4"
            >
              structure
            </a>
          </nav>

          <div className="px-8 pb-12 flex flex-col gap-3">
            <div className="font-headline text-sm italic lowercase tracking-tight mb-2 text-on-surface-variant">
              get involved
            </div>
            <Link
              href="/join"
              onClick={close}
              className="block bg-secondary text-on-secondary border border-secondary px-6 py-5 text-center font-headline text-xl lowercase tracking-tight hover:bg-primary hover:text-on-primary hover:border-primary transition-colors"
            >
              join a hub
            </Link>
            <Link
              href="/start"
              onClick={close}
              className="block bg-secondary text-on-secondary border border-secondary px-6 py-5 text-center font-headline text-xl lowercase tracking-tight hover:bg-primary hover:text-on-primary hover:border-primary transition-colors"
            >
              start a hub
            </Link>
            <Link
              href="/partner"
              onClick={close}
              className="block bg-secondary text-on-secondary border border-secondary px-6 py-5 text-center font-headline text-xl lowercase tracking-tight hover:bg-primary hover:text-on-primary hover:border-primary transition-colors"
            >
              partner with us
            </Link>
          </div>
        </div>
      )}
    </>
  )
}
