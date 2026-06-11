'use client'

import { useState, useTransition } from 'react'
import {
  submitInquiry,
  type SubmitInquiryResult,
} from '@/app/actions/submitInquiry'

const INDUSTRY_OPTIONS = [
  'Retail',
  'Restaurant / Hospitality',
  'Professional Services (Law, CPA, Consulting)',
  'Healthcare',
  'Trades / Construction',
  'Manufacturing',
  'Real Estate',
  'Technology',
  'Education',
  'Nonprofit / Community Org',
  'Other',
]

const SIZE_OPTIONS = [
  '1–5 employees',
  '6–20 employees',
  '21–50 employees',
  '51–100 employees',
  '100+ employees',
]

const DESIGNATION_OPTIONS = [
  { value: 'for-profit', label: 'For-profit business' },
  { value: '501c3', label: '501(c)(3) Nonprofit' },
  { value: 'other-np', label: 'Other Nonprofit' },
  { value: 'public', label: 'Public Sector' },
]

const SOURCE_OPTIONS = [
  'Event or Presentation',
  'Referral',
  'Press / Media',
  'Website',
  'Social',
  'Other',
]

const fieldLabelClass =
  'font-label text-[11px] font-bold text-on-surface-variant uppercase tracking-[0.18em] mb-2 block'
const optionalClass =
  'font-normal normal-case tracking-normal text-[10px] opacity-70 ml-1.5'
const inputClass =
  'w-full bg-surface-container-high border-0 border-b-2 border-transparent text-on-surface px-4 py-3.5 text-[15px] focus:ring-0 focus:border-secondary outline-none transition-colors placeholder:text-outline disabled:opacity-60'

