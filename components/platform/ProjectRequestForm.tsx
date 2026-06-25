'use client'

import { useRef, useState, useTransition } from 'react'
import { submitProjectRequest } from '@/app/dashboard/projects/request-actions'
import { inputClass, labelClass, primaryButtonClass } from './styles'

// Org member: propose a project. Staff review and convert it into a real project.
export function ProjectRequestForm() {
  const formRef = useRef<HTMLFormElement>(null)
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    setError(null)
    setDone(false)
    startTransition(async () => {
      const result = await submitProjectRequest(formData)
      if (result.ok) {
        formRef.current?.reset()
        setOpen(false)
        setDone(true)
      } else setError(result.error)
    })
  }

  if (!open) {
    return (
      <div className="flex items-center gap-4">
        <button type="button" onClick={() => setOpen(true)} className={primaryButtonClass}>
          Request a project
        </button>
        {done && <span className="font-label text-xs uppercase tracking-widest text-primary">Request submitted</span>}
      </div>
    )
  }

  return (
    <form ref={formRef} onSubmit={onSubmit} className="flex w-full max-w-2xl flex-col gap-5 bg-surface-container-low p-6 md:p-8">
      <p className="font-body text-on-surface-variant">
        Describe the problem you’d like a team to work on. Your hub will review it and scope it into a
        project.
      </p>
      <div className="flex flex-col gap-2">
        <label htmlFor="req-title" className={labelClass}>Title</label>
        <input id="req-title" name="title" required placeholder="What do you need help with?" disabled={isPending} className={inputClass} />
      </div>
      <div className="flex flex-col gap-2">
        <label htmlFor="req-summary" className={labelClass}>Summary <span className="lowercase opacity-60">(one line)</span></label>
        <input id="req-summary" name="summary" placeholder="A one-line description." disabled={isPending} className={inputClass} />
      </div>
      <div className="flex flex-col gap-2">
        <label htmlFor="req-problem" className={labelClass}>The problem</label>
        <textarea id="req-problem" name="problemStatement" rows={4} placeholder="What's the problem, and what would a good outcome look like?" disabled={isPending} className={`${inputClass} resize-y`} />
      </div>
      {error && (
        <div className="bg-error-container p-4 text-on-error-container">
          <p className="font-label text-xs uppercase tracking-widest">{error}</p>
        </div>
      )}
      <div className="flex items-center gap-4">
        <button type="submit" disabled={isPending} className={primaryButtonClass}>
          {isPending ? 'Submitting…' : 'Submit request'}
        </button>
        <button type="button" onClick={() => setOpen(false)} disabled={isPending} className="font-label text-xs uppercase tracking-widest text-on-surface-variant hover:text-primary transition-colors">
          Cancel
        </button>
      </div>
    </form>
  )
}
