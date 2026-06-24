'use client'

import { useRef, useState, useTransition } from 'react'

type SubmitResult = { ok: true } | { ok: false; error: string }

export function StudentResumeForm() {
  const [result, setResult] = useState<SubmitResult | null>(null)
  const [isPending, startTransition] = useTransition()
  const [fileName, setFileName] = useState('')
  const formRef = useRef<HTMLFormElement>(null)

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    startTransition(async () => {
      try {
        // Trailing slash matches next.config `trailingSlash: true`, avoiding a
        // 308 redirect on the POST.
        const res = await fetch('/api/students/', { method: 'POST', body: formData })
        const data = (await res.json()) as SubmitResult
        setResult(data)
        if (data.ok) {
          formRef.current?.reset()
          setFileName('')
        }
      } catch {
        setResult({ ok: false, error: 'Something went wrong on our end. Please try again.' })
      }
    })
  }

  if (result?.ok) {
    return (
      <div className="flex flex-col gap-4 w-full max-w-xl mx-auto text-center">
        <div className="font-label text-xs uppercase tracking-widest text-primary">Received</div>
        <h2 className="font-headline text-3xl text-on-surface">Thanks — you&rsquo;re in.</h2>
        <p className="font-body text-on-surface-variant leading-relaxed">
          We have your details and resume on file. We&rsquo;ll reach out as
          opportunities in your community take shape.
        </p>
        <button
          type="button"
          onClick={() => setResult(null)}
          className="mt-4 self-center font-label text-xs uppercase tracking-widest text-on-surface-variant hover:text-primary transition-colors"
        >
          Submit Another
        </button>
      </div>
    )
  }

  return (
    <form ref={formRef} onSubmit={onSubmit} className="flex flex-col gap-8 w-full max-w-xl mx-auto">
      {/* Honeypot: hidden from people; a bot that fills it is silently dropped. */}
      <div
        aria-hidden="true"
        style={{ position: 'absolute', width: '1px', height: '1px', padding: 0, margin: '-1px', overflow: 'hidden', clip: 'rect(0,0,0,0)', whiteSpace: 'nowrap', border: 0 }}
      >
        <label htmlFor="company_website">Company website (leave blank)</label>
        <input id="company_website" name="company_website" type="text" tabIndex={-1} autoComplete="off" defaultValue="" />
      </div>

      <div className="space-y-1">
        <h2 className="font-headline text-3xl text-on-surface tracking-tight mb-2">Join the Talent Pool</h2>
        <p className="text-sm text-on-surface-variant font-medium">
          Share your details and resume. We review on a rolling basis.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <div className="flex flex-col gap-2">
          <label htmlFor="name" className="font-label text-xs font-semibold text-on-surface-variant uppercase tracking-widest">
            Full Name
          </label>
          <input
            id="name"
            name="name"
            type="text"
            required
            placeholder="Your name"
            disabled={isPending}
            className="w-full bg-surface-container-high border-0 border-b-2 border-transparent text-on-surface p-4 text-base focus:ring-0 focus:border-secondary transition-colors placeholder:text-outline-variant disabled:opacity-60"
          />
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="email" className="font-label text-xs font-semibold text-on-surface-variant uppercase tracking-widest">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            placeholder="you@university.edu"
            disabled={isPending}
            className="w-full bg-surface-container-high border-0 border-b-2 border-transparent text-on-surface p-4 text-base focus:ring-0 focus:border-secondary transition-colors placeholder:text-outline-variant disabled:opacity-60"
          />
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="resume" className="font-label text-xs font-semibold text-on-surface-variant uppercase tracking-widest">
            Resume
            <span className="ml-2 font-normal normal-case tracking-normal text-[10px] text-on-surface-variant/70">
              PDF or Word, up to 5 MB
            </span>
          </label>
          {/* Native file input is hard to style consistently; hide it and drive a
              styled label so the control matches the rest of the form. */}
          <label
            htmlFor="resume"
            className="group flex items-center justify-between gap-4 cursor-pointer bg-surface-container-high border-b-2 border-transparent text-on-surface p-4 text-base hover:bg-surface-container-highest transition-colors has-[:focus-visible]:border-secondary"
          >
            <span className={fileName ? 'text-on-surface truncate' : 'text-outline-variant truncate'}>
              {fileName || 'Choose a file…'}
            </span>
            <span className="font-label text-xs uppercase tracking-widest text-on-surface-variant group-hover:text-primary transition-colors shrink-0">
              Browse
            </span>
            <input
              id="resume"
              name="resume"
              type="file"
              required
              accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              disabled={isPending}
              onChange={(e) => setFileName(e.target.files?.[0]?.name ?? '')}
              className="sr-only"
            />
          </label>
        </div>
      </div>

      {result && !result.ok && (
        <div className="bg-error-container text-on-error-container p-4">
          <p className="font-label text-xs uppercase tracking-widest">
            Submission Error: {result.error}
          </p>
        </div>
      )}

      <div className="pt-4 mt-2">
        <button
          type="submit"
          disabled={isPending}
          className="w-full bg-primary hover:bg-primary-container text-on-primary font-label text-sm uppercase tracking-widest font-bold py-5 px-8 transition-colors flex items-center justify-center gap-3 group disabled:opacity-60 disabled:cursor-not-allowed"
        >
          <span>{isPending ? 'Submitting...' : 'Submit'}</span>
          {isPending ? (
            <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
              <path d="M22 12a10 10 0 0 1-10 10" />
            </svg>
          ) : (
            <svg className="transform group-hover:translate-x-1 transition-transform" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          )}
        </button>
      </div>
    </form>
  )
}
