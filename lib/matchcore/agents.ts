// MatchCore AI agents. Server-only. The orchestration seam: it composes the
// vendor-abstracted client (lib/ai), the prompts (prompts.ts), and the pure
// scoring (scoring.ts) into three operations the services call:
//   • nextInterviewTurn — one conversational reply (Compass or Scout)
//   • extractCompetency  — transcript → scored CompetencyResult
//   • extractComplexity  — transcript → scored ComplexityResult
//
// Conversation, extraction, and scoring are deliberately three separate calls
// so any one can change (or be replaced by a manual form) without the others.

import { aiChat, aiStructured, type ChatMessage } from '@/lib/ai/client'
import {
  QUESTIONS_PER_TOPIC,
  competencyExtractionSchema,
  competencyExtractionSystemPrompt,
  complexityExtractionSchema,
  complexityExtractionSystemPrompt,
  interviewClosing,
  interviewTopics,
  interviewTurnPrompt,
  projectDraftSchema,
  projectDraftSystemPrompt,
} from './prompts'
import { scoreCompetency, scoreComplexity, type RawCompetencySignals, type RawComplexitySignals } from './scoring'
import type { CompetencyResult, ComplexityResult, InterviewMessage, ProjectDraft } from './types'

export type { InterviewMessage } from './types'
export type InterviewKind = 'competency' | 'complexity'

/**
 * Produce the interviewer's next reply. Flow control is deterministic: the
 * number of questions already asked (assistant turns, minus the greeting)
 * decides the current topic and whether the interview is over — the model never
 * decides that. Once the fixed question budget is spent we return a canned
 * closing with done:true (no model call), and the UI offers "Finish & score".
 */
export async function nextInterviewTurn(
  kind: InterviewKind,
  history: InterviewMessage[],
): Promise<{ message: string; done: boolean }> {
  const topics = interviewTopics(kind)
  const total = topics.length * QUESTIONS_PER_TOPIC

  // Questions asked so far = assistant turns excluding the seeded greeting.
  const askedQuestions = Math.max(0, history.filter((m) => m.role === 'assistant').length - 1)
  if (askedQuestions >= total) {
    return { message: interviewClosing[kind], done: true }
  }

  const topicIdx = Math.floor(askedQuestions / QUESTIONS_PER_TOPIC)
  const isFollowUp = askedQuestions % QUESTIONS_PER_TOPIC !== 0
  const topic = topics[topicIdx]

  const messages: ChatMessage[] = [
    {
      role: 'system',
      content: interviewTurnPrompt(kind, {
        topicLabel: topic.label,
        topicFocus: topic.focus,
        topicNumber: topicIdx + 1,
        topicTotal: topics.length,
        isFollowUp,
      }),
    },
    ...history.map((m) => ({ role: m.role, content: m.content }) as ChatMessage),
  ]
  const raw = await aiChat(messages, { maxTokens: 800 })
  return { message: raw.trim(), done: false }
}

function transcriptText(history: InterviewMessage[]): string {
  return history.map((m) => `${m.role === 'assistant' ? 'Interviewer' : 'Interviewee'}: ${m.content}`).join('\n\n')
}

export async function extractCompetency(history: InterviewMessage[]): Promise<CompetencyResult> {
  const raw = await aiStructured<RawCompetencySignals>(
    [
      { role: 'system', content: competencyExtractionSystemPrompt() },
      { role: 'user', content: `Interview transcript:\n\n${transcriptText(history)}` },
    ],
    competencyExtractionSchema,
    { maxTokens: 4096 },
  )
  return scoreCompetency(raw)
}

// Draft submittable project fields from a discovery transcript. Kept separate
// from complexity scoring so the org sees a clean project while staff get the
// internal PCS from the same conversation.
export async function extractProjectDraft(history: InterviewMessage[]): Promise<ProjectDraft> {
  const raw = await aiStructured<ProjectDraft>(
    [
      { role: 'system', content: projectDraftSystemPrompt() },
      { role: 'user', content: `Discovery transcript:\n\n${transcriptText(history)}` },
    ],
    projectDraftSchema,
    { maxTokens: 2048 },
  )
  return {
    title: raw.title?.trim() || 'Untitled project',
    summary: raw.summary?.trim() || '',
    problemStatement: raw.problemStatement?.trim() || '',
    description: raw.description?.trim() || '',
    skillsNeeded: (raw.skillsNeeded ?? []).map((s) => s.trim()).filter(Boolean).slice(0, 20),
  }
}

export async function extractComplexity(history: InterviewMessage[]): Promise<ComplexityResult> {
  const raw = await aiStructured<RawComplexitySignals>(
    [
      { role: 'system', content: complexityExtractionSystemPrompt() },
      { role: 'user', content: `Discovery transcript:\n\n${transcriptText(history)}` },
    ],
    complexityExtractionSchema,
    { maxTokens: 4096 },
  )
  return scoreComplexity(raw)
}
