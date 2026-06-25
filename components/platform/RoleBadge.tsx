import type { UserRole } from '@/lib/db/schema'
import { ROLE_LABEL } from '@/lib/platform/roles'

// Small role chip, styled like the marketing site's stamp labels.
export function RoleBadge({ role }: { role: UserRole }) {
  return (
    <span className="bg-tertiary-container px-3 py-1 inline-block">
      <span className="font-label text-[10px] text-on-tertiary-container uppercase tracking-widest font-bold">
        {ROLE_LABEL[role]}
      </span>
    </span>
  )
}
