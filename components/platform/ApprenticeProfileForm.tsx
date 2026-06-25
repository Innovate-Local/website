'use client'

import { useState, useTransition } from 'react'
import { updateApprenticeProfile } from '@/app/dashboard/profile/actions'
import {
  AVAILABILITY_OPTIONS,
  AVAILABILITY_LABEL,
  LINK_FIELDS,
} from '@/lib/platform/apprentice-fields'
import { inputClass, labelClass, primaryButtonClass } from './styles'
import type { ApprenticeProfile } from '@/lib/db/schema'

// Apprentice's matching/portfolio profile: skills, availability, bio, links.
// These feed the opportunities list and how staff weigh who to staff.
export function ApprenticeProfileForm({ profile }: { profile: ApprenticeProfile | null }) {
  const [isPending, startTransition] = useTransition()
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const links = (profile?.links ?? {}) as Record<string, string>

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    setSaved(false)
    setError(null)
    startTransition(async () => {
      const result = await updateApprenticeProfile(formData)
      if (result.ok) setSaved(true)
      else setError(result.error)
    })
  }

  return (
    <form onSubmit={onSubmit} className="flex max-w-2xl flex-col gap-6" onChange={() => setSaved(false)}>
      <div className="flex flex-col gap-2">
        <label htmlFor="headline" className={labelClass}>
          Headline
        </label>
        <input id="headline" name="headline" defaultValue={profile?.headline ?? ''} placeholder="e.g. Data-science apprentice, focused on NLP" disabled={isPending} className={inputClass} />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="bio" className={labelClass}>
          Bio
        </label>
        <textarea id="bio" name="bio" rows={4} defaultValue={profile?.bio ?? ''} placeholder="A short introduction — background, what you're looking to work on." disabled={isPending} className={`${inputClass} resize-y`} />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="skills" className={labelClass}>
          Skills <span className="lowercase opacity-60">(comma-separated)</span>
        </label>
        <input id="skills" name="skills" defaultValue={(profile?.skills ?? []).join(', ')} placeholder="Python, SQL, React, prompt engineering" disabled={isPending} className={inputClass} />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="flex flex-col gap-2">
          <label htmlFor="availability" className={labelClass}>
            Availability
          </label>
          <select id="availability" name="availability" defaultValue={profile?.availability ?? 'available'} disabled={isPending} className={inputClass}>
            {AVAILABILITY_OPTIONS.map((a) => (
              <option key={a} value={a}>
                {AVAILABILITY_LABEL[a]}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor="hoursPerWeek" className={labelClass}>
            Hours / week
          </label>
          <input id="hoursPerWeek" name="hoursPerWeek" type="number" min={0} max={168} defaultValue={profile?.hoursPerWeek ?? ''} placeholder="e.g. 10" disabled={isPending} className={inputClass} />
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor="location" className={labelClass}>
            Location
          </label>
          <input id="location" name="location" defaultValue={profile?.location ?? ''} placeholder="e.g. State College, PA" disabled={isPending} className={inputClass} />
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <span className={labelClass}>Links</span>
        <div className="grid gap-4 sm:grid-cols-2">
          {LINK_FIELDS.map((l) => (
            <input
              key={l.key}
              name={`link_${l.key}`}
              defaultValue={links[l.key] ?? ''}
              placeholder={l.label}
              disabled={isPending}
              className={inputClass}
            />
          ))}
        </div>
      </div>

      {error && (
        <div className="bg-error-container p-4 text-on-error-container">
          <p className="font-label text-xs uppercase tracking-widest">{error}</p>
        </div>
      )}

      <div className="flex items-center gap-4">
        <button type="submit" disabled={isPending} className={primaryButtonClass}>
          {isPending ? 'Saving…' : 'Save profile'}
        </button>
        {saved && !isPending && (
          <span className="font-label text-xs uppercase tracking-widest text-primary">Saved</span>
        )}
      </div>
    </form>
  )
}
