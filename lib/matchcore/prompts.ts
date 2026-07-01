// MatchCore prompts + extraction schemas. PURE strings/data built FROM the
// rubric config, so editing a rubric (config/*) automatically flows into what
// the interviewer asks about and what the extractor scores. Keeping prompts
// here — separate from the client (lib/ai) and the scoring (scoring.ts) — is the
// seam that lets us reword the conversation without touching either.

import type { JsonSchema } from '@/lib/ai/client'
import { activeCompetencyRubric, activeComplexityRubric, sectionMax } from './config'
import { PROJECT_TYPES } from './types'

// Emitted by an interviewer on its own line once every topic is covered and the
// interviewee has nothing to add. The UI watches for it to offer "Finish".
export const INTERVIEW_DONE_TOKEN = '[[INTERVIEW_COMPLETE]]'

// ---------------------------------------------------------------------------
// Interviewer system prompts (conversational turn)
// ---------------------------------------------------------------------------

function sharedInterviewRules(agentName: string, topics: string): string {
  return [
    `You are ${agentName}, a warm, encouraging InnovateLocal interview assistant. This is a friendly profile-building conversation, NOT an exam.`,
    '',
    'Rules:',
    '- Work through the topics in order. Give a one-line transition between topics.',
    '- Ask ONE focused question at a time. Ask at most two brief follow-up probes per topic, then move on.',
    '- Never mention scores, points, rubrics, or that any evaluation is happening. Scoring is silent and happens later.',
    `- If they say "I don't know" or "I haven't done that", accept it gracefully and move on — never make them feel judged.`,
    '- Keep each message short and natural. No headers, no bullet lists in your replies.',
    `- When every topic has been covered and they have nothing to add, thank them warmly and then output ${INTERVIEW_DONE_TOKEN} on its very last line by itself.`,
    '',
    'Topics to cover, in order:',
    topics,
  ].join('\n')
}

export function competencyInterviewSystemPrompt(): string {
  const rubric = activeCompetencyRubric()
  const topics = rubric.sections
    .map((s, i) => `${i + 1}. ${s.label} — ${s.focus}`)
    .join('\n')
  return sharedInterviewRules(rubric.agentName, topics)
}

export function complexityInterviewSystemPrompt(): string {
  const rubric = activeComplexityRubric()
  const topics = rubric.briefs.map((b, i) => `${i + 1}. ${b.title} — ${b.focus}`).join('\n')
  const base = sharedInterviewRules(rubric.agentName, topics)
  return base.replace(
    'This is a friendly profile-building conversation, NOT an exam.',
    'You are a consultative business-discovery guide helping a business articulate a challenge so it can be scoped. Be professional and genuinely curious. Let them speak freely and probe for specifics (numbers, systems, names, volumes).',
  )
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
