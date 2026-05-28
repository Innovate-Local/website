import { getSupabaseClient } from '@/lib/supabase'

export type InquiryType = 'join' | 'start' | 'partner' | 'members'

export type SubmitInquiryResult =
  | { ok: true; reference: string }
  | { ok: false; error: string }

const REQUIRED_FIELDS: Record<InquiryType, string[]> = {
  join: ['fullName', 'email', 'statement'],
  start: ['fullName', 'email', 'statement'],
  partner: ['fullName', 'email', 'statement'],
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

export async function submitInquiry(
  type: InquiryType,
  formData: FormData,
): Promise<SubmitInquiryResult> {
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
    if (typeof value === 'string') payload[field] = value
  }

  const reference = `IL-${Date.now().toString(36).toUpperCase()}`

  const supabase = getSupabaseClient()
  if (!supabase) {
    console.warn('[submitInquiry] Supabase not configured — submission not persisted', {
      reference,
      ...payload,
    })
    return { ok: true, reference }
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
