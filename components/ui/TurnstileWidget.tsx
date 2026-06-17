'use client'

import { useEffect, useRef, useState } from 'react'
import Script from 'next/script'

// Public Turnstile site key for innovatelocal.ai. Safe to commit and ship in the
// browser bundle — site keys are meant to be public. The secret half lives only
// in Supabase (TURNSTILE_SECRET_KEY) and never reaches the client. An env var can
// override it (e.g. for a test key) but the default keeps the build self-contained.
const SITE_KEY =
  process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || '0x4AAAAAADlW6As1MlLClE3P'

const SCRIPT_SRC =
  'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'

type TurnstileApi = {
  render: (el: HTMLElement, opts: Record<string, unknown>) => string
  remove: (id: string) => void
  reset: (id?: string) => void
}

declare global {
  interface Window {
    turnstile?: TurnstileApi
  }
}

type Props = {
  /** Fired with the one-time token when the visitor passes the check. */
  onVerify?: (token: string) => void
  /** Fired when the token expires or the check errors — the visitor is no longer
   *  verified and must pass again. */
  onExpire?: () => void
  /** Bump this number to force a reset (e.g. after a failed submit, since
   *  Turnstile tokens are single-use). */
  resetSignal?: number
  className?: string
}

export function TurnstileWidget({ onVerify, onExpire, resetSignal, className }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const widgetIdRef = useRef<string | null>(null)

  // Keep the latest callbacks in refs so the render effect runs only once.
  const onVerifyRef = useRef(onVerify)
  const onExpireRef = useRef(onExpire)
  useEffect(() => {
    onVerifyRef.current = onVerify
  }, [onVerify])
  useEffect(() => {
    onExpireRef.current = onExpire
  }, [onExpire])

  const [scriptReady, setScriptReady] = useState(false)
  // On a client-side navigation the script may already be loaded.
  useEffect(() => {
    if (typeof window !== 'undefined' && window.turnstile) setScriptReady(true)
  }, [])

  useEffect(() => {
    if (!scriptReady || !containerRef.current || widgetIdRef.current || !window.turnstile) return
    const id = window.turnstile.render(containerRef.current, {
      sitekey: SITE_KEY,
      theme: 'light',
      callback: (token: string) => onVerifyRef.current?.(token),
      'expired-callback': () => onExpireRef.current?.(),
      'error-callback': () => onExpireRef.current?.(),
    })
    widgetIdRef.current = id
    return () => {
      if (window.turnstile) {
        try {
          window.turnstile.remove(id)
        } catch {
          /* widget already removed */
        }
      }
      widgetIdRef.current = null
    }
  }, [scriptReady])

  // Parent-driven reset (after a failed submit). Clearing also tells the parent
  // the visitor is unverified again until the fresh check passes.
  useEffect(() => {
    if (resetSignal === undefined || !widgetIdRef.current || !window.turnstile) return
    window.turnstile.reset(widgetIdRef.current)
    onExpireRef.current?.()
  }, [resetSignal])

  return (
    <div className={className}>
      <Script src={SCRIPT_SRC} strategy="afterInteractive" onLoad={() => setScriptReady(true)} />
      <div ref={containerRef} />
    </div>
  )
}
