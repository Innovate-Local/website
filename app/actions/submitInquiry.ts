/**
 * Form submission for /join, /start, /partner.
 *
 * Stubbed for the initial Pages migration — accepts the form, validates, and
 * returns a success reference without persisting anywhere. The real backend
 * (Supabase, browser-side insert under RLS) is the next item on the launch
 * readiness list. See docs/launch-readiness.md → "Form rewire".
 */

export type InquiryType = 'join' | 'start' | 'partner'

export type SubmitInquiryResult =
  | { ok: true; reference: string }
  | { ok: false; error: string }

export async function submitInquiry(
  type: InquiryType,
  formData: FormData,
): Promise<SubmitInquiryResult> {
  const fullName = formData.get('fullName')?.toString().trim()
  const email = formData.get('email')?.toString().trim()
  const statement = formData.get('statement')?.toString().trim()

  if (!fullName || !email || !statement) {
    return { ok: false, error: 'Please fill in all required fields.' }
  }

  if (!email.includes('@')) {
    return { ok: false, error: 'Please provide a valid email address.' }
  }

  const reference = `IL-${Date.now().toString(36).toUpperCase()}`

  if (typeof window !== 'undefined') {
    const payload: Record<string, string> = { type }
    for (const [key, value] of formData.entries()) {
      if (typeof value === 'string') payload[key] = value
    }
    console.log('[submitInquiry]', { reference, ...payload })
  }

  return { ok: true, reference }
}
