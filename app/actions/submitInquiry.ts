import { getSupabaseClient } from '@/lib/supabase'

export type InquiryType = 'join' | 'partner' | 'members'

export type SubmitInquiryResult =
  | { ok: true; reference: string }
  | { ok: false; error: string }

// The Cloudflare Turnstile widget may also inject a field by this name into the
// form; we send the token explicitly and never store it, so it's filtered out.
const TURNSTILE_FIELD = 'cf-turnstile-response'

// Submissions no longer write to the database directly. They POST to the
// `submit-inquiry` Edge Function, which verifies the human-check token
// (server-side, with the secret key) and only then saves the row. The browser
// holds only the public site key, so the check can't be forged here.
export async function submitInquiry(
  type: InquiryType,
  formData: FormData,
  token: string,
): Promise<SubmitInquiryResult> {
  if (!token) {
    return { ok: false, error: 'Please complete the verification check below and try again.' }
  }

  // Everything the visitor typed, minus the verification token (sent separately).
  const fields: Record<string, string> = {}
  for (const [field, value] of formData.entries()) {
    if (field === TURNSTILE_FIELD) continue
    if (typeof value === 'string') fields[field] = value
  }

  const supabase = getSupabaseClient()
  if (!supabase) {
    // Misconfiguration (missing Supabase settings). Surface an honest error so a
    // real submission is never silently lost.
    console.error('[submitInquiry] Supabase not configured — submission not saved')
    return { ok: false, error: 'Something went wrong on our end. Please try again.' }
  }

  try {
    const { data, error } = await supabase.functions.invoke<{
      ok: boolean
      reference?: string
      error?: string
    }>('submit-inquiry', {
      body: { type, token, fields },
    })

    if (error) {
      console.error('[submitInquiry] function call failed', error)
      return { ok: false, error: 'Something went wrong on our end. Please try again.' }
    }
    if (data?.ok) {
      return { ok: true, reference: String(data.reference ?? '') }
    }
    return {
      ok: false,
      error: data?.error ? String(data.error) : 'Something went wrong. Please try again.',
    }
  } catch (e) {
    console.error('[submitInquiry] unexpected error', e)
    return { ok: false, error: 'Something went wrong on our end. Please try again.' }
  }
}
