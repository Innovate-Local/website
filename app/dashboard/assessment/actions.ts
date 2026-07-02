'use server'

import { revalidatePath } from 'next/cache'
import { requireRole } from '@/lib/auth/session'
import { aiConfigured, AiError } from '@/lib/ai/client'
import { nextInterviewTurn, extractCompetency } from '@/lib/matchcore/agents'
import { interviewGreeting } from '@/lib/matchcore/prompts'
import {
  getAssessmentById,
  saveScore,
  saveTranscript,
  startAssessment,
  transcriptOf,
} from '@/lib/matchcore/assessments'
import type { InterviewMessage } from '@/lib/matchcore/types'

export type StartResult = { ok: true } | { ok: false; error: string }
export type ReplyResult = { ok: true; message: string; done: boolean } | { ok: false; error: string }
export type FinishResult = { ok: true } | { ok: false; error: string }

function errMsg(e: unknown): string {
  return e instanceof AiError ? e.message : 'Something went wrong. Please try again.'
}

// Start (or restart) the apprentice's competency interview, seeded with the
// interviewer's greeting.
export async function startAssessmentAction(): Promise<StartResult> {
  const me = await requireRole('apprentice')
  if (!aiConfigured()) return { ok: false, error: 'The interview assistant isn’t configured yet. Please try again later.' }
  const id = await startAssessment(me.id)
  await saveTranscript(id, me.id, [{ role: 'assistant', content: interviewGreeting.competency }])
  revalidatePath('/dashboard/assessment')
  return { ok: true }
}

// One interview turn: append the user's message, get the interviewer's reply,
// persist the transcript.
export async function replyAssessment(
  assessmentId: string,
  history: InterviewMessage[],
  userText: string,
): Promise<ReplyResult> {
  const me = await requireRole('apprentice')
  const a = await getAssessmentById(assessmentId)
  if (!a || a.userId !== me.id) return { ok: false, error: 'Assessment not found.' }
  if (!aiConfigured()) return { ok: false, error: 'The interview assistant isn’t available right now.' }

  const withUser: InterviewMessage[] = [...history, { role: 'user', content: userText }]
  try {
    const { message, done } = await nextInterviewTurn('competency', withUser, { userId: me.id })
    await saveTranscript(assessmentId, me.id, [...withUser, { role: 'assistant', content: message }])
    return { ok: true, message, done }
  } catch (e) {
    return { ok: false, error: errMsg(e) }
  }
}

// Extract signals from the transcript, score, and persist. Leaves the row
// 'scored' — staff approval is a separate step.
export async function finishAssessment(assessmentId: string): Promise<FinishResult> {
  const me = await requireRole('apprentice')
  const a = await getAssessmentById(assessmentId)
  if (!a || a.userId !== me.id) return { ok: false, error: 'Assessment not found.' }
  if (!aiConfigured()) return { ok: false, error: 'The scoring assistant isn’t available right now.' }

  const transcript = transcriptOf(a)
  if (transcript.filter((m) => m.role === 'user').length < 1) {
    return { ok: false, error: 'Answer at least one question before finishing.' }
  }
  try {
    const result = await extractCompetency(transcript, { userId: me.id })
    await saveScore(assessmentId, me.id, result, transcript)
    revalidatePath('/dashboard/assessment')
    return { ok: true }
  } catch (e) {
    return { ok: false, error: errMsg(e) }
  }
}
