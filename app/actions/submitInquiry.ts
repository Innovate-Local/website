import { getSupabaseClient } from '@/lib/supabase'

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
