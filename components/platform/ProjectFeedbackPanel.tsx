'use client'

import { useState, useTransition } from 'react'
import { submitFeedback } from '@/app/dashboard/projects/feedback-actions'
import { RATING_LABEL, RATING_SCALE, ratingStars } from '@/lib/platform/feedback-types'
import { labelClass, primaryButtonClass } from './styles'
import type { FeedbackRow } from '@/lib/platform/feedback'

type TeamApprentice = { userId: string; name: string }
type Prefill = { rating: number | null; comment: string | null }

export function ProjectFeedbackPanel({
  projectId,
  orgName,
  canRate,
  canReflect,
  teamApprentices,
  myApprenticeRatings,
  myReflection,
  visibleFeedback,
}: {
  projectId: string
  orgName: string | null
  canRate: boolean
  canReflect: boolean
  teamApprentices: TeamApprentice[]
  myApprenticeRatings: Record<string, Prefill>
  myReflection: Prefill | null
  visibleFeedback: FeedbackRow[]
}) {
  return (
    <div className="flex flex-col gap-8">
      {canReflect && (
        <div className="flex flex-col gap-3">
          <h3 className="font-headline text-xl text-on-surface">Your reflection</h3>
          <p className="text-sm text-on-surface-variant">
            How was working with {orgName || 'this organization'} on this engagement?
          </p>
          <FeedbackForm
            projectId={projectId}
            subjectType="organization"
            initial={myReflection}
            commentPlaceholder="What went well, what you'd change, what you learned."
          />
        </div>
      )}

      {canRate && teamApprentices.length > 0 && (
        <div className="flex flex-col gap-3">
          <h3 className="font-headline text-xl text-on-surface">Rate the team</h3>
          <p className="text-sm text-on-surface-variant">Your assessment of each apprentice on this project.</p>
          <div className="flex flex-col gap-px border border-outline-variant/30 bg-outline-variant/30">
            {teamApprentices.map((a) => (
              <div key={a.userId} className="flex flex-col gap-3 bg-surface p-5">
                <span className="font-body text-on-surface">{a.name}</span>
                <FeedbackForm
                  projectId={projectId}
                  subjectType="apprentice"
                  subjectUserId={a.userId}
                  initial={myApprenticeRatings[a.userId] ?? null}
                  commentPlaceholder="What they did well; where they can grow."
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {visibleFeedback.length > 0 && (
        <div className="flex flex-col gap-3">
          <h3 className="font-headline text-xl text-on-surface">Feedback</h3>
          <ul className="flex flex-col gap-px border border-outline-variant/30 bg-outline-variant/30">
            {visibleFeedback.map((f) => (
              <li key={f.id} className="flex flex-col gap-1 bg-surface px-5 py-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-label text-xs uppercase tracking-widest text-on-surface-variant">
                    {f.authorName || 'Someone'} → {f.subjectType === 'apprentice' ? f.subjectUserName || 'apprentice' : f.subjectOrgName || 'organization'}
                  </span>
                  {f.rating != null && (
                    <span className="text-primary" title={RATING_LABEL[f.rating]}>
                      {ratingStars(f.rating)}
                    </span>
                  )}
                </div>
                {f.comment && <p className="font-body text-sm text-on-surface">{f.comment}</p>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

function StarPicker({
  value,
  onChange,
  disabled,
}: {
  value: number
  onChange: (n: number) => void
  disabled: boolean
}) {
  const [hover, setHover] = useState(0)
  const shown = hover || value
  return (
    <div className="flex items-center gap-1" onMouseLeave={() => setHover(0)}>
      {RATING_SCALE.map((n) => (
        <button
          key={n}
          type="button"
          disabled={disabled}
          onMouseEnter={() => setHover(n)}
          onClick={() => onChange(n)}
          aria-label={`${n} — ${RATING_LABEL[n]}`}
          className={`text-2xl leading-none transition-colors disabled:opacity-60 ${
            n <= shown ? 'text-primary' : 'text-outline-variant'
          }`}
        >
          ★
        </button>
      ))}
      <span className="ml-2 font-label text-xs uppercase tracking-widest text-on-surface-variant">
        {shown ? RATING_LABEL[shown] : 'Not rated'}
      </span>
    </div>
  )
}

function FeedbackForm({
  projectId,
  subjectType,
  subjectUserId,
  initial,
  commentPlaceholder,
}: {
  projectId: string
  subjectType: 'apprentice' | 'organization'
  subjectUserId?: string
  initial: Prefill | null
  commentPlaceholder: string
}) {
  const [rating, setRating] = useState<number>(initial?.rating ?? 0)
  const [comment, setComment] = useState<string>(initial?.comment ?? '')
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!rating) {
      setError('Choose a rating from 1 to 5.')
      return
    }
    const formData = new FormData()
    formData.set('projectId', projectId)
    formData.set('subjectType', subjectType)
    if (subjectUserId) formData.set('subjectUserId', subjectUserId)
    formData.set('rating', String(rating))
    formData.set('comment', comment)
    setError(null)
    setSaved(false)
    startTransition(async () => {
      const result = await submitFeedback(formData)
      if (result.ok) setSaved(true)
      else setError(result.error)
    })
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3">
      <div className="flex flex-col gap-2">
        <span className={labelClass}>Rating</span>
        <StarPicker value={rating} onChange={setRating} disabled={isPending} />
      </div>
      <textarea
        value={comment}
        onChange={(e) => {
          setComment(e.target.value)
          setSaved(false)
        }}
        placeholder={commentPlaceholder}
        disabled={isPending}
        rows={3}
        className="w-full resize-y border-0 border-b-2 border-transparent bg-surface-container-high p-4 text-base text-on-surface transition-colors placeholder:text-outline-variant focus:border-secondary focus:ring-0 disabled:opacity-60"
      />
      <div className="flex items-center gap-4">
        <button type="submit" disabled={isPending} className={primaryButtonClass}>
          {isPending ? 'Saving…' : initial ? 'Update' : 'Submit'}
        </button>
        {saved && <span className="font-label text-xs uppercase tracking-widest text-primary">Saved</span>}
      </div>
      {error && (
        <div className="bg-error-container p-3 text-on-error-container">
          <p className="font-label text-xs uppercase tracking-widest">{error}</p>
        </div>
      )}
    </form>
  )
}
