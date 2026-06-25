'use client'

import { useState, useTransition } from 'react'
import { updateProfile } from '@/app/dashboard/profile/actions'

// Edit the self-editable parts of a profile (just the display name today).
// Read-only identity fields (email, role) are shown by the page around it.
export function ProfileForm({ fullName }: { fullName: string | null }) {
  const [isPending, startTransition] = useTransition()
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    setSaved(false)
    setError(null)
    startTransition(async () => {
      const result = await updateProfile(formData)
      if (result.ok) setSaved(true)
      else setError(result.error)
    })
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-6 max-w-lg">
      <div className="flex flex-col gap-2">
        <label
          htmlFor="fullName"
          className="font-label text-xs font-semibold text-on-surface-variant uppercase tracking-widest"
        >
          Full Name
        </label>
        <input
          id="fullName"
          name="fullName"
          type="text"
          defaultValue={fullName ?? ''}
          placeholder="Your name"
          disabled={isPending}
          onChange={() => setSaved(false)}
          className="w-full bg-surface-container-high border-0 border-b-2 border-transparent text-on-surface p-4 text-base focus:ring-0 focus:border-secondary transition-colors placeholder:text-outline-variant disabled:opacity-60"
        />
      </div>

      {error && (
        <div className="bg-error-container text-on-error-container p-4">
          <p className="font-label text-xs uppercase tracking-widest">{error}</p>
        </div>
      )}

      <div className="flex items-center gap-4">
        <button
          type="submit"
          disabled={isPending}
          className="bg-primary hover:bg-primary-container text-on-primary font-label text-sm uppercase tracking-widest font-bold py-4 px-8 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isPending ? 'Saving...' : 'Save changes'}
        </button>
        {saved && !isPending && (
          <span className="font-label text-xs uppercase tracking-widest text-primary">Saved</span>
        )}
      </div>
    </form>
  )
}
