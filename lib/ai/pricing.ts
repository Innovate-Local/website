// Model pricing → cost. PURE DATA. Rates are USD per 1,000,000 tokens.
//
// ⚠ PLACEHOLDER rates — set these to your ACTUAL OpenAI pricing (like the
// placeholder dollar amounts in billing-plans.ts). Cost is computed as integer
// micro-USD to avoid floating-point drift in the ledger.
//
// Note: the API's `completion_tokens` already INCLUDES reasoning tokens, so
// output cost is billed on completion_tokens (reasoning is stored separately
// only for insight).

export type ModelPricing = { inputPerM: number; outputPerM: number }

const PRICING: Record<string, ModelPricing> = {
  'gpt-5-nano': { inputPerM: 0.05, outputPerM: 0.4 },
  'gpt-5-mini': { inputPerM: 0.25, outputPerM: 2.0 },
  'gpt-5': { inputPerM: 1.25, outputPerM: 10.0 },
}

const DEFAULT_PRICING: ModelPricing = { inputPerM: 0.05, outputPerM: 0.4 }

export function pricingFor(model: string): ModelPricing {
  if (PRICING[model]) return PRICING[model]
  // Tolerate dated snapshots like "gpt-5-nano-2026-01-01".
  const base = model.replace(/-\d{4}.*$/, '')
  return PRICING[base] ?? DEFAULT_PRICING
}

// Cost of one call in micro-USD (1e-6 USD), rounded to an integer.
// cost_usd = prompt/1e6*inputPerM + completion/1e6*outputPerM
//   ⇒ cost_micros = prompt*inputPerM + completion*outputPerM
export function costMicros(model: string, promptTokens: number, completionTokens: number): number {
  const p = pricingFor(model)
  return Math.round(promptTokens * p.inputPerM + completionTokens * p.outputPerM)
}

// Display helper: micro-USD → "$0.0123".
export function formatMicros(micros: number): string {
  const usd = micros / 1_000_000
  const digits = usd !== 0 && Math.abs(usd) < 1 ? 4 : 2
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: digits, maximumFractionDigits: digits }).format(usd)
}
