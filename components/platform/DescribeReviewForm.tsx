'use client'

// Review/edit step for a MatchCore-drafted project request. The AI fills these
// fields from the discovery chat; the org admin can edit any of them (or type
// from scratch) before submitting to the hub. "Submit" saves edits then submits.
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { labelClass, inputClass, primaryButtonClass, ghostButtonClass } from './styles'

type Result = { ok: boolean; error?: string }

export function DescribeReviewForm({
  initial,
  save,
  submit,
}: {
  initial: { title: string; summary: string; problemStatement: string; description: string; skills: string[] }
  save: (formData: FormData) => Promise<Result>
  submit: () => Promise<Result>
}) {
  const [title, setTitle] = useState(initial.title)
  const [summary, setSummary] = useState(initial.summary)
  const [problem, setProblem] = useState(initial.problemStatement)
  const [description, setDescription] = useState(initial.description)
  const [skills, setSkills] = useState(initial.skills.join(', '))
  const [error, setError] = useState<string | null>(null)
  const [note, setNote] = useState<string | null>(null)
  const [pending, start] = useTransition()
  const router = useRouter()

  function formData(): FormData {
    const fd = new FormData()
    fd.set('title', title)
    fd.set('summary', summary)
    fd.set('problemStatement', problem)
    fd.set('description', description)
    fd.set('skillsNeeded', skills)
    return fd
  }

  function onSave() {
    setError(null)
    setNote(null)
    start(async () => {
      const res = await save(formData())
      if (!res.ok) setError(res.error ?? 'Could not save.')
      else setNote('Draft saved.')
    })
  }

  function onSubmit() {
    setError(null)
    setNote(null)
    start(async () => {
      const saved = await save(formData())
      if (!saved.ok) return setError(saved.error ?? 'Could not save.')
      const res = await submit()
      if (!res.ok) return setError(res.error ?? 'Could not submit.')
      router.push('/dashboard/organization')
    })
  }

  return (
    <div className="flex flex-col gap-5">
      <Field label="Project title">
        <input className={inputClass} value={title} onChange={(e) => setTitle(e.target.value)} />
      </Field>
      <Field label="Summary">
        <textarea className={inputClass} rows={2} value={summary} onChange={(e) => setSummary(e.target.value)} />
      </Field>
      <Field label="Problem statement">
        <textarea className={inputClass} rows={4} value={problem} onChange={(e) => setProblem(e.target.value)} />
      </Field>
      <Field label="Scope & approach">
        <textarea className={inputClass} rows={4} value={description} onChange={(e) => setDescription(e.target.value)} />
      </Field>
      <Field label="Skills needed (comma-separated)">
        <input className={inputClass} value={skills} onChange={(e) => setSkills(e.target.value)} />
      </Field>

      {error && <p className="font-body text-sm text-error">{error}</p>}
      {note && <p className="font-body text-sm text-on-surface-variant">{note}</p>}

      <div className="flex flex-wrap items-center gap-4">
        <button type="button" className={primaryButtonClass} onClick={onSubmit} disabled={pending || !title.trim()}>
          {pending ? 'Working…' : 'Submit to hub'}
        </button>
        <button type="button" className={ghostButtonClass} onClick={onSave} disabled={pending}>
          Save draft
        </button>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className={labelClass}>{label}</span>
      {children}
    </label>
  )
}
