'use server'

import { revalidatePath } from 'next/cache'
import { requireRole } from '@/lib/auth/session'
import { aiConfigured, AiError } from '@/lib/ai/client'
import { nextInterviewTurn, extractComplexity } from '@/lib/matchcore/agents'
import { interviewGreeting } from '@/lib/matchcore/prompts'
import {
  approveDiscovery,
  getDiscoveryById,
  getCurrentDiscovery,
  resultOf as discoveryResult,
  saveScore as saveDiscoveryScore,
  saveTranscript as saveDiscoveryTranscript,
  startDiscovery,
  transcriptOf as discoveryTranscript,
} from '@/lib/matchcore/discovery'
import { approveMatch, runAndSaveMatch } from '@/lib/matchcore/matches'
import type { InterviewMessage } from '@/lib/matchcore/types'

export type ReplyResult = { ok: true; message: string; done: boolean } | { ok: false; error: string }
export type SimpleResult = { ok: true } | { ok: false; error: string }

function errMsg(e: unknown): string {
  return e instanceof AiError ? e.message : 'Something went wrong. Please try again.'
}
function base(projectId: string) {
  return `/dashboard/projects/${projectId}/matching`
}

// ---------------------------------------------------------------------------
// Phase B — discovery
// ---------------------------------------------------------------------------
export async function startDiscoveryAction(projectId: string): Promise<SimpleResult> {
  await requireRole('hub_staff')
  if (!aiConfigured()) return { ok: false, error: 'The discovery assistant isn’t configured yet.' }
  const id = await startDiscovery(projectId)
  await saveDiscoveryTranscript(id, [{ role: 'assistant', content: interviewGreeting.complexity }])
  revalidatePath(base(projectId))
  return { ok: true }
}

export async function replyDiscovery(
  discoveryId: string,
  history: InterviewMessage[],
  userText: string,
): Promise<ReplyResult> {
  await requireRole('hub_staff')
  const d = await getDiscoveryById(discoveryId)
  if (!d) return { ok: false, error: 'Discovery not found.' }
  if (!aiConfigured()) return { ok: false, error: 'The discovery assistant isn’t available right now.' }

  const withUser: InterviewMessage[] = [...history, { role: 'user', content: userText }]
  try {
    const { message, done } = await nextInterviewTurn('complexity', withUser)
    await saveDiscoveryTranscript(discoveryId, [...withUser, { role: 'assistant', content: message }])
    return { ok: true, message, done }
  } catch (e) {
    return { ok: false, error: errMsg(e) }
  }
}

export async function finishDiscovery(discoveryId: string, projectId: string): Promise<SimpleResult> {
  await requireRole('hub_staff')
  const d = await getDiscoveryById(discoveryId)
  if (!d) return { ok: false, error: 'Discovery not found.' }
  if (!aiConfigured()) return { ok: false, error: 'The scoring assistant isn’t available right now.' }

  const transcript = discoveryTranscript(d)
  if (transcript.filter((m) => m.role === 'user').length < 1) {
    return { ok: false, error: 'Answer at least one question before finishing.' }
  }
  try {
    const result = await extractComplexity(transcript)
    await saveDiscoveryScore(discoveryId, result, transcript)
    revalidatePath(base(projectId))
    return { ok: true }
  } catch (e) {
    return { ok: false, error: errMsg(e) }
  }
}

export async function approveDiscoveryAction(discoveryId: string, projectId: string): Promise<SimpleResult> {
  const me = await requireRole('hub_staff')
  const ok = await approveDiscovery(discoveryId, me.id)
  if (!ok) return { ok: false, error: 'Only a scored discovery can be approved.' }
  revalidatePath(base(projectId))
  return { ok: true }
}

// ---------------------------------------------------------------------------
// Phase C — matching
// ---------------------------------------------------------------------------
export async function generateMatchAction(projectId: string): Promise<SimpleResult> {
  const me = await requireRole('hub_staff')
  const discovery = await getCurrentDiscovery(projectId)
  const result = discovery ? discoveryResult(discovery) : null
  if (!result) return { ok: false, error: 'Run and score discovery before generating matches.' }

  // Include scored *and* approved apprentices in the pool so matching is usable
  // before every profile is individually approved; the consequential gate is
  // approving the match itself (which assigns the team).
  await runAndSaveMatch({
    projectId,
    complexity: result.complexity,
    projectType: result.projectType,
    pcs: result.pcs,
    generatedBy: me.id,
    approvedOnly: false,
  })
  revalidatePath(base(projectId))
  return { ok: true }
}

export async function approveMatchAction(matchId: string, projectId: string): Promise<SimpleResult> {
  const me = await requireRole('hub_staff')
  const res = await approveMatch(matchId, me.id)
  if (!res.ok) return { ok: false, error: 'This match run can no longer be approved.' }
  revalidatePath(base(projectId))
  revalidatePath(`/dashboard/projects/${projectId}`)
  revalidatePath('/dashboard/projects')
  return { ok: true }
}
