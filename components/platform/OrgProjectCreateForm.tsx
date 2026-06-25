'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createOrgProject } from '@/app/dashboard/projects/actions'
import { ProjectFieldInputs } from './ProjectFieldInputs'
import { primaryButtonClass } from './styles'

// Org admin: create a project for their own organization (org is server-derived).
export function OrgProjectCreateForm() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    setError(null)
    startTransition(async () => {
      const result = await createOrgProject(formData)
      if (result.ok && result.id) router.push(`/dashboard/projects/${result.id}`)
      else if (!result.ok) setError(result.error)
    })
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className={primaryButtonClass}>
        New project
      </button>
    )
  }

  return (
    <form onSubmit={onSubmit} className="flex w-full max-w-2xl flex-col gap-5 bg-surface-container-low p-6 md:p-8">
      <ProjectFieldInputs organizations={[]} hideOrg disabled={isPending} />
      {error && (
        <div className="bg-error-container p-4 text-on-error-container">
          <p className="font-label text-xs uppercase tracking-widest">{error}</p>
        </div>
      )}
      <div className="flex items-center gap-4">
        <button type="submit" disabled={isPending} className={primaryButtonClass}>
          {isPending ? 'Creating…' : 'Create project'}
        </button>
        <button type="button" onClick={() => setOpen(false)} disabled={isPending} className="font-label text-xs uppercase tracking-widest text-on-surface-variant hover:text-primary transition-colors">
          Cancel
        </button>
      </div>
    </form>
  )
}
