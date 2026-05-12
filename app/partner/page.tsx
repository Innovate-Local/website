import type { Metadata } from 'next'
import { SupportingPageShell } from '@/components/layout/SupportingPageShell'

export const metadata: Metadata = {
  title: 'Partner With Us // Innovate Local',
  description:
    'For local businesses, non-profits, and sponsors. Engage a hub or fund one. Some of the tools come from the broader ecosystem. All of the benefit stays local.',
}

export default function PartnerPage() {
  return (
    <SupportingPageShell
      inquiryType="partner"
      stampLabel="Partnership Intake"
      headline={
        <>
          Partner <br />
          With Us.
        </>
      }
      paragraphs={[
        'If you run a local business, lead a non-profit, or fund civic work, a hub can help. Teams of recent graduates work directly with your organization to identify what AI can do, build tools that fit, and train your people to sustain them.',
        'Some of the tools come from the broader ecosystem. All of the benefit stays local. No investors expecting returns. No pressure to prioritize high-margin clients over the organizations that need help most.',
      ]}
      listItems={[
        {
          number: '01',
          title: 'Local Business Engagement',
          body: 'A hub team sits with you, identifies high-impact problems, and builds AI tools to solve them.',
        },
        {
          number: '02',
          title: 'Non-Profit Support',
          body: 'Automate donor outreach. Manage events. Focus your team on the work that matters.',
        },
        {
          number: '03',
          title: 'Sponsorship',
          body: 'Fund a hub in a community you care about. Permanent infrastructure, not a pilot program.',
        },
      ]}
      formTitle="Partner Registry"
      formSubtitle="Tell us about your organization. We reply within two weeks."
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
          placeholder: 'you@organization.org',
          required: true,
          colSpan: 2,
        },
        {
          id: 'organization',
          label: 'Organization',
          type: 'text',
          placeholder: 'Business, non-profit, or foundation name',
          required: true,
        },
        {
          id: 'relationship',
          label: 'Relationship',
          type: 'text',
          placeholder: 'Business / Non-profit / Sponsor',
          required: true,
        },
        {
          id: 'statement',
          label: 'How We Can Help',
          type: 'textarea',
          placeholder:
            'Tell us about your organization, what you need, and where you are located.',
          required: true,
          colSpan: 2,
          rows: 4,
        },
      ]}
      submitLabel="Submit Inquiry"
    />
  )
}
