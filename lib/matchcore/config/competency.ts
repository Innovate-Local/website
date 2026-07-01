// Competency rubric (Phase A → CRR). PURE DATA. This is the single source of
// truth for how an apprentice's readiness is scored and weighted for matching.
//
// To change how apprentices are scored, edit THIS file — the criteria, their
// point ceilings, the section weights, or the tier thresholds — and bump
// `version`. Every stored assessment records the version that produced it, so
// old scores stay interpretable after a rubric change. No migration needed:
// scores live in JSONB.
//
// Invariants the scoring layer relies on (see scoring.ts):
//   • each section's criteria `max` values sum to the section ceiling
//   • the section ceilings sum to 100 (CRR max)
//   • weightByType values sum to 1.0 within each project type

import type { CompetencyRubric } from '../types'

export const COMPETENCY_RUBRIC: CompetencyRubric = {
  version: 'crr-2026-07',
  agentName: 'MatchCore Compass',
  crrTiers: [
    { key: 'expert', label: 'Expert', min: 80 },
    { key: 'proficient', label: 'Proficient', min: 60 },
    { key: 'developing', label: 'Developing', min: 40 },
    { key: 'beginner', label: 'Beginner', min: 0 },
  ],
  sectionTiers: [
    { key: 'expert', label: 'Expert', min: 15 },
    { key: 'proficient', label: 'Proficient', min: 10 },
    { key: 'developing', label: 'Developing', min: 5 },
    { key: 'beginner', label: 'Beginner', min: 0 },
  ],
  sections: [
    {
      key: '1A',
      label: 'AI & LLM Foundations',
      focus: 'Structured AI learning, agents built, and grasp of LLM fundamentals.',
      weightByType: { technical: 0.1, data: 0.1, process_automation: 0.3, marketing_content: 0.2 },
      criteria: [
        {
          key: 'structured_learning',
          label: 'Structured AI learning',
          max: 6,
          guidance:
            'Breadth of completed AI/LLM courses or certifications (e.g. Anthropic Academy or equivalent). 0 = none; ~2 = a few; ~4 = substantial; 6 = a complete learning path, ideally with strong assessment results.',
        },
        {
          key: 'agent_experience',
          label: 'Agents built & deployed',
          max: 8,
          guidance:
            'Number and depth of AI agents the student has actually built/deployed. 0 = none; 2 = 1–2 simple; 4 = several; 6 = multi-tool with error handling; 8 = full agentic systems with subagents, memory, and external integrations.',
        },
        {
          key: 'llm_fundamentals',
          label: 'LLM fundamentals',
          max: 6,
          guidance:
            'Command of prompting, context management, tool use, and evaluation. 0 = none; 3 = working understanding; 6 = can reason about trade-offs and articulate a real technical challenge they solved.',
        },
      ],
    },
    {
      key: '1B',
      label: 'AI Development & Tooling',
      focus: 'Subagents, reusable skills, MCP integrations, and LLM-in-pipeline work.',
      weightByType: { technical: 0.35, data: 0.25, process_automation: 0.3, marketing_content: 0.1 },
      criteria: [
        {
          key: 'subagents',
          label: 'Subagent / multi-agent design',
          max: 6,
          guidance:
            '0 = none; 2 = one simple subagent; 4 = several with defined tool use; 6 = a full multi-subagent system with orchestration and robust state/handoff handling.',
        },
        {
          key: 'skills_reuse',
          label: 'Reusable skills / components',
          max: 4,
          guidance: '0 = none; 1 = 1–2 private; 2 = several, at least one shared; 4 = published components used by others.',
        },
        {
          key: 'mcp_integrations',
          label: 'MCP / connector integrations',
          max: 4,
          guidance: '0 = none; 1 = consumed an existing one; 2 = built 1–2 custom; 4 = built 3+ including complex/bidirectional.',
        },
        {
          key: 'pipelines',
          label: 'LLM in CI/CD or pipelines',
          max: 3,
          guidance: '0 = none; 1 = manual review step; 2 = automated step in CI/CD; 3 = full LLM-powered pipeline with guardrails.',
        },
        {
          key: 'flagship',
          label: 'Flagship work quality',
          max: 3,
          guidance: '0 = scripting/prompting only; 1 = a functional real-world tool; 3 = production-quality system with logging, error handling, scalability.',
        },
      ],
    },
    {
      key: '1C',
      label: 'Version Control & Collaboration Engineering',
      focus: 'Git/GitHub workflow, PR and review discipline, CI, and issue tracking.',
      weightByType: { technical: 0.25, data: 0.2, process_automation: 0.1, marketing_content: 0.1 },
      criteria: [
        {
          key: 'branch_strategy',
          label: 'Branching strategy',
          max: 5,
          guidance: '0 = pushes to main; 1 = inconsistent feature branches; 2 = consistent, well-named; 4 = Gitflow/trunk with rationale; 5 = explains trade-offs and adapts per project.',
        },
        {
          key: 'pr_quality',
          label: 'Pull-request quality',
          max: 4,
          guidance: '0 = none/minimal; 1 = brief summary; 2 = summary + motivation + how-to-test; 3 = comprehensive with links/evidence/reviewer guidance; +1 if uses PR templates/checklists.',
        },
        {
          key: 'code_review',
          label: 'Code-review participation',
          max: 3,
          guidance: '0 = rarely; 1 = occasional, functionality-only; 2 = consistent (logic, style, tests, security); 3 = champions review culture, mentors.',
        },
        {
          key: 'ci_workflows',
          label: 'CI workflows (GitHub Actions)',
          max: 5,
          guidance: '0 = none; 1 = modified an existing one; 2 = authored simple (lint/test); 4 = complex multi-job (matrix, caching, secrets, deploy); 5 = also debugs flaky pipelines.',
        },
        {
          key: 'issue_tracking',
          label: 'Issue / project tracking',
          max: 3,
          guidance: '0 = none; 1 = issues without hygiene; 2 = labels/milestones/assignments; 3 = Projects with custom views, automation, sprint planning.',
        },
      ],
    },
    {
      key: '1D',
      label: 'Leadership & Communication',
      focus: 'Leading teams, resolving conflict, stakeholder communication, PM discipline.',
      weightByType: { technical: 0.1, data: 0.1, process_automation: 0.1, marketing_content: 0.3 },
      criteria: [
        {
          key: 'team_leadership',
          label: 'Team leadership',
          max: 6,
          guidance: '0 = none; 2 = led 2–3 on low-stakes; 4 = led 4–6 to a deliverable; 5 = led 7+ with accountability and documented outcomes; +1 for genuine self-reflection.',
        },
        {
          key: 'conflict_resolution',
          label: 'Conflict resolution',
          max: 3,
          guidance: '0 = avoids/none; 1 = relied on others; 2 = directly addressed it; 3 = structured approach (listening, private-first, follow-up).',
        },
        {
          key: 'stakeholder_comms',
          label: 'Stakeholder communication',
          max: 4,
          guidance: '0 = none; 1 = once, low-stakes; 2 = regular updates; 3 = to external clients/senior leaders with impact; +1 for clearly tailoring to non-technical audiences.',
        },
        {
          key: 'pm_tools',
          label: 'PM tool proficiency',
          max: 3,
          guidance: '0 = none; 1 = basic to-do use; 2 = structured workflows in 1–2 tools; 3 = power user across tools, sets up workspaces for others.',
        },
        {
          key: 'accountability',
          label: 'Accountability & follow-through',
          max: 4,
          guidance: '0 = no system; 1 = basic lists/reminders; 2 = structured personal system; 3–4 = concrete story of managing competing deadlines well.',
        },
      ],
    },
    {
      key: '1E',
      label: 'Domain & Applied Experience',
      focus: 'Industry exposure, data skills, prior AI/automation projects, specialization.',
      weightByType: { technical: 0.2, data: 0.35, process_automation: 0.2, marketing_content: 0.3 },
      criteria: [
        {
          key: 'industry_experience',
          label: 'Industry experience',
          max: 5,
          guidance: '0 = none; 2 = one sector, surface-level; 3 = meaningful in 1–2 sectors; 5 = deep in 2+ with applied knowledge.',
        },
        {
          key: 'data_skills',
          label: 'Data skills (SQL / Python)',
          max: 6,
          guidance: '0 = none; 1 = spreadsheets only; 3 = comfortable SQL or Python for cleaning/analysis; 5 = advanced SQL + Python data stack; +1 for API data ingestion.',
        },
        {
          key: 'prior_projects',
          label: 'Prior AI / automation projects',
          max: 6,
          guidance: '0 = none; 2 = one basic; 4 = 1–2 with real-world outcome; 6 = 3+ with clear business/user impact; count business-articulated impact generously.',
        },
        {
          key: 'specialization',
          label: 'Domain specialization',
          max: 3,
          guidance: '0 = none; 1 = general familiarity; 2 = working proficiency (has shipped in it); 3 = deep expertise with portfolio evidence.',
        },
      ],
    },
  ],
}
