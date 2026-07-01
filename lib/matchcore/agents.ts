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
  INTERVIEW_DONE_TOKEN,
  competencyExtractionSchema,
  competencyExtractionSystemPrompt,
  competencyInterviewSystemPrompt,
  complexityExtractionSchema,
  complexityExtractionSystemPrompt,
  complexityInterviewSystemPrompt,
} from './prompts'
import { scoreCompetency, scoreComplexity, type RawCompetencySignals, type RawComplexitySignals } from './scoring'
import type { CompetencyResult, ComplexityResult, InterviewMessage } from './types'

export type { InterviewMessage } from './types'
export type InterviewKind = 'competency' | 'complexity'

function interviewSystemPrompt(kind: InterviewKind): string {
  return kind === 'competency' ? competencyInterviewSystemPrompt() : complexityInterviewSystemPrompt()
}

/**
 * Produce the interviewer's next reply given the conversation so far. Returns
 * the cleaned message plus whether the interview signalled completion.
 */
export async function nextInterviewTurn(
  kind: InterviewKind,
  history: InterviewMessage[],
): Promise<{ message: string; done: boolean }> {
  const messages: ChatMessage[] = [
    { role: 'system', content: interviewSystemPrompt(kind) },
    ...history.map((m) => ({ role: m.role, content: m.content }) as ChatMessage),
  ]
  const raw = await aiChat(messages, { maxTokens: 1200 })
  const done = raw.includes(INTERVIEW_DONE_TOKEN)
  const message = raw.replaceAll(INTERVIEW_DONE_TOKEN, '').trim()
  return { message, done }
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
