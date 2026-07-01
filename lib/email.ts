// Transactional email via Resend. Server-only. Lazily constructs the client so a
// missing key never breaks a build or a request path — when unconfigured,
// sendEmail logs and no-ops (returns { ok: false, skipped: true }) so callers can
// proceed (e.g. still show the redemption code in-app) without a hard dependency
// on email infra in dev.
//
// Config (in .env):
//   RESEND_API_KEY  — Resend API key
//   EMAIL_FROM      — verified sender, e.g. "InnovateLocal <no-reply@innovatelocal.ai>"
import { Resend } from 'resend'

let client: Resend | null = null

function getResend(): Resend | null {
  const key = process.env.RESEND_API_KEY
  if (!key) return null
  if (!client) client = new Resend(key)
  return client
}

const FROM = process.env.EMAIL_FROM || 'InnovateLocal <onboarding@resend.dev>'

export type SendEmailResult =
  | { ok: true; id: string | null }
  | { ok: false; skipped: true }
  | { ok: false; error: string }

export async function sendEmail(input: {
  to: string | string[]
  subject: string
  html: string
  cc?: string | string[]
  replyTo?: string
}): Promise<SendEmailResult> {
  const resend = getResend()
  if (!resend) {
    console.warn(`[email] RESEND_API_KEY not set — skipping "${input.subject}" to`, input.to)
    return { ok: false, skipped: true }
  }
  try {
    const { data, error } = await resend.emails.send({
      from: FROM,
      to: input.to,
      cc: input.cc,
      replyTo: input.replyTo,
      subject: input.subject,
      html: input.html,
    })
    if (error) {
      console.error('[email] send failed:', error)
      return { ok: false, error: error.message }
    }
    return { ok: true, id: data?.id ?? null }
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown email error'
    console.error('[email] send threw:', msg)
    return { ok: false, error: msg }
  }
}

export function isEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY)
}
