// Complexity rubric (Phase B → PCS). PURE DATA. Drives the Scout discovery
// interview and how a project's Project Complexity Score is computed.
//
// To change discovery, edit the `briefs` (interview topics) and `dimensions`
// (scored 0–max each), or the tier thresholds, and bump `version`. Dimension
// `max` values sum to the PCS ceiling (100).

import type { ComplexityRubric } from '../types'

export const COMPLEXITY_RUBRIC: ComplexityRubric = {
  version: 'pcs-2026-07',
  agentName: 'MatchCore Scout',
  briefs: [
    { key: '2A', title: 'Challenge / Opportunity', focus: 'The core problem, current workarounds, prior attempts, and out-of-scope boundaries.' },
    { key: '2B', title: 'Desired Outcomes & Metrics', focus: 'The #1 result, quantifiable success metrics with baselines, definition of done, and timeline pressure.' },
    { key: '2C', title: 'Data, Tools & Resources', focus: 'Existing data assets and quality, software stack and APIs, access/compliance limits, internal technical support, and budget.' },
    { key: '2D', title: 'Stakeholder Map', focus: 'Primary user, decision maker, wider stakeholders and resistors, point of contact and their availability, communication preferences.' },
    { key: '2E', title: 'Workflow (As-Is → To-Be)', focus: 'Current step-by-step workflow and friction, volume/frequency, the target future workflow, integration points, and edge cases.' },
  ],
  dimensions: [
    {
      key: 'data',
      label: 'Data Complexity',
      max: 20,
      guidance: 'From brief 2C. 0–6 = clean, centralized, well-documented; 7–14 = some fragmentation, needs cleaning/consolidation; 15–20 = siloed, messy, restricted, or missing data needing real engineering.',
    },
    {
      key: 'stakeholders',
      label: 'Stakeholder Count & Alignment',
      max: 20,
      guidance: 'From brief 2D. 0–6 = 1–2 aligned, accessible; 7–14 = 3–5 mostly aligned; 15–20 = 6+ or misalignment / political complexity / external approval chains.',
    },
    {
      key: 'integrations',
      label: 'Integration Requirements',
      max: 20,
      guidance: 'From brief 2E. 0–6 = 0–1 simple read/write; 7–14 = 2–3 manageable APIs; 15–20 = 4+ integrations, legacy systems, bidirectional / real-time sync.',
    },
    {
      key: 'timeline',
      label: 'Timeline Pressure',
      max: 20,
      guidance: 'From brief 2B. 0–6 = no hard deadline; 7–14 = soft deadline within 2–3 months; 15–20 = hard deadline within ~4 weeks tied to a launch/funding/seasonal event.',
    },
    {
      key: 'novelty',
      label: 'Novelty of AI Application',
      max: 20,
      guidance: 'From brief 2E. 0–6 = well-trodden (chatbot, FAQ, basic export); 7–14 = moderately novel, customizing proven patterns; 15–20 = genuinely novel, no clear template, needs experimentation.',
    },
  ],
  complexityTiers: [
    { key: 'complex', label: 'Complex', min: 71 },
    { key: 'moderate', label: 'Moderate', min: 41 },
    { key: 'simple', label: 'Simple', min: 0 },
  ],
}
