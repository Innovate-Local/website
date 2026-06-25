'use client'

import { useRef, useState, useTransition } from 'react'
import { createOrganization } from '@/app/dashboard/organizations/actions'
import { inputClass, labelClass, primaryButtonClass } from './styles'

const ORG_TYPES = [
  { value: '', label: 'Type (optional)' },
  { value: 'business', label: 'Business' },
  { value: 'nonprofit', label: 'Nonprofit' },
  { value: 'municipality', label: 'Municipality' },
  { value: 'other', label: 'Other' },
]

// Staff form to create an organization. Collapsible so it doesn't dominate the
// list page.
export function CreateOrgForm() {
  const formRef = useRef<HTMLFormElement>(null)
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    setError(null)
    startTransition(async () => {
      const result = await createOrganization(formData)
      if (result.ok) {
        formRef.current?.reset()
        setOpen(false)
      } else {
        setError(result.error)
      }
    })
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={primaryButtonClass}
      >
        New organization
      </button>
    )
  }

  return (
    <form
      ref={formRef}
      onSubmit={onSubmit}
      className="bg-surface-container-low p-6 md:p-8 flex flex-col gap-5 w-full max-w-xl"
    >
      <div className="flex flex-col gap-2">
        <label htmlFor="name" className={labelClass}>Name</label>
        <input id="name" name="name" type="text" required placeholder="Organization name" disabled={isPending} className={inputClass} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div className="flex flex-col gap-2">
          <label htmlFor="orgType" className={labelClass}>Type</label>
          <select id="orgType" name="orgType" disabled={isPending} className={inputClass} defaultValue="">
            {ORG_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor="location" className={labelClass}>Location</label>
          <input id="location" name="location" type="text" placeholder="City, State" disabled={isPending} className={inputClass} />
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor="industry" className={labelClass}>Industry</label>
          <input id="industry" name="industry" type="text" disabled={isPending} className={inputClass} />
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor="size" className={labelClass}>Size</label>
          <input id="size" name="size" type="text" placeholder="e.g. 10–50" disabled={isPending} className={inputClass} />
        </div>
      </div>

      {error && (
        <div className="bg-error-container text-on-error-container p-4">
          <p className="font-label text-xs uppercase tracking-widest">{error}</p>
        </div>
      )}

      <div className="flex items-center gap-4">
        <button type="submit" disabled={isPending} className={primaryButtonClass}>
          {isPending ? 'Creating...' : 'Create'}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          disabled={isPending}
          className="font-label text-xs uppercase tracking-widest text-on-surface-variant hover:text-primary transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}
