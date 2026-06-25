import type { Metadata } from 'next'
import { Newsreader, Inter } from 'next/font/google'
import './globals.css'
import { PostHogIdentify } from '@/components/analytics/PostHogIdentify'

const newsreader = Newsreader({
  subsets: ['latin'],
  variable: '--font-newsreader',
  display: 'swap',
  weight: ['400', '500', '600', '700', '800'],
  style: ['normal', 'italic'],
})

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'InnovateLocal',
  description:
    'A modern Civilian Conservation Corps for AI. Local AI hubs in university towns, placing teams of recent graduates with local businesses and community organizations.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${newsreader.variable} ${inter.variable}`}>
      <head>
        {/* Material Symbols icon font. Loaded here (not via @import in CSS) so
            static-export CSS bundling can't reorder it out of effect. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=block"
        />
      </head>
      <body>
        <a href="#main-content" className="skip-to-main">
          Skip to main content
        </a>
        <PostHogIdentify />
        {children}
      </body>
    </html>
  )
}
