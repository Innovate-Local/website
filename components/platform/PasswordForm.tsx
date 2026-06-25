'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { inputClass, labelClass, primaryButtonClass } from './styles'

// Set or change the signed-in user's password. This is how someone who has only
// ever used magic links gives themselves a password — they're already
// authenticated, so no email is involved.
export function PasswordForm() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setDone(false)
    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    if (password !== confirm) {
      setError('Passwords don’t match.')
      return
    }
    setBusy(true)
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password })
    setBusy(false)
    if (error) setError(error.message)
    else {
      setDone(true)
      setPassword('')
      setConfirm('')
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex max-w-lg flex-col gap-6">
      <div className="flex flex-col gap-2">
        <label htmlFor="new-password" className={labelClass}>New password</label>
        <input id="new-password" type="password" autoComplete="new-password" minLength={8} value={password} onChange={(e) => { setPassword(e.target.value); setDone(false) }} placeholder="At least 8 characters" disabled={busy} className={inputClass} />
      </div>
      <div className="flex flex-col gap-2">
        <label htmlFor="confirm-password" className={labelClass}>Confirm password</label>
        <input id="confirm-password" type="password" autoComplete="new-password" minLength={8} value={confirm} onChange={(e) => { setConfirm(e.target.value); setDone(false) }} placeholder="Re-enter password" disabled={busy} className={inputClass} />
      </div>
      {error && (
        <div className="bg-error-container p-4 text-on-error-container">
          <p className="font-label text-xs uppercase tracking-widest">{error}</p>
        </div>
      )}
      <div className="flex items-center gap-4">
        <button type="submit" disabled={busy} className={primaryButtonClass}>
          {busy ? 'Saving…' : 'Set password'}
        </button>
        {done && <span className="font-label text-xs uppercase tracking-widest text-primary">Password updated</span>}
      </div>
    </form>
  )
}
