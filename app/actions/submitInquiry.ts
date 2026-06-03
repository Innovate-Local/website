import { getSupabaseClient } from '@/lib/supabase'

export type InquiryType = 'join' | 'partner' | 'members'

export type SubmitInquiryResult =
  | { ok: true; reference: string }
  | { ok: false; error: string }

const REQUIRED_FIELDS: Record<InquiryType, string[]> = {
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

// Hidden form field that real people never see or fill. Bots tend to fill every
// field, so a non-empty value here marks the submission as automated spam.
const HONEYPOT_FIELD = 'company_website'

export async function submitInquiry(
  type: InquiryType,
  formData: FormData,
): Promise<SubmitInquiryResult> {
  const reference = `IL-${Date.now().toString(36).toUpperCase()}`

  // Honeypot: if this hidden field has any value, a bot filled it. Accept the
  // request (so the bot gets no signal that it was caught) but save nothing.
  if (formData.get(HONEYPOT_FIELD)?.toString().trim()) {
    return { ok: true, reference }
  }

  const required = REQUIRED_FIELDS[type]
  for (const field of required) {
    const value = formData.get(field)?.toString().trim()
    if (!value) {
      return { ok: false, error: 'Please fill in all required fields.' }
    }
  }

  const email = formData.get('email')?.toString().trim() ?? ''
  if (!email.includes('@')) {
    return { ok: false, error: 'Please provide a valid email address.' }
  }

  const payload: Record<string, string> = { type }
  for (const [field, value] of formData.entries()) {
    if (field === HONEYPOT_FIELD) continue
    if (typeof value === 'string') payload[field] = value
  }

  const supabase = getSupabaseClient()
  if (!supabase) {
    // Misconfiguration (missing Supabase settings). Do NOT report success —
    // surface an honest error so a real submission is never silently lost.
    console.error('[submitInquiry] Supabase not configured — submission not saved', {
      reference,
    })
    return { ok: false, error: 'Something went wrong on our end. Please try again.' }
  }

  const { error } = await supabase.from('inquiries').insert({
    type,
    payload,
    reference,
  })

  if (error) {
    console.error('[submitInquiry] Supabase insert failed', error)
    return { ok: false, error: 'Something went wrong on our end. Please try again.' }
  }

  return { ok: true, reference }
}
