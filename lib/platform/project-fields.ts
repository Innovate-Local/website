// Project link fields — the known links we render with a label on a project.
// Pure data, no server imports. The column is jsonb, so other keys still store.
export const PROJECT_LINK_FIELDS = [
  { key: 'repo', label: 'Repository' },
  { key: 'docs', label: 'Docs' },
  { key: 'demo', label: 'Demo' },
] as const

export type ProjectLinkKey = (typeof PROJECT_LINK_FIELDS)[number]['key']
