'use server'

import { revalidatePath } from 'next/cache'
import { requireProfile } from '@/lib/auth/session'
import { resolveViewerOrg, type OrgMembership } from '@/lib/platform/credits'
import { aiConfigured, AiError } from '@/lib/ai/client'
import { nextInterviewTurn, extractComplexity, extractProjectDraft } from '@/lib/matchcore/agents'
import { interviewGreeting } from '@/lib/matchcore/prompts'
import {
  getRequestDiscovery,
  saveScore as saveDiscoveryScore,
  saveTranscript as saveDiscoveryTranscript,
  startRequestDiscovery,
  transcriptOf as discoveryTranscript,
} from '@/lib/matchcore/discovery'
import {
  applyDraftToRequest,
  createDraftingRequest,
  getDraftingRequestForOrg,
  getRequestById,
  submitRequest,
  updateDraftFields,
} from '@/lib/platform/project-requests'
import { parseTags } from '@/lib/platform/apprentice-fields'
import type { InterviewMessage } from '@/lib/matchcore/types'

export type StartResult = { ok: true; requestId: string } | { ok: false; error: string }
export type ReplyResult = { ok: true; message: string; done: boolean } | { ok: false; error: string }
export type SimpleResult = { ok: true } | { ok: false; error: string }

const BASE = '/dashboard/projects/describe'
function errMsg(e: unknown): string {
  return e instanceof AiError ? e.message : 'Something went wrong. Please try again.'
}

// Org admins (incl. staff acting as an org admin) may describe a project.
// resolveViewerOrg is "act as"-aware and carries the effective roleInOrg.
async function requireOrgAdmin(): Promise<OrgMembership | null> {
  const me = await requireProfile()
  const org = await resolveViewerOrg(me.id)
  return org && org.roleInOrg === 'admin' ? org : null
}

async function ownedDraftRequest(requestId: string, org: OrgMembership) {
  const req = await getRequestById(requestId)
  return req && req.orgId === org.orgId ? req : null
}

// Start (or resume) the org's draft: ensure a 'drafting' request + a discovery
// seeded with Scout's greeting.
export async function startDescribe(): Promise<StartResult> {
  const org = await requireOrgAdmin()
  if (!org) return { ok: false, error: 'Only organization admins can describe a project.' }
  const me = await requireProfile()
  if (!aiConfigured()) return { ok: false, error: 'The discovery assistant isn’t configured yet.' }

  let requestId = await getDraftingRequestForOrg(org.orgId)
  if (!requestId) requestId = await createDraftingRequest(org.orgId, me.id)

  const disc = await getRequestDiscovery(requestId)
  if (!disc) {
    const id = await startRequestDiscovery(requestId)
    await saveDiscoveryTranscript(id, [{ role: 'assistant', content: interviewGreeting.complexity }])
  }
  revalidatePath(BASE)
  return { ok: true, requestId }
}

export async function replyDescribe(
  requestId: string,
  history: InterviewMessage[],
  userText: string,
): Promise<ReplyResult> {
  const org = await requireOrgAdmin()
  if (!org) return { ok: false, error: 'Not authorized.' }
  if (!(await ownedDraftRequest(requestId, org))) return { ok: false, error: 'Draft not found.' }
  const disc = await getRequestDiscovery(requestId)
  if (!disc) return { ok: false, error: 'Discovery not found.' }
  if (!aiConfigured()) return { ok: false, error: 'The discovery assistant isn’t available right now.' }

  const me = await requireProfile()
  const withUser: InterviewMessage[] = [...history, { role: 'user', content: userText }]
  try {
    const { message, done } = await nextInterviewTurn('complexity', withUser, {
      userId: me.id,
      orgId: org.orgId,
      requestId,
    })
    await saveDiscoveryTranscript(disc.id, [...withUser, { role: 'assistant', content: message }])
    return { ok: true, message, done }
  } catch (e) {
    return { ok: false, error: errMsg(e) }
  }
}

// Finish: from ONE conversation, draft the project fields (org-facing) and score
// complexity (staff-facing) — in parallel. Request stays 'drafting' until submit.
export async function finishDescribe(requestId: string): Promise<SimpleResult> {
  const org = await requireOrgAdmin()
  if (!org) return { ok: false, error: 'Not authorized.' }
  if (!(await ownedDraftRequest(requestId, org))) return { ok: false, error: 'Draft not found.' }
  const disc = await getRequestDiscovery(requestId)
  if (!disc) return { ok: false, error: 'Discovery not found.' }
  if (!aiConfigured()) return { ok: false, error: 'The assistant isn’t available right now.' }

  const transcript = discoveryTranscript(disc)
  if (transcript.filter((m) => m.role === 'user').length < 1) {
    return { ok: false, error: 'Answer at least one question before finishing.' }
  }
  const me = await requireProfile()
  const ctx = { userId: me.id, orgId: org.orgId, requestId }
  try {
    const [complexity, draft] = await Promise.all([
      extractComplexity(transcript, ctx),
      extractProjectDraft(transcript, ctx),
    ])
    await saveDiscoveryScore(disc.id, complexity, transcript)
    await applyDraftToRequest(requestId, draft)
    revalidatePath(BASE)
    return { ok: true }
  } catch (e) {
    return { ok: false, error: errMsg(e) }
  }
}

// Manual edits to the drafted fields (the "type it yourself" path).
export async function updateDescribeDraft(requestId: string, formData: FormData): Promise<SimpleResult> {
  const org = await requireOrgAdmin()
  if (!org) return { ok: false, error: 'Not authorized.' }
  if (!(await ownedDraftRequest(requestId, org))) return { ok: false, error: 'Draft not found.' }

  const title = String(formData.get('title') ?? '').trim()
  if (!title) return { ok: false, error: 'A project title is required.' }
  const str = (k: string) => String(formData.get(k) ?? '').trim() || null

  await updateDraftFields(requestId, {
    title,
    summary: str('summary'),
    problemStatement: str('problemStatement'),
    description: str('description'),
    skillsNeeded: parseTags(String(formData.get('skillsNeeded') ?? '')),
  })
  revalidatePath(BASE)
  return { ok: true }
}

// Submit the draft to the hub (drafting → open).
export async function submitDescribe(requestId: string): Promise<SimpleResult> {
  const org = await requireOrgAdmin()
  if (!org) return { ok: false, error: 'Not authorized.' }
  if (!(await ownedDraftRequest(requestId, org))) return { ok: false, error: 'Draft not found.' }
  const ok = await submitRequest(requestId)
  if (!ok) return { ok: false, error: 'This draft can no longer be submitted.' }
  revalidatePath(BASE)
  revalidatePath('/dashboard/organization')
  revalidatePath('/dashboard/projects')
  return { ok: true }
}
