'use server'

import { revalidatePath } from 'next/cache'
import { requireRole } from '@/lib/auth/session'
import { approveAssessment } from '@/lib/matchcore/assessments'

export type ApproveResult = { ok: true } | { ok: false; error: string }

// Staff gate: a scored assessment only counts for matching once approved.
export async function approveAssessmentAction(id: string): Promise<ApproveResult> {
  const me = await requireRole('hub_staff')
  const ok = await approveAssessment(id, me.id)
  if (!ok) return { ok: false, error: 'Only a scored assessment can be approved.' }
  revalidatePath(`/dashboard/assessments/${id}`)
  revalidatePath('/dashboard/assessments')
  return { ok: true }
}
