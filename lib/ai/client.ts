// Provider-abstracted LLM access.
//
// One thin wrapper over an OpenAI-compatible Chat Completions endpoint so the
// rest of the app never imports a vendor SDK and the model/provider can be
// swapped by environment alone. This is the single seam between "our domain
// logic" and "whatever model is behind it" — keep all vendor specifics here.
//
// Config (all optional except the key):
//   OPEN_AI_API_KEY        required to make any call (aiConfigured() is false without it)
//   OPENAI_MODEL           default 'gpt-5-nano' (cheapest capable tier)
//   OPENAI_BASE_URL        default 'https://api.openai.com/v1' (point at any compatible host)
//   OPENAI_REASONING_EFFORT optional: 'minimal'|'low'|'medium'|'high' — sent only if set
//
// Server-only. Never import from client components.

export type ChatRole = 'system' | 'user' | 'assistant'
export type ChatMessage = { role: ChatRole; content: string }

// A JSON Schema object. We keep this loose (Record) on purpose so callers can
// author schemas as plain data without fighting the type system.
export type JsonSchema = Record<string, unknown>

const DEFAULT_MODEL = 'gpt-5-nano'
const DEFAULT_BASE_URL = 'https://api.openai.com/v1'

function apiKey(): string | null {
  return process.env.OPEN_AI_API_KEY?.trim() || null
}

/** Whether an API key is present. Callers should degrade gracefully when false. */
export function aiConfigured(): boolean {
  return apiKey() !== null
}

export function aiModel(): string {
  return process.env.OPENAI_MODEL?.trim() || DEFAULT_MODEL
}

function baseUrl(): string {
  return (process.env.OPENAI_BASE_URL?.trim() || DEFAULT_BASE_URL).replace(/\/$/, '')
}

export class AiError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message)
    this.name = 'AiError'
  }
}

type ChatOpts = {
  // Cap on generated tokens. Reasoning models bill hidden reasoning tokens
  // against this too, so keep it generous for structured extraction.
  maxTokens?: number
  responseFormat?: {
    type: 'json_schema'
    json_schema: { name: string; strict: true; schema: JsonSchema }
  }
  signal?: AbortSignal
}

// The one place that actually talks to the provider. Deliberately omits
// temperature/top_p: newer reasoning models reject non-default sampling params,
// and our tasks want determinism anyway.
async function callChat(messages: ChatMessage[], opts: ChatOpts = {}): Promise<string> {
  const key = apiKey()
  if (!key) throw new AiError('OPEN_AI_API_KEY is not set — the assessment/discovery agents are unavailable.')

  const body: Record<string, unknown> = {
    model: aiModel(),
    messages,
    max_completion_tokens: opts.maxTokens ?? 4096,
  }
  if (opts.responseFormat) body.response_format = opts.responseFormat
  const effort = process.env.OPENAI_REASONING_EFFORT?.trim()
  if (effort) body.reasoning_effort = effort

  let res: Response
  try {
    res = await fetch(`${baseUrl()}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify(body),
      signal: opts.signal,
    })
  } catch (e) {
    throw new AiError(`Could not reach the model provider: ${(e as Error).message}`)
  }

  if (!res.ok) {
    // Surface the provider's error message but never the request (which could
    // echo the key in a proxy). Keep it short for the UI.
    let detail = ''
    try {
      const j = (await res.json()) as { error?: { message?: string } }
      detail = j.error?.message ?? ''
    } catch {
      /* non-JSON error body */
    }
    throw new AiError(`Model request failed (${res.status})${detail ? `: ${detail}` : ''}`, res.status)
  }

  const json = (await res.json()) as {
    choices?: { message?: { content?: string }; finish_reason?: string }[]
  }
  const content = json.choices?.[0]?.message?.content
  if (!content) throw new AiError('Model returned an empty response.')
  return content
}

/** Free-form assistant turn (e.g. the next question in an interview). */
export function aiChat(messages: ChatMessage[], opts?: { maxTokens?: number; signal?: AbortSignal }): Promise<string> {
  return callChat(messages, opts)
}

/**
 * Structured extraction. Forces the model to emit JSON matching `schema` and
 * returns it parsed. The caller is responsible for validating the *content*
 * against domain rules (clamping scores, mapping keys) — this only guarantees
 * shape.
 */
export async function aiStructured<T>(
  messages: ChatMessage[],
  schema: { name: string; schema: JsonSchema },
  opts?: { maxTokens?: number; signal?: AbortSignal },
): Promise<T> {
  const raw = await callChat(messages, {
    ...opts,
    responseFormat: { type: 'json_schema', json_schema: { name: schema.name, strict: true, schema: schema.schema } },
  })
  try {
    return JSON.parse(raw) as T
  } catch {
    throw new AiError('Model returned malformed JSON for a structured request.')
  }
}
