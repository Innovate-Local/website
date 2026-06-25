'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createProject } from '@/app/dashboard/projects/actions'
import { ProjectFieldInputs } from './ProjectFieldInputs'
import { primaryButtonClass } from './styles'

type OrgOption = { id: string; name: string }

// Staff form to create a project. Collapsible; on success it routes to the new
// project's detail page.
export function CreateProjectForm({ organizations }: { organizations: OrgOption[] }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    setError(null)
    startTransition(async () => {
      const result = await createProject(formData)
      if (result.ok && result.id) {
        router.push(`/dashboard/projects/${result.id}`)
      } else if (!result.ok) {
        setError(result.error)
      }
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
    <form onSubmit={onSubmit} className="bg-surface-container-low p-6 md:p-8 flex flex-col gap-5 w-full max-w-2xl">
      <ProjectFieldInputs organizations={organizations} disabled={isPending} />

      {error && (
        <div className="bg-error-container text-on-error-container p-4">
          <p className="font-label text-xs uppercase tracking-widest">{error}</p>
        </div>
      )}

      <div className="flex items-center gap-4">
        <button type="submit" disabled={isPending} className={primaryButtonClass}>
          {isPending ? 'Creating...' : 'Create project'}
        </button>
        <button type="button" onClick={() => setOpen(false)} disabled={isPending} className="font-label text-xs uppercase tracking-widest text-on-surface-variant hover:text-primary transition-colors">
          Cancel
        </button>
      </div>
    </form>
  )
}
