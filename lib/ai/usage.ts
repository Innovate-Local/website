// AI usage recording. Server-only. The AI client calls recordAiUsage after each
// LLM request; it computes cost from pricing and appends an ai_usage_events row.
// Recording must NEVER break the feature — all failures are swallowed.
import { getDb } from '@/lib/db'
import { aiUsageEvents } from '@/lib/db/schema'
import { costMicros } from './pricing'

// Attribution + labelling for a single call. `feature` is required; the refs are
// set when the caller knows them (threaded down from the server action).
export type AiCallMeta = {
  feature: string
  userId?: string | null
  orgId?: string | null
  projectId?: string | null
  requestId?: string | null
}

// The shape of OpenAI's `usage` object (the bits we use).
export type ApiUsage = {
  prompt_tokens?: number
  completion_tokens?: number
  total_tokens?: number
  completion_tokens_details?: { reasoning_tokens?: number }
}

export async function recordAiUsage(model: string, usage: ApiUsage | undefined, meta: AiCallMeta): Promise<void> {
  try {
    const prompt = usage?.prompt_tokens ?? 0
    const completion = usage?.completion_tokens ?? 0
    const reasoning = usage?.completion_tokens_details?.reasoning_tokens ?? 0
    const total = usage?.total_tokens ?? prompt + completion
    await getDb()
      .insert(aiUsageEvents)
      .values({
        feature: meta.feature,
        model,
        promptTokens: prompt,
        completionTokens: completion,
        reasoningTokens: reasoning,
        totalTokens: total,
        costMicros: costMicros(model, prompt, completion),
        userId: meta.userId ?? null,
        orgId: meta.orgId ?? null,
        projectId: meta.projectId ?? null,
        requestId: meta.requestId ?? null,
      })
  } catch {
    // Usage logging is best-effort; never let it fail the actual request.
  }
}
