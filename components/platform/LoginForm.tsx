'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Mode = 'signin' | 'signup' | 'magic'

const fieldClass =
  'w-full bg-surface-container-high border-0 border-b-2 border-transparent text-on-surface p-4 text-base focus:ring-0 focus:border-secondary transition-colors placeholder:text-outline-variant disabled:opacity-60'
const labelCls = 'font-label text-xs font-semibold text-on-surface-variant uppercase tracking-widest'
const submitClass =
  'w-full bg-primary hover:bg-primary-container text-on-primary font-label text-sm uppercase tracking-widest font-bold py-5 px-8 transition-colors disabled:opacity-60 disabled:cursor-not-allowed'
const tabClass = (active: boolean) =>
  `font-label text-xs uppercase tracking-widest pb-2 border-b-2 transition-colors ${
    active ? 'border-primary text-on-surface' : 'border-transparent text-on-surface-variant hover:text-on-surface'
  }`

// Email + password sign in / sign up, with magic link as a fallback. Password
// auth avoids the per-login email send (magic link); existing magic-link users
// can sign in with a link and then set a password from their profile.
export function LoginForm({ next = '/dashboard', initialError = false }: { next?: string; initialError?: boolean }) {
  const [mode, setMode] = useState<Mode>('signin')
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(initialError ? 'Your sign-in link was invalid or expired. Try again.' : null)
  const [noPasswordHint, setNoPasswordHint] = useState(false)
  const [magicSent, setMagicSent] = useState(false)
  const [confirmSent, setConfirmSent] = useState(false)

  function reset(nextMode: Mode) {
    setMode(nextMode)
    setError(null)
    setNoPasswordHint(false)
    setPassword('')
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    setNoPasswordHint(false)
    const supabase = createClient()

    if (mode === 'magic') {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      })
      setBusy(false)
      if (error) setError('Something went wrong sending your link. Please try again.')
      else setMagicSent(true)
      return
    }

    if (mode === 'signup') {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName.trim() || undefined },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      })
      setBusy(false)
      if (error) {
        setError(error.message)
        return
      }
      // Email confirmation OFF → session present → straight in. ON → confirm email.
      if (data.session) window.location.assign(next)
      else setConfirmSent(true)
      return
    }

    // signin
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setBusy(false)
    if (error) {
      // Most commonly: existing magic-link-only account with no password set.
      setError('That email and password didn’t match.')
      setNoPasswordHint(true)
      return
    }
    window.location.assign(next)
  }

  if (magicSent) {
    return (
      <div className="flex flex-col gap-4 text-center">
        <div className="font-label text-xs uppercase tracking-widest text-primary">Check your inbox</div>
        <h2 className="font-headline text-3xl text-on-surface">Your link is on its way.</h2>
        <p className="font-body text-on-surface-variant leading-relaxed">
          We sent a sign-in link to <span className="font-label text-on-surface">{email}</span>. Open it on this
          device to continue.
        </p>
        <button type="button" onClick={() => { setMagicSent(false); reset('signin') }} className="mt-2 self-center font-label text-xs uppercase tracking-widest text-on-surface-variant hover:text-primary transition-colors">
          Back to sign in
        </button>
      </div>
    )
  }

  if (confirmSent) {
    return (
      <div className="flex flex-col gap-4 text-center">
        <div className="font-label text-xs uppercase tracking-widest text-primary">Confirm your email</div>
        <h2 className="font-headline text-3xl text-on-surface">Almost there.</h2>
        <p className="font-body text-on-surface-variant leading-relaxed">
          We sent a confirmation link to <span className="font-label text-on-surface">{email}</span>. Confirm it,
          then sign in with your password.
        </p>
        <button type="button" onClick={() => { setConfirmSent(false); reset('signin') }} className="mt-2 self-center font-label text-xs uppercase tracking-widest text-on-surface-variant hover:text-primary transition-colors">
          Back to sign in
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-8">
      <div className="flex gap-6">
        <button type="button" onClick={() => reset('signin')} className={tabClass(mode === 'signin')}>
          Sign in
        </button>
        <button type="button" onClick={() => reset('signup')} className={tabClass(mode === 'signup')}>
          Create account
        </button>
      </div>

      {mode === 'magic' && (
        <p className="text-sm text-on-surface-variant font-medium">
          We’ll email you a secure link — no password needed.
        </p>
      )}

      {mode === 'signup' && (
        <div className="flex flex-col gap-2">
          <label htmlFor="fullName" className={labelCls}>Full name</label>
          <input id="fullName" name="fullName" type="text" autoComplete="name" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Your name" disabled={busy} className={fieldClass} />
        </div>
      )}

      <div className="flex flex-col gap-2">
        <label htmlFor="email" className={labelCls}>Email</label>
        <input id="email" name="email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" disabled={busy} className={fieldClass} />
      </div>

      {mode !== 'magic' && (
        <div className="flex flex-col gap-2">
          <label htmlFor="password" className={labelCls}>Password</label>
          <input
            id="password"
            name="password"
            type="password"
            required
            minLength={8}
            autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={mode === 'signup' ? 'At least 8 characters' : 'Your password'}
            disabled={busy}
            className={fieldClass}
          />
        </div>
      )}

      {error && (
        <div className="bg-error-container text-on-error-container p-4 flex flex-col gap-2">
          <p className="font-label text-xs uppercase tracking-widest">{error}</p>
          {noPasswordHint && (
            <p className="text-sm">
              Only ever used a magic link? You don’t have a password yet —{' '}
              <button type="button" onClick={() => reset('magic')} className="underline font-semibold">
                sign in with a magic link
              </button>{' '}
              once, then set a password from your profile.
            </p>
          )}
        </div>
      )}

      <div className="flex flex-col gap-4">
        <button type="submit" disabled={busy} className={submitClass}>
          {busy
            ? 'Working…'
            : mode === 'magic'
              ? 'Send sign-in link'
              : mode === 'signup'
                ? 'Create account'
                : 'Sign in'}
        </button>
        {mode !== 'magic' && (
          <button type="button" onClick={() => reset('magic')} className="self-center font-label text-xs uppercase tracking-widest text-on-surface-variant hover:text-primary transition-colors">
            Use a magic link instead
          </button>
        )}
      </div>
    </form>
  )
}
