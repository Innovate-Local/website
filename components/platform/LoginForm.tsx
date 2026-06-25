'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type LoginFormProps = {
  next: string
  initialError?: boolean
}

// Passwordless magic-link sign in. Submits the email to Supabase, which mails a
// link back to /auth/callback; on return the session cookie is set. (Password
// and OAuth methods can be added here later without changing the callback.)
export function LoginForm({ next, initialError = false }: LoginFormProps) {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>(
    initialError ? 'error' : 'idle',
  )

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setStatus('sending')

    const supabase = createClient()
    const emailRedirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo },
    })

    setStatus(error ? 'error' : 'sent')
  }

  if (status === 'sent') {
    return (
      <div className="flex flex-col gap-4 text-center">
        <div className="font-label text-xs uppercase tracking-widest text-primary">
          Check your inbox
        </div>
        <h2 className="font-headline text-3xl text-on-surface">Your link is on its way.</h2>
        <p className="font-body text-on-surface-variant leading-relaxed">
          We sent a sign-in link to{' '}
          <span className="font-label text-on-surface">{email}</span>. Open it on this device to
          continue.
        </p>
        <button
          type="button"
          onClick={() => setStatus('idle')}
          className="mt-2 self-center font-label text-xs uppercase tracking-widest text-on-surface-variant hover:text-primary transition-colors"
        >
          Use a different email
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-8">
      <div className="space-y-1">
        <h2 className="font-headline text-3xl text-on-surface tracking-tight mb-2">Sign in</h2>
        <p className="text-sm text-on-surface-variant font-medium">
          We&rsquo;ll email you a secure link &mdash; no password needed.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <label
          htmlFor="email"
          className="font-label text-xs font-semibold text-on-surface-variant uppercase tracking-widest"
        >
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          disabled={status === 'sending'}
          className="w-full bg-surface-container-high border-0 border-b-2 border-transparent text-on-surface p-4 text-base focus:ring-0 focus:border-secondary transition-colors placeholder:text-outline-variant disabled:opacity-60"
        />
      </div>

      {status === 'error' && (
        <div className="bg-error-container text-on-error-container p-4">
          <p className="font-label text-xs uppercase tracking-widest">
            Something went wrong sending your link. Please try again.
          </p>
        </div>
      )}

      <button
        type="submit"
        disabled={status === 'sending'}
        className="w-full bg-primary hover:bg-primary-container text-on-primary font-label text-sm uppercase tracking-widest font-bold py-5 px-8 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {status === 'sending' ? 'Sending...' : 'Send sign-in link'}
      </button>
    </form>
  )
}
