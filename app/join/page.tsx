import type { Metadata } from 'next'
import { SupportingPageShell } from '@/components/layout/SupportingPageShell'

export const metadata: Metadata = {
  title: 'Join a Hub // Innovate Local',
  description:
    'For apprentices and recent graduates. Work at a local AI hub in a university town. Applied work, not coursework.',
}

export default function JoinPage() {
  return (
    <SupportingPageShell
      inquiryType="join"
      stampLabel="Apprentice Intake"
      headline={
        <>
          Join a <br />
          Hub.
        </>
      }
      paragraphs={[
        'We are placing teams of recent graduates and students in university towns across the country. Applied work, not coursework. Real problems, solved in the community where you live.',
        'This is not an incubator. Not a boot camp. Not a training program. You will sit with local business owners, identify problems that matter, build AI tools that solve them, and train local teams to sustain them.',
      ]}
      listItems={[
        {
          number: '01',
          title: 'Applied Work',
          body: 'Every project solves a real problem for a real organization. You learn by doing.',
        },
        {
          number: '02',
          title: 'Local Impact',
          body: 'The results stay in the community you serve. Capability you build belongs to them forever.',
        },
        {
          number: '03',
          title: 'Grounded Mentorship',
          body: 'Work alongside experienced engineers, university faculty, and community leaders.',
        },
      ]}
      formTitle="Candidate Registry"
      formSubtitle="Tell us about yourself. We review submissions on a rolling basis."
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
          placeholder: 'you@university.edu',
          required: true,
          colSpan: 2,
        },
        {
          id: 'university',
          label: 'University',
          type: 'text',
          placeholder: 'Institution name',
          required: true,
        },
        {
          id: 'gradYear',
          label: 'Graduation Year',
          type: 'text',
          placeholder: 'YYYY',
          required: true,
        },
        {
          id: 'statement',
          label: 'Why You Want to Join',
          type: 'textarea',
          placeholder:
            'A few sentences about what draws you to this work and what you hope to build.',
          required: true,
          colSpan: 2,
          rows: 4,
        },
      ]}
      submitLabel="Submit Application"
    />
  )
}
