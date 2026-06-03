import Link from 'next/link'
import { Navigation } from './Navigation'
import { Footer } from './Footer'
import { ContactForm } from '@/components/ui/ContactForm'
import type { InquiryType } from '@/app/actions/submitInquiry'

export type SupportingListItem = {
  number: string
  title: string
  body: string
}

export type SupportingFormField = {
  id: string
  label: string
  type?: 'text' | 'email' | 'textarea' | 'radio'
  placeholder?: string
  required?: boolean
  colSpan?: 1 | 2
  rows?: number
  /** Choices for type === 'radio' (single-choice chip group). */
  options?: { value: string; label: string }[]
}

export type SupportingPageShellProps = {
  inquiryType: InquiryType
  stampLabel: string
  headline: React.ReactNode
  paragraphs: string[]
  listItems: SupportingListItem[]
  formTitle: string
  formSubtitle: string
  formFields: SupportingFormField[]
  submitLabel: string
}

export function SupportingPageShell({
  inquiryType,
  stampLabel,
  headline,
  paragraphs,
  listItems,
  formTitle,
  formSubtitle,
  formFields,
  submitLabel,
}: SupportingPageShellProps) {
  return (
    <>
      <Navigation />
      <main id="main-content" className="flex-grow w-full max-w-screen-2xl mx-auto px-6 md:px-12 py-12 md:py-24 grid grid-cols-1 lg:grid-cols-12 gap-16 lg:gap-8 items-start">
        <article className="lg:col-span-5 flex flex-col gap-10">
          <div className="flex flex-col items-start gap-4">
            <Link
              href="/"
              className="group flex items-center gap-2 text-on-surface-variant hover:text-primary transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                <line x1="19" y1="12" x2="5" y2="12" />
                <polyline points="12 19 5 12 12 5" />
              </svg>
              <span className="font-label text-xs uppercase tracking-annotation font-medium">
                Return Home
              </span>
            </Link>
            <div className="bg-tertiary-container px-3 py-1 inline-block">
              <span className="font-label text-[10px] text-on-tertiary-container uppercase tracking-widest font-bold">
                {stampLabel}
              </span>
            </div>
          </div>

          <h1 className="font-headline text-6xl md:text-7xl lg:text-8xl leading-[0.9] tracking-tight text-on-surface">
            {headline}
          </h1>

          <div className="space-y-6 text-on-surface-variant font-body text-base md:text-lg leading-relaxed max-w-lg">
            {paragraphs.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>

          <div className="flex flex-col gap-0 mt-4 border-t border-outline-variant/20">
            {listItems.map((item) => (
              <div
                key={item.number}
                className="flex items-start gap-6 py-5 border-b border-outline-variant/20 hover:bg-surface-container-low transition-colors px-2"
              >
                <span className="font-headline text-2xl text-secondary italic">
                  {item.number}
                </span>
                <div>
                  <h3 className="font-body font-semibold text-on-surface text-sm uppercase tracking-wide mb-1">
                    {item.title}
                  </h3>
                  <p className="text-sm text-on-surface-variant leading-snug">{item.body}</p>
                </div>
              </div>
            ))}
          </div>
        </article>

        <aside className="lg:col-span-7 w-full lg:pl-12">
          <div className="bg-surface-container-low p-8 md:p-14 w-full h-full min-h-[600px] flex flex-col justify-center">
            <ContactForm
              type={inquiryType}
              formTitle={formTitle}
              formSubtitle={formSubtitle}
              fields={formFields}
              submitLabel={submitLabel}
            />
          </div>
        </aside>
      </main>
      <Footer />
    </>
  )
}
