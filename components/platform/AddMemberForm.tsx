'use client'

import { useRef, useState, useTransition } from 'react'
import { addOrgMember } from '@/app/dashboard/organizations/actions'
import { inputClass, labelClass, primaryButtonClass } from './styles'

// Staff form to add/invite a member to an organization by email.
export function AddMemberForm({ orgId }: { orgId: string }) {
  const formRef = useRef<HTMLFormElement>(null)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<string | null>(null)

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    setError(null)
    setDone(null)
    startTransition(async () => {
      const result = await addOrgMember(orgId, formData)
      if (result.ok) {
        formRef.current?.reset()
        setDone(result.invited ? 'Invite email sent' : 'Existing member added')
      } else {
        setError(result.error)
      }
    })
  }

  return (
    <form ref={formRef} onSubmit={onSubmit} className="flex flex-col gap-4 max-w-xl">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <div className="flex flex-col gap-2 flex-grow">
          <label htmlFor="member-email" className={labelClass}>Add member by email</label>
          <input
            id="member-email"
            name="email"
            type="email"
            required
            placeholder="person@organization.org"
            disabled={isPending}
            onChange={() => setDone(null)}
            className={inputClass}
          />
        </div>
        <select name="roleInOrg" defaultValue="member" disabled={isPending} className={`${inputClass} sm:w-40`}>
          <option value="member">Member</option>
          <option value="admin">Admin</option>
        </select>
        <button type="submit" disabled={isPending} className={primaryButtonClass}>
          {isPending ? 'Adding...' : 'Add'}
        </button>
      </div>

      {error && (
        <div className="bg-error-container text-on-error-container p-4">
          <p className="font-label text-xs uppercase tracking-widest">{error}</p>
        </div>
      )}
      {done && (
        <span className="font-label text-xs uppercase tracking-widest text-primary">{done}</span>
      )}
    </form>
  )
}
