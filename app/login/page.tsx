import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { LoginForm } from '@/components/platform/LoginForm'
import { getUser } from '@/lib/auth/session'

export const metadata: Metadata = {
  title: 'Sign in // InnovateLocal',
  robots: { index: false, follow: false },
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>
}) {
  const { next, error } = await searchParams

  // Only allow relative redirect targets (no open redirects to other sites).
  const safeNext = next && next.startsWith('/') && !next.startsWith('//') ? next : '/dashboard'

  // Already signed in → straight to the platform.
  if (await getUser()) redirect(safeNext)

  return (
    <main
      id="main-content"
      className="min-h-screen w-full flex items-center justify-center px-6 py-16 bg-surface"
    >
      <div className="w-full max-w-md flex flex-col gap-10">
        <Link
          href="/"
          className="group flex items-center gap-2 text-on-surface-variant hover:text-primary transition-colors self-start"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
          <span className="font-label text-xs uppercase tracking-annotation font-medium">
            Return Home
          </span>
        </Link>

        <div className="bg-surface-container-low p-8 md:p-12">
          <LoginForm initialError={error === 'auth'} />
        </div>
      </div>
    </main>
  )
}
