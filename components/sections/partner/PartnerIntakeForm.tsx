'use client'

// Bridges the partner page's shared tier selection (set by the tier cards'
// "Select" buttons) into the intake form's "Tier Interest" radio group.
import { ContactForm } from '@/components/ui/ContactForm'
import type { SupportingFormField } from '@/components/layout/SupportingPageShell'
import { useTierSelection } from './TierSelection'

export function PartnerIntakeForm({ fields }: { fields: SupportingFormField[] }) {
  const { selection } = useTierSelection()
  return (
    <ContactForm
      type="partner"
      fields={fields}
      submitLabel="Submit Inquiry"
      radioPreset={
        selection ? { field: 'tier', value: selection.value, seq: selection.seq } : null
      }
    />
  )
}
