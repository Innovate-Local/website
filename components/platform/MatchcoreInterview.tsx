'use client'

// Reusable turn-based interview chat for MatchCore (Compass for apprentices,
// Scout for businesses). Deliberately generic: it holds the transcript in state
// and delegates every side effect to the two server actions passed in as props,
// so it knows nothing about which phase it's driving or what happens on finish.
import { useEffect, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { InterviewMessage } from '@/lib/matchcore/types'
import { primaryButtonClass, ghostButtonClass, inputClass } from './styles'

export type ReplyResult = { ok: true; message: string; done: boolean } | { ok: false; error: string }
export type FinishResult = { ok: true } | { ok: false; error: string }

type Props = {
  initialMessages: InterviewMessage[]
  onReply: (history: InterviewMessage[], userText: string) => Promise<ReplyResult>
  onFinish: () => Promise<FinishResult>
  finishLabel: string
  // Once the agent signals completion we surface the finish button, but the user
  // can finish early at any point too.
}

export function MatchcoreInterview({ initialMessages, onReply, onFinish, finishLabel }: Props) {
  const [messages, setMessages] = useState<InterviewMessage[]>(initialMessages)
  const [input, setInput] = useState('')
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sending, startSend] = useTransition()
  const [finishing, startFinish] = useTransition()
  const router = useRouter()
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, sending])

  function send() {
    const text = input.trim()
    if (!text || sending) return
    setError(null)
    const history = messages
    const optimistic = [...messages, { role: 'user', content: text } as InterviewMessage]
    setMessages(optimistic)
    setInput('')
    startSend(async () => {
      const res = await onReply(history, text)
      if (!res.ok) {
        setError(res.error)
        setMessages(history) // roll back the optimistic user turn
        setInput(text)
        return
      }
      setMessages([...optimistic, { role: 'assistant', content: res.message }])
      if (res.done) setDone(true)
    })
  }

  function finish() {
    setError(null)
    startFinish(async () => {
      const res = await onFinish()
      if (!res.ok) {
        setError(res.error)
        return
      }
      router.refresh()
    })
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 bg-surface-container p-4 max-h-[28rem] overflow-y-auto">
        {messages.map((m, i) => (
          <div key={i} className={m.role === 'assistant' ? 'flex justify-start' : 'flex justify-end'}>
            <div
              className={
                (m.role === 'assistant'
                  ? 'bg-surface-container-high text-on-surface'
                  : 'bg-primary text-on-primary') + ' max-w-[85%] whitespace-pre-wrap px-4 py-3 font-body text-sm'
              }
            >
              {m.content}
            </div>
          </div>
        ))}
        {sending && (
          <div className="flex justify-start">
            <div className="bg-surface-container-high px-4 py-3 font-body text-sm text-on-surface-variant">…</div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {error && <p className="font-body text-sm text-error">{error}</p>}

      <div className="flex flex-col gap-3">
        <textarea
          className={inputClass}
          rows={2}
          value={input}
          placeholder="Type your answer…"
          disabled={finishing}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) send()
          }}
        />
        <div className="flex items-center gap-4">
          <button type="button" className={primaryButtonClass} onClick={send} disabled={sending || finishing || !input.trim()}>
            {sending ? 'Sending…' : 'Send'}
          </button>
          <span className="font-label text-xs text-outline-variant">⌘/Ctrl + Enter</span>
          <div className="flex-1" />
          <button type="button" className={ghostButtonClass} onClick={finish} disabled={finishing || sending}>
            {finishing ? 'Scoring…' : done ? finishLabel : `${finishLabel} (early)`}
          </button>
        </div>
        {done && (
          <p className="font-body text-sm text-on-surface-variant">
            The conversation has covered everything — you can finish now.
          </p>
        )}
      </div>
    </div>
  )
}
