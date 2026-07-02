// MatchCore prompts + extraction schemas. PURE strings/data built FROM the
// rubric config, so editing a rubric (config/*) automatically flows into what
// the interviewer asks about and what the extractor scores. Keeping prompts
// here — separate from the client (lib/ai) and the scoring (scoring.ts) — is the
// seam that lets us reword the conversation without touching either.

import type { JsonSchema } from '@/lib/ai/client'
import { activeCompetencyRubric, activeComplexityRubric, sectionMax } from './config'
import { PROJECT_TYPES } from './types'

type InterviewKind = 'competency' | 'complexity'

// ---------------------------------------------------------------------------
// Interviewer (conversational turn)
//
// Flow control is DETERMINISTIC and lives in code (agents.ts), not the model.
// A reasoning model can't reliably count follow-ups or track progress across
// dozens of turns — left to decide for itself it runs away and loses track of
// what it's doing. So each turn we tell the model exactly which topic it's on
// and whether this is the opening question or the single follow-up; the app
// advances topics and ends the interview after QUESTIONS_PER_TOPIC × topics
// questions. The model's only job is to phrase one good question.
// ---------------------------------------------------------------------------

// Questions asked per topic: one opening question + up to one follow-up.
// Total interview length = this × number of topics (5) = 10 questions.
export const QUESTIONS_PER_TOPIC = 2

// The ordered topics for a kind, drawn from the live rubric.
export function interviewTopics(kind: InterviewKind): { label: string; focus: string }[] {
  return kind === 'competency'
    ? activeCompetencyRubric().sections.map((s) => ({ label: s.label, focus: s.focus }))
    : activeComplexityRubric().briefs.map((b) => ({ label: b.title, focus: b.focus }))
}

function persona(kind: InterviewKind): string {
  return kind === 'competency'
    ? `You are ${activeCompetencyRubric().agentName}, a warm, encouraging interviewer building an apprentice's InnovateLocal profile. This is a friendly conversation, not an exam.`
    : `You are ${activeComplexityRubric().agentName}, a consultative business-discovery guide helping a business articulate a challenge so it can be scoped. Be professional and genuinely curious, and probe for specifics (numbers, systems, volumes, names).`
}

// System prompt for a single interview turn. The current topic + position are
// injected so the model stays oriented; it must not wander or wrap up itself.
export function interviewTurnPrompt(
  kind: InterviewKind,
  ctx: { topicLabel: string; topicFocus: string; topicNumber: number; topicTotal: number; isFollowUp: boolean },
): string {
  return [
    persona(kind),
    '',
    `This is a structured interview of ${ctx.topicTotal} topics asked in a fixed order that the SYSTEM controls — you do not decide when to change topic or when to finish.`,
    `You are on topic ${ctx.topicNumber} of ${ctx.topicTotal}: "${ctx.topicLabel}" — ${ctx.topicFocus}`,
    '',
    ctx.isFollowUp
      ? 'Ask ONE brief follow-up that digs into something specific the person just said about THIS topic. If they already covered it thoroughly, ask a light clarifying question instead of forcing more depth.'
      : 'Ask ONE clear opening question about THIS topic. A one-line transition from the previous answer is fine.',
    '',
    'Strict rules:',
    '- Ask about the CURRENT topic only. Never jump to other topics — the system advances them for you.',
    '- Do NOT summarize the conversation, do NOT thank-and-close, do NOT announce topic numbers.',
    '- Keep it to 1–2 warm, natural sentences. Output ONLY the question — no preamble, no labels, no lists.',
    '- Never mention scores, points, rubrics, or that anything is being evaluated.',
    `- If they say "I don't know" or "I haven't done that", accept it gracefully — never make them feel judged.`,
    '- If they ask a logistics/meta question (e.g. how many questions are left, how long this takes), answer it honestly in one short sentence, then ask your question for the current topic.',
  ].join('\n')
}

// Deterministic closing line (no model call) shown once the fixed number of
// questions has been asked. The UI then surfaces "Finish & score".
export const interviewClosing: Record<InterviewKind, string> = {
  competency:
    'That’s everything I need — thank you for walking me through all of it. Click “Finish & score” whenever you’re ready and I’ll build your profile.',
  complexity:
    'That covers everything I need to scope this well — thank you. Click “Finish & score” to generate the complexity assessment.',
}

export const interviewGreeting = {
  competency: `Hi! I'm ${activeCompetencyRubric().agentName}, and I'll help build your InnovateLocal profile so we can match you with a great project. This is a relaxed conversation — about 15–20 minutes — not a test. Ready to start with your AI and LLM background?`,
  complexity: `Welcome to InnovateLocal! I'm ${activeComplexityRubric().agentName}. I'll ask about your challenge, goals, data, stakeholders, and workflow so we can scope the right project and team. The more specific you can be, the better. Ready to dive into the challenge you're hoping to tackle?`,
} as const

// ---------------------------------------------------------------------------
// Extraction system prompts + schemas (structured turn)
// ---------------------------------------------------------------------------