export function MembersForm() {
  const [result, setResult] = useState<SubmitInquiryResult | null>(null)
  const [designation, setDesignation] = useState('for-profit')
  const [isPending, startTransition] = useTransition()

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const formData = new FormData(form)
    startTransition(async () => {
      const r = await submitInquiry('members', formData)
      setResult(r)
      if (r.ok) {
        form.reset()
        setDesignation('for-profit')
      }
    })
  }

  if (result?.ok) {
    return (
      <div className="flex flex-col gap-4 text-center py-8">
        <div className="font-label text-xs uppercase tracking-widest text-primary">
          Reserved
        </div>
        <h3 className="font-headline text-3xl text-on-surface">Your seat is held.</h3>
        <p className="font-body text-on-surface-variant leading-relaxed">
          You&rsquo;ll receive a confirmation email shortly; session details
          and the calendar invite will follow separately. If your situation is
          time-sensitive, we&rsquo;ll reach out directly.
        </p>
        <p className="font-body text-sm text-on-surface-variant">
          Reference:{' '}
          <span className="font-label text-on-surface">{result.reference}</span>
        </p>
        <button
          type="button"
          onClick={() => setResult(null)}
          className="mt-4 self-center font-label text-xs uppercase tracking-widest text-on-surface-variant hover:text-primary transition-colors"
        >
          Reserve Another Seat
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5">
      {/* Honeypot: hidden from people; a bot that fills it is silently dropped. */}
      <div
        aria-hidden="true"
        style={{ position: 'absolute', width: '1px', height: '1px', padding: 0, margin: '-1px', overflow: 'hidden', clip: 'rect(0,0,0,0)', whiteSpace: 'nowrap', border: 0 }}
      >
        <label htmlFor="company_website">Company website (leave blank)</label>
        <input
          id="company_website"
          name="company_website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          defaultValue=""
        />
      </div>

      <div className="mb-2">
        <h3 className="font-headline text-2xl md:text-[26px] text-on-surface tracking-tight mb-2">
          Reserve a Seat
        </h3>
        <p className="font-body text-sm text-on-surface-variant leading-relaxed">
          A few quick questions so we can tailor the conversation to your
          organization. All responses are confidential.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div>
          <label htmlFor="name" className={fieldLabelClass}>Your Name</label>
          <input
            id="name"
            name="name"
            type="text"
            required
            placeholder="First and last"
            disabled={isPending}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="title" className={fieldLabelClass}>Your Title</label>
          <input
            id="title"
            name="title"
            type="text"
            required
            placeholder="e.g. Owner, Executive Director"
            disabled={isPending}
            className={inputClass}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div>
          <label htmlFor="email" className={fieldLabelClass}>Email</label>
          <input
            id="email"
            name="email"
            type="email"
            required
            placeholder="you@yourbusiness.com"
            disabled={isPending}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="phone" className={fieldLabelClass}>
            Phone <span className={optionalClass}>(optional)</span>
          </label>
          <input
            id="phone"
            name="phone"
            type="tel"
            placeholder="(555) 555-5555"
            disabled={isPending}
            className={inputClass}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div>
          <label htmlFor="organization" className={fieldLabelClass}>
            Business or Organization
          </label>
          <input
            id="organization"
            name="organization"
            type="text"
            required
            placeholder="Name of your business or nonprofit"
            disabled={isPending}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="location" className={fieldLabelClass}>Location</label>
          <input
            id="location"
            name="location"
            type="text"
            required
            placeholder="City, PA"
            disabled={isPending}
            className={inputClass}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div>
          <label htmlFor="industry" className={fieldLabelClass}>
            Industry / Type
          </label>
          <select
            id="industry"
            name="industry"
            required
            defaultValue=""
            disabled={isPending}
            className={`${inputClass} appearance-none bg-[length:12px_8px] bg-no-repeat bg-[right_1rem_center] pr-10`}
            style={{
              backgroundImage:
                "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath fill='%237e5700' d='M6 8L0 0h12z'/%3E%3C/svg%3E\")",
            }}
          >
            <option value="" disabled>Select one</option>
            {INDUSTRY_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="size" className={fieldLabelClass}>
            Organization Size
          </label>
          <select
            id="size"
            name="size"
            required
            defaultValue=""
            disabled={isPending}
            className={`${inputClass} appearance-none bg-[length:12px_8px] bg-no-repeat bg-[right_1rem_center] pr-10`}
            style={{
              backgroundImage:
                "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath fill='%237e5700' d='M6 8L0 0h12z'/%3E%3C/svg%3E\")",
            }}
          >
            <option value="" disabled>Select one</option>
            {SIZE_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <span className={fieldLabelClass}>Nonprofit Designation</span>
        <div className="flex flex-wrap gap-2">
          {DESIGNATION_OPTIONS.map((opt) => {
            const selected = designation === opt.value
            return (
              <label
                key={opt.value}
                className={`cursor-pointer select-none px-4 py-2.5 text-[13px] border-2 border-transparent transition-colors ${
                  selected
                    ? 'bg-primary text-on-primary'
                    : 'bg-surface-container-high text-on-surface hover:bg-surface-container-highest'
                }`}
              >
                <input
                  type="radio"
                  name="nonprofitDesignation"
                  value={opt.value}
                  checked={selected}
                  onChange={() => setDesignation(opt.value)}
                  className="hidden"
                  disabled={isPending}
                />
                {opt.label}
              </label>
            )
          })}
        </div>
      </div>

      <div>
        <label htmlFor="challenge" className={fieldLabelClass}>
          Biggest Challenge AI Might Help With
        </label>
        <textarea
          id="challenge"
          name="challenge"
          required
          rows={4}
          placeholder="A few sentences about what you'd most like to put AI to work on. A process, a bottleneck, an opportunity. Whatever's on your plate."
          disabled={isPending}
          className={`${inputClass} min-h-[96px] resize-y leading-relaxed`}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div>
          <label htmlFor="source" className={fieldLabelClass}>
            How did you hear about us?{' '}
            <span className={optionalClass}>(optional)</span>
          </label>
          <select
            id="source"
            name="source"
            defaultValue=""
            disabled={isPending}
            className={`${inputClass} appearance-none bg-[length:12px_8px] bg-no-repeat bg-[right_1rem_center] pr-10`}
            style={{
              backgroundImage:
                "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath fill='%237e5700' d='M6 8L0 0h12z'/%3E%3C/svg%3E\")",
            }}
          >
            <option value="">Select one</option>
            {SOURCE_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="additionalNotes" className={fieldLabelClass}>
            Anything else? <span className={optionalClass}>(optional)</span>
          </label>
          <textarea
            id="additionalNotes"
            name="additionalNotes"
            rows={2}
            placeholder="Anything we should know in advance"
            disabled={isPending}
            className={`${inputClass} resize-y leading-relaxed`}
          />
        </div>
      </div>

      {result && !result.ok && (
        <div className="bg-error-container text-on-error-container p-4">
          <p className="font-label text-xs uppercase tracking-widest">
            Submission Error: {result.error}
          </p>
        </div>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="w-full bg-primary hover:bg-secondary text-on-primary font-label text-[13px] uppercase tracking-[0.22em] font-bold py-5 px-8 transition-colors flex items-center justify-center gap-3 group disabled:opacity-60 disabled:cursor-not-allowed mt-2"
      >
        <span>{isPending ? 'Submitting…' : 'Reserve My Seat'}</span>
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

      <p className="font-body text-xs text-on-surface-variant text-center tracking-[0.04em]">
        Your responses are confidential and used only to prepare for the session.
      </p>
    </form>
  )
}
