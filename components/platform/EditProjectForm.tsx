'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { updateProject } from '@/app/dashboard/projects/actions'
import { ProjectFieldInputs, type ProjectFieldDefaults } from './ProjectFieldInputs'
import { primaryButtonClass } from './styles'

type OrgOption = { id: string; name: string }

// Staff: edit a project's scoping detail inline on the detail page.
export function EditProjectForm({
  projectId,
  project,
  organizations,
}: {
  projectId: string
  project: ProjectFieldDefaults
  organizations: OrgOption[]
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    setError(null)
    startTransition(async () => {
      const result = await updateProject(projectId, formData)
      if (result.ok) {
        setOpen(false)
        router.refresh()
      } else setError(result.error)
    })
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="self-start font-label text-xs uppercase tracking-widest text-primary hover:text-primary-container transition-colors"
      >
        Edit details
      </button>
    )
  }

  return (
    <form onSubmit={onSubmit} className="flex w-full max-w-2xl flex-col gap-5 bg-surface-container-low p-6 md:p-8">
      <ProjectFieldInputs organizations={organizations} project={project} disabled={isPending} />

      {error && (
        <div className="bg-error-container p-4 text-on-error-container">
          <p className="font-label text-xs uppercase tracking-widest">{error}</p>
        </div>
      )}

      <div className="flex items-center gap-4">
        <button type="submit" disabled={isPending} className={primaryButtonClass}>
          {isPending ? 'Saving…' : 'Save changes'}
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