export function competencyExtractionSystemPrompt(): string {
  const rubric = activeCompetencyRubric()
  const detail = rubric.sections
    .map((s) => {
      const crit = s.criteria
        .map((c) => `    - "${c.key}" (0–${c.max}): ${c.guidance}`)
        .join('\n')
      return `  Section "${s.key}" — ${s.label} (max ${sectionMax(s.criteria)}):\n${crit}`
    })
    .join('\n')
  return [
    'You are a meticulous, impartial assessor. Read the interview transcript and score the apprentice against the rubric below.',
    'Score ONLY on evidence actually present in the transcript. If a criterion was not discussed or the person clearly lacks it, give 0. Do not invent or inflate. Be conservative when uncertain.',
    'For every criterion, output an integer within its range and a one-sentence evidence note quoting or paraphrasing what justifies the points.',
    'Use EXACTLY the section and criterion keys shown (in quotes). Also give 2 strengths, 1–2 growth areas, and a 2–3 sentence plain-language summary.',
    '',
    'Rubric:',
    detail,
  ].join('\n')
}

export const competencyExtractionSchema: { name: string; schema: JsonSchema } = {
  name: 'competency_assessment',
  schema: {
    type: 'object',
    additionalProperties: false,
    required: ['scores', 'strengths', 'growthAreas', 'summary'],
    properties: {
      scores: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['section', 'criterion', 'points', 'evidence'],
          properties: {
            section: { type: 'string' },
            criterion: { type: 'string' },
            points: { type: 'integer' },
            evidence: { type: 'string' },
          },
        },
      },
      strengths: { type: 'array', items: { type: 'string' } },
      growthAreas: { type: 'array', items: { type: 'string' } },
      summary: { type: 'string' },
    },
  },
}

export function complexityExtractionSystemPrompt(): string {
  const rubric = activeComplexityRubric()
  const dims = rubric.dimensions.map((d) => `    - "${d.key}" (0–${d.max}): ${d.guidance}`).join('\n')
  const briefs = rubric.briefs.map((b) => `    - "${b.key}" — ${b.title}: ${b.focus}`).join('\n')
  return [
    'You are a meticulous project-scoping analyst. Read the business discovery transcript and produce a structured complexity assessment.',
    'Score each dimension on evidence in the transcript; when information is missing, assume the lower/simpler end and say so in the rationale. Do not overstate complexity.',
    'Also write a concise brief (3–6 sentences) for each discovery topic in the interviewee\'s own terms, and classify the project type.',
    `Valid projectType values: ${PROJECT_TYPES.join(', ')}. Set secondaryType to one of those or an empty string if there is no clear secondary type.`,
    'Use EXACTLY the dimension and brief keys shown in quotes.',
    '',
    'Complexity dimensions:',
    dims,
    '',
    'Discovery briefs to write:',
    briefs,
  ].join('\n')
}

// Project draft extraction: turn the discovery conversation into ready-to-submit
// project fields for the org (separate from the internal complexity scoring).
export function projectDraftSystemPrompt(): string {
  return [
    'You are drafting a project an organization will submit to InnovateLocal, based on the discovery conversation below.',
    'Produce clean, ready-to-submit fields that are FAITHFUL to what the business actually said. Do not invent specifics (names, numbers, systems, deadlines) they did not mention. Write plainly, in the business’s own voice.',
    'Fields:',
    '- title: a short, specific project title (roughly 3–8 words).',
    '- summary: 1–2 sentence plain-language description of what the project is.',
    '- problemStatement: the core problem or opportunity, in the business’s terms.',
    '- description: scope and approach — what would be built/automated and the intended outcome (2–5 sentences).',
    '- skillsNeeded: a short list of relevant skills/technologies (e.g. "Python", "API integration", "data cleaning"). Empty list if genuinely unclear.',
  ].join('\n')
}

export const projectDraftSchema: { name: string; schema: JsonSchema } = {
  name: 'project_draft',
  schema: {
    type: 'object',
    additionalProperties: false,
    required: ['title', 'summary', 'problemStatement', 'description', 'skillsNeeded'],
    properties: {
      title: { type: 'string' },
      summary: { type: 'string' },
      problemStatement: { type: 'string' },
      description: { type: 'string' },
      skillsNeeded: { type: 'array', items: { type: 'string' } },
    },
  },
}

export const complexityExtractionSchema: { name: string; schema: JsonSchema } = {
  name: 'complexity_assessment',
  schema: {
    type: 'object',
    additionalProperties: false,
    required: ['dimensionScores', 'briefs', 'projectType', 'secondaryType', 'classificationConfidence', 'summary'],
    properties: {
      dimensionScores: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['dimension', 'points', 'rationale'],
          properties: {
            dimension: { type: 'string' },
            points: { type: 'integer' },
            rationale: { type: 'string' },
          },
        },
      },
      briefs: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['key', 'title', 'content'],
          properties: {
            key: { type: 'string' },
            title: { type: 'string' },
            content: { type: 'string' },
          },
        },
      },
      projectType: { type: 'string' },
      secondaryType: { type: 'string' },
      classificationConfidence: { type: 'string', enum: ['high', 'medium', 'low'] },
      summary: { type: 'string' },
    },
  },
}
