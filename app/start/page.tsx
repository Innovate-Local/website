import type { Metadata } from 'next'
import { SupportingPageShell } from '@/components/layout/SupportingPageShell'

export const metadata: Metadata = {
  title: 'Start a Hub // Innovate Local',
  description:
    'For universities and community leaders. Host a local AI hub in your town. We provide structure, tools, and mission.',
}

export default function StartPage() {
  return (
    <SupportingPageShell
      inquiryType="start"
      stampLabel="Hub Establishment"
      headline={
        <>
          Start a <br />
          Hub.
        </>
      }
      paragraphs={[
        'Every hub lives in a university town. Universities provide the talent and the institutional foundation. Local organizations provide the problems worth solving. Innovatelocal provides the structure that connects them.',
        'If you work at a university, in local government, or in a community organization that can anchor a hub, we want to hear from you. No cold starts. No parachuting in. Built on the relationships you already have.',
      ]}
      listItems={[
        {
          number: '01',
          title: 'Institutional Fit',
          body: 'Hubs work best where universities are already active in community partnerships.',
        },
        {
          number: '02',
          title: 'Local Anchoring',
          body: 'A host institution commits space, faculty mentorship, and a pipeline of apprentices.',
        },
        {
          number: '03',
          title: 'Mission Alignment',
          body: 'Non-profit by design. Permanent by design. Built to stay.',
        },
      ]}
      formTitle="Host Institution Registry"
      formSubtitle="Tell us about your community. We reply within two weeks."
      formFields={[
        {
          id: 'fullName',
          label: 'Full Name',
          type: 'text',
          placeholder: 'Your name',
          required: true,
          colSpan: 2,
        },
        {
          id: 'email',
          label: 'Email',
          type: 'email',
          placeholder: 'you@institution.edu',
          required: true,
          colSpan: 2,
        },
        {
          id: 'organization',
          label: 'Organization',
          type: 'text',
          placeholder: 'University or community organization',
          required: true,
        },
        {
          id: 'role',
          label: 'Your Role',
          type: 'text',
          placeholder: 'Title or affiliation',
          required: true,
        },
        {
          id: 'city',
          label: 'City & State',
          type: 'text',
          placeholder: 'Where the hub would live',
          required: true,
          colSpan: 2,
        },
        {
          id: 'statement',
          label: 'What You Want to Build',
          type: 'textarea',
          placeholder:
            'Tell us about your community, what problems are pressing, and what a hub could do there.',
          required: true,
          colSpan: 2,
          rows: 4,
        },
      ]}
      submitLabel="Submit Inquiry"
    />
  )
}
