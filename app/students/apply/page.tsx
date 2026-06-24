import type { Metadata } from 'next'
import Link from 'next/link'
import { Navigation } from '@/components/layout/Navigation'
import { Footer } from '@/components/layout/Footer'
import { StudentResumeForm } from '@/components/ui/StudentResumeForm'

export const metadata: Metadata = {
  title: 'Submit Your Resume // InnovateLocal',
  description:
    'Share your details and resume to join the InnovateLocal talent pool. Applied AI work in the community where you live.',
}

export default function StudentApplyPage() {
  return (
    <>
      <Navigation />
      <main
        id="main-content"
        className="flex-grow w-full max-w-screen-2xl mx-auto px-6 md:px-12 py-12 md:py-24 grid grid-cols-1 lg:grid-cols-12 gap-16 lg:gap-8 items-start"
      >
        <article className="lg:col-span-5 flex flex-col gap-10">
          <div className="flex flex-col items-start gap-4">
            <Link
              href="/students"
              className="group flex items-center gap-2 text-on-surface-variant hover:text-primary transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                <line x1="19" y1="12" x2="5" y2="12" />
                <polyline points="12 19 5 12 12 5" />
              </svg>
              <span className="font-label text-xs uppercase tracking-annotation font-medium">
                For Students
              </span>
            </Link>
            <div className="bg-tertiary-container px-3 py-1 inline-block">
              <span className="font-label text-[10px] text-on-tertiary-container uppercase tracking-widest font-bold">
                Talent Pool
              </span>
            </div>
          </div>

          <h1 className="font-headline text-6xl md:text-7xl lg:text-8xl leading-[0.9] tracking-tight text-on-surface">
            Submit Your <br />
            Resume.
          </h1>

          <div className="space-y-6 text-on-surface-variant font-body text-base md:text-lg leading-relaxed max-w-lg">
            <p>
              Tell us who you are and leave your resume on file. As applied AI
              work opens up in university towns across the country, we&rsquo;ll
              reach out to the people whose background fits.
            </p>
            <p>
              This is not coursework or a training program. Real problems, real
              organizations, in the community where you live.
            </p>
          </div>
        </article>

        <aside className="lg:col-span-7 w-full lg:pl-12">
          <div className="bg-surface-container-low p-8 md:p-14 w-full h-full min-h-[600px] flex flex-col justify-center">
            <StudentResumeForm />
          </div>
        </aside>
      </main>
      <Footer />
    </>
  )
}
