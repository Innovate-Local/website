'use client'

import { useState, useTransition } from 'react'
import {
  submitInquiry,
  type InquiryType,
  type SubmitInquiryResult,
} from '@/app/actions/submitInquiry'
import type { SupportingFormField } from '@/components/layout/SupportingPageShell'

type ContactFormProps = {
  type: InquiryType
  formTitle?: string
  formSubtitle?: string
  fields: SupportingFormField[]
  submitLabel: string
}

export function ContactForm({
  type,
  formTitle,
  formSubtitle,
  fields,
  submitLabel,
}: ContactFormProps) {
  const [result, setResult] = useState<SubmitInquiryResult | null>(null)
  const [isPending, startTransition] = useTransition()

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    startTransition(async () => {
      const r = await submitInquiry(type, formData)
      setResult(r)
      if (r.ok) {
        e.currentTarget?.reset?.()
      }
    })
  }

  if (result?.ok) {
    return (
      <div className="flex flex-col gap-4 w-full max-w-xl mx-auto text-center">
        <div className="font-label text-xs uppercase tracking-widest text-primary">
          Registered
        </div>
        <h2 className="font-headline text-3xl text-on-surface">Your inquiry is in.</h2>
        <p className="font-body text-on-surface-variant leading-relaxed">
          A confirmation email is on its way to the address you provided, and
          we&rsquo;ll be in touch. Your reference is{' '}
          <span className="font-label text-on-surface">{result.reference}</span>.
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
    <form onSubmit={onSubmit} className="flex flex-col gap-8 w-full max-w-xl mx-auto">
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

      {(formTitle || formSubtitle) && (
        <div className="space-y-1">
          {formTitle && (
            <h2 className="font-headline text-3xl text-on-surface tracking-tight mb-2">
              {formTitle}
            </h2>
          )}
          {formSubtitle && (
            <p className="text-sm text-on-surface-variant font-medium">{formSubtitle}</p>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {fields.map((field) => {
          const wrapperClass = `col-span-1 ${field.colSpan === 2 ? 'md:col-span-2' : ''} flex flex-col gap-2`
          const optional = !field.required ? (
            <span className="ml-2 font-normal normal-case tracking-normal text-[10px] text-on-surface-variant/70">
              optional
            </span>
          ) : null

          // Single-choice chip group (e.g. partnership tier). Real radio inputs
          // are visually hidden but keep full keyboard + screen-reader behavior;
          // the chip styling is driven by the input's :checked / :focus-visible state.
          if (field.type === 'radio') {
            return (
              <fieldset key={field.id} className={`${wrapperClass} border-0 p-0 m-0 min-w-0`}>
                <legend className="font-label text-xs font-semibold text-on-surface-variant uppercase tracking-widest p-0 mb-1">
                  {field.label}
                  {optional}
                </legend>
                <div className="flex flex-wrap gap-2">
                  {(field.options ?? []).map((opt) => (
                    <label
                      key={opt.value}
                      className="cursor-pointer select-none bg-surface-container-high text-on-surface px-4 py-3 text-sm font-medium transition-colors hover:bg-surface-container-highest has-[:checked]:bg-primary has-[:checked]:text-on-primary has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-primary"
                    >
                      <input
                        type="radio"
                        name={field.id}
                        value={opt.value}
                        required={field.required}
                        disabled={isPending}
                        className="sr-only"
                      />
                      {opt.label}
                    </label>
                  ))}
                </div>
              </fieldset>
            )
          }

          return (
            <div key={field.id} className={wrapperClass}>
              <label
                htmlFor={field.id}
                className="font-label text-xs font-semibold text-on-surface-variant uppercase tracking-widest"
              >
                {field.label}
                {optional}
              </label>
              {field.type === 'textarea' ? (
                <textarea
                  id={field.id}
                  name={field.id}
                  rows={field.rows ?? 4}
                  required={field.required}
                  placeholder={field.placeholder}
                  disabled={isPending}
                  className="w-full bg-surface-container-high border-0 border-b-2 border-transparent text-on-surface p-4 text-base focus:ring-0 focus:border-secondary transition-colors placeholder:text-outline-variant resize-none disabled:opacity-60"
                />
              ) : (
                <input
                  id={field.id}
                  name={field.id}
                  type={field.type ?? 'text'}
                  required={field.required}
                  placeholder={field.placeholder}
                  disabled={isPending}
                  className="w-full bg-surface-container-high border-0 border-b-2 border-transparent text-on-surface p-4 text-base focus:ring-0 focus:border-secondary transition-colors placeholder:text-outline-variant disabled:opacity-60"
                />
              )}
            </div>
          )
        })}
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
          <span>{isPending ? 'Submitting...' : submitLabel}</span>
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
