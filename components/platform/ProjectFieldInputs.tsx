'use client'

import { PROJECT_LINK_FIELDS } from '@/lib/platform/project-fields'
import { inputClass, labelClass } from './styles'

type OrgOption = { id: string; name: string }

// The shape of project fields these inputs read/prefill. Shared by the create
// and edit forms so the field set stays in one place.
export type ProjectFieldDefaults = {
  title?: string | null
  organizationId?: string | null
  summary?: string | null
  problemStatement?: string | null
  description?: string | null
  skillsNeeded?: string[] | null
  startDate?: string | null
  dueDate?: string | null
  estimatedCredits?: number | null
  links?: Record<string, string> | null
}

export function ProjectFieldInputs({
  organizations,
  project,
  disabled,
  hideOrg,
}: {
  organizations: OrgOption[]
  project?: ProjectFieldDefaults
  disabled?: boolean
  // When true, omit the organization selector (the org is fixed server-side,
  // e.g. an org admin creating a project for their own org).
  hideOrg?: boolean
}) {
  const links = (project?.links ?? {}) as Record<string, string>
  return (
    <>
      <div className="flex flex-col gap-2">
        <label htmlFor="title" className={labelClass}>
          Title
        </label>
        <input id="title" name="title" required defaultValue={project?.title ?? ''} placeholder="What's the project?" disabled={disabled} className={inputClass} />
      </div>

      <div className={`grid gap-4 ${hideOrg ? '' : 'sm:grid-cols-2'}`}>
        {!hideOrg && (
          <div className="flex flex-col gap-2">
            <label htmlFor="organizationId" className={labelClass}>
              Organization
            </label>
            <select id="organizationId" name="organizationId" defaultValue={project?.organizationId ?? ''} disabled={disabled} className={inputClass}>
              <option value="">Unassigned</option>
              {organizations.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
          </div>
        )}
        <div className="flex flex-col gap-2">
          <label htmlFor="estimatedCredits" className={labelClass}>
            Estimated credits
          </label>
          <input id="estimatedCredits" name="estimatedCredits" type="number" min={0} defaultValue={project?.estimatedCredits ?? ''} placeholder="e.g. 16" disabled={disabled} className={inputClass} />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="summary" className={labelClass}>
          Summary <span className="lowercase opacity-60">(one line)</span>
        </label>
        <input id="summary" name="summary" defaultValue={project?.summary ?? ''} placeholder="A one-line description of the engagement." disabled={disabled} className={inputClass} />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="problemStatement" className={labelClass}>
          Problem statement
        </label>
        <textarea id="problemStatement" name="problemStatement" rows={3} defaultValue={project?.problemStatement ?? ''} placeholder="The problem this project will solve." disabled={disabled} className={`${inputClass} resize-y`} />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="description" className={labelClass}>
          Scope & details
        </label>
        <textarea id="description" name="description" rows={4} defaultValue={project?.description ?? ''} placeholder="Scope, deliverables, context, anything the team should know." disabled={disabled} className={`${inputClass} resize-y`} />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="skillsNeeded" className={labelClass}>
          Skills needed <span className="lowercase opacity-60">(comma-separated)</span>
        </label>
        <input id="skillsNeeded" name="skillsNeeded" defaultValue={(project?.skillsNeeded ?? []).join(', ')} placeholder="Python, data viz, stakeholder interviews" disabled={disabled} className={inputClass} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <label htmlFor="startDate" className={labelClass}>
            Start date
          </label>
          <input id="startDate" name="startDate" type="date" defaultValue={project?.startDate ?? ''} disabled={disabled} className={inputClass} />
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor="dueDate" className={labelClass}>
            Target date
          </label>
          <input id="dueDate" name="dueDate" type="date" defaultValue={project?.dueDate ?? ''} disabled={disabled} className={inputClass} />
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <span className={labelClass}>Links</span>
        <div className="grid gap-4 sm:grid-cols-3">
          {PROJECT_LINK_FIELDS.map((l) => (
            <input key={l.key} name={`link_${l.key}`} defaultValue={links[l.key] ?? ''} placeholder={l.label} disabled={disabled} className={inputClass} />
          ))}
        </div>
      </div>
    </>
  )
}
