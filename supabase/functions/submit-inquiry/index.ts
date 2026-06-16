// submit-inquiry — Supabase Edge Function (gatekeeper for the public contact forms)
//
// The website's three forms (Join, Partner, Members) POST here instead of writing
// to the database directly. This function:
//   1. verifies the Cloudflare Turnstile human-check token (the secret half stays
//      server-side and never reaches the browser),
//   2. drops honeypot/bot submissions and validates the required fields,
//   3. inserts the inquiry with the service role — which fires the existing
//      send-autoreply trigger exactly as a direct insert used to.
// Because every save now passes through here, the anon key's direct INSERT on
// public.inquiries is revoked separately, so the human-check cannot be skipped.
//
// Deploys to the shared InnovateLocal Supabase project (verify_jwt = false: the
// public form has no logged-in user; the Turnstile token is the gate).
//
// Secrets (Supabase Edge Function Secrets, never in git):
//   TURNSTILE_SECRET_KEY                      — Cloudflare Turnstile secret half
//   SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY  — injected by Supabase automatically

import { createClient } from 'npm:@supabase/supabase-js@2'

const TURNSTILE_SECRET = Deno.env.get('TURNSTILE_SECRET_KEY') ?? ''

const ALLOWED_ORIGINS = ['https://innovatelocal.ai', 'https://www.innovatelocal.ai']

const REQUIRED_FIELDS: Record<string, string[]> = {
  join: ['fullName', 'email', 'statement'],
  partner: ['fullName', 'title', 'email', 'organization'],
  members: [
    'name',
    'title',
    'email',
    'organization',
    'location',
    'industry',
    'size',
    'nonprofitDesignation',
    'challenge',
  ],
}
const VALID_TYPES = Object.keys(REQUIRED_FIELDS)
const HONEYPOT_FIELD = 'company_website'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
)

function corsHeaders(origin: string | null): Record<string, string> {
  // Reflect known origins; allow localhost for local dev; otherwise fall back to
  // the production origin.
  const allow =
    origin && (ALLOWED_ORIGINS.includes(origin) || /^http:\/\/localhost(:\d+)?$/.test(origin))
      ? origin
      : ALLOWED_ORIGINS[0]
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    Vary: 'Origin',
  }
}

function json(status: number, body: Record<string, unknown>, origin: string | null): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
  })
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get('Origin')
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders(origin) })
  if (req.method !== 'POST') return json(405, { ok: false, error: 'method not allowed' }, origin)

  const reference = `IL-${Date.now().toString(36).toUpperCase()}`

  let body: { type?: unknown; token?: unknown; fields?: unknown }
  try {
    body = await req.json()
  } catch {
    return json(200, { ok: false, error: 'Something went wrong. Please try again.' }, origin)
  }

  const type = String(body.type ?? '')
  const token = String(body.token ?? '')
  const rawFields =
    body.fields && typeof body.fields === 'object' ? (body.fields as Record<string, unknown>) : {}
  const fields: Record<string, string> = {}
  for (const [k, v] of Object.entries(rawFields)) {
    if (typeof v === 'string') fields[k] = v
  }

  // Honeypot — a real person never fills this. Accept silently, save nothing.
  if ((fields[HONEYPOT_FIELD] ?? '').trim()) return json(200, { ok: true, reference }, origin)

  // Human-check gate.
  if (!TURNSTILE_SECRET) {
    console.error('[submit-inquiry] TURNSTILE_SECRET_KEY is not set')
    return json(200, { ok: false, error: 'Something went wrong on our end. Please try again.' }, origin)
  }
  if (!token) return json(200, { ok: false, error: 'Please complete the verification check.' }, origin)

  const verifyResp = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ secret: TURNSTILE_SECRET, response: token }),
  })
  const verify = await verifyResp.json().catch(() => ({ success: false }))
  if (!verify.success) {
    return json(200, { ok: false, error: 'The verification check didn’t pass. Please try again.' }, origin)
  }

  // Validate type + required fields (authoritative; the browser checks are only
  // for fast feedback and can be bypassed).
  if (!VALID_TYPES.includes(type)) return json(200, { ok: false, error: 'Unknown form type.' }, origin)
  for (const field of REQUIRED_FIELDS[type]) {
    if (!(fields[field] ?? '').trim()) {
      return json(200, { ok: false, error: 'Please fill in all required fields.' }, origin)
    }
  }
  if (!(fields.email ?? '').includes('@')) {
    return json(200, { ok: false, error: 'Please provide a valid email address.' }, origin)
  }

  // Build the stored payload (everything the visitor sent except the honeypot),
  // matching the shape the send-autoreply function already reads.
  const payload: Record<string, string> = { type }
  for (const [k, v] of Object.entries(fields)) {
    if (k === HONEYPOT_FIELD) continue
    payload[k] = v
  }

  const { error } = await supabase.from('inquiries').insert({ type, payload, reference })
  if (error) {
    console.error('[submit-inquiry] insert failed:', error.message)
    return json(200, { ok: false, error: 'Something went wrong on our end. Please try again.' }, origin)
  }

  return json(200, { ok: true, reference }, origin)
})
