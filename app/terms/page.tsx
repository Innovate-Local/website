import type { Metadata } from 'next'
import { LegalPageLayout, H2, P, UL, LI } from '@/components/layout/LegalPageLayout'

export const metadata: Metadata = {
  title: 'Terms of Service // InnovateLocal',
  description:
    'The terms that govern your access to and use of innovatelocal.ai.',
}

export default function TermsPage() {
  return (
    <LegalPageLayout title="Terms of Service" effectiveDate="May 29, 2026">
      <P>{`These Terms of Service ("Terms") govern your access to and use of innovatelocal.ai and the related waitlist and beta program (the "Service"), operated by Radians per Second Squared, LLC ("Rad/s2," "we," "us," or "our"). By accessing or using the Service, you agree to these Terms. If you do not agree, do not use the Service.`}</P>

      <H2>{`1. The Service`}</H2>
      <P>{`InnovateLocal.ai is an AI education and community program that helps local businesses, nonprofits, students, and university communities apply artificial intelligence to real problems. The Service is currently offered as a waitlist and pre-release beta program and may change, be limited, or be discontinued at any time.`}</P>

      <H2>{`2. Eligibility`}</H2>
      <P>{`You must be at least 18 years old, or the age of majority where you live, to use the Service. Some features may require a valid institutional or organizational affiliation. You represent that the information you provide is accurate and that you are authorized to provide it.`}</P>

      <H2>{`3. Your account and information`}</H2>
      <P>{`You are responsible for the accuracy of the information you submit and for any activity that occurs under your sign-up. Notify us promptly of any unauthorized use. We may verify eligibility and may decline or revoke access at our discretion.`}</P>

      <H2>{`4. Acceptable use`}</H2>
      <P>{`You agree not to:`}</P>
      <UL>
        <LI>{`Use the Service for any unlawful, harmful, or fraudulent purpose.`}</LI>
        <LI>{`Submit content that infringes others' rights, is defamatory, or violates privacy.`}</LI>
        <LI>{`Upload sensitive personal data (for example, government identifiers, financial account numbers, or health information) into free-text fields.`}</LI>
        <LI>{`Attempt to gain unauthorized access to the Service, other accounts, or our systems, or to disrupt, probe, or circumvent security or rate limits.`}</LI>
        <LI>{`Use the Service to develop a competing product, or to scrape or harvest data at scale.`}</LI>
        <LI>{`Misuse AI features to generate unlawful, deceptive, or harmful content.`}</LI>
      </UL>

      <H2>{`5. Beta and pre-release nature`}</H2>
      <P>{`The Service is provided on a pre-release basis. It may contain errors, may be unavailable, and may change without notice. Features, content, and outputs are provided for evaluation and educational purposes and should not be relied upon as the sole basis for business, financial, legal, or other consequential decisions.`}</P>

      <H2>{`6. Artificial intelligence features`}</H2>
      <P>{`The Service uses artificial intelligence to assist with intake, documentation, and project matching.`}</P>
      <UL>
        <LI>{`AI-assisted outputs may be inaccurate or incomplete. You are responsible for reviewing and verifying any output before relying on it.`}</LI>
        <LI>{`AI-assisted outputs do not constitute professional, legal, financial, or technical advice.`}</LI>
        <LI>{`We govern our AI features under an ISO/IEC 42001-aligned AI management system, including human oversight of consequential outputs and configuration of providers, where supported, so that your content is not used to train their models. See our Privacy Policy for details.`}</LI>
      </UL>

      <H2>{`7. Your content`}</H2>
      <P>{`You retain ownership of the content and information you submit ("Your Content"). You grant Rad/s2 a non-exclusive, worldwide, royalty-free license to use, host, process, and display Your Content solely to operate, provide, secure, and improve the Service. You are responsible for having the rights necessary to submit Your Content.`}</P>
      <P>{`We handle Your Content in accordance with our Privacy Policy and our information security program, including data classification and confidentiality controls aligned with ISO/IEC 27001.`}</P>

      <H2>{`8. Our intellectual property`}</H2>
      <P>{`All content on this site is the property of Radians per Second Squared, LLC or its licensors and is protected by intellectual property laws. Unauthorized reproduction or redistribution is prohibited. The InnovateLocal.ai and Rad/s2 names and logos are our property. Except for the limited right to use the Service under these Terms, no rights are granted to you.`}</P>

      <H2>{`9. Confidentiality of project information`}</H2>
      <P>{`Where the Service facilitates project work between organizations and student teams, you agree to use any non-public information you receive through the Service only for the purpose of that project, and to protect it consistent with any confidentiality obligations communicated through the Service or a separate agreement.`}</P>

      <H2>{`10. Disclaimers`}</H2>
      <P>{`THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE," WITHOUT WARRANTIES OF ANY KIND, WHETHER EXPRESS, IMPLIED, OR STATUTORY, INCLUDING IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT. WE DO NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED, SECURE, OR ERROR-FREE, OR THAT AI-ASSISTED OUTPUTS WILL BE ACCURATE.`}</P>

      <H2>{`11. Limitation of liability`}</H2>
      <P>{`TO THE MAXIMUM EXTENT PERMITTED BY LAW, RAD/S2 AND ITS AFFILIATES WILL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS, DATA, OR GOODWILL, ARISING FROM OR RELATED TO YOUR USE OF THE SERVICE. OUR TOTAL LIABILITY FOR ANY CLAIM RELATED TO THE SERVICE WILL NOT EXCEED ONE HUNDRED U.S. DOLLARS (USD $100), GIVEN THAT THE SERVICE IS CURRENTLY PROVIDED FREE OF CHARGE.`}</P>

      <H2>{`12. Indemnification`}</H2>
      <P>{`You agree to indemnify and hold harmless Rad/s2 and its affiliates from any claims, damages, and expenses (including reasonable legal fees) arising from your misuse of the Service or your violation of these Terms or applicable law.`}</P>

      <H2>{`13. Termination`}</H2>
      <P>{`We may suspend or terminate your access to the Service at any time, with or without notice, including for violation of these Terms. You may stop using the Service at any time and may request deletion of your information as described in the Privacy Policy. Sections that by their nature should survive termination will survive.`}</P>

      <H2>{`14. Changes to these Terms`}</H2>
      <P>{`We may update these Terms from time to time. When we do, we will revise the effective date above and, for material changes, provide additional notice where appropriate. Your continued use of the Service after changes take effect constitutes acceptance.`}</P>

      <H2>{`15. Governing law`}</H2>
      <P>{`These Terms are governed by the laws of the Commonwealth of Pennsylvania, without regard to its conflict-of-laws rules. You agree that the exclusive venue for any dispute will be the state or federal courts located in Pennsylvania, unless otherwise required by applicable law.`}</P>

      <H2>{`16. Contact us`}</H2>
      <P>{`Questions about these Terms:`}</P>
      <P>
        {`Radians per Second Squared, LLC`}
        <br />
        {`State College, Pennsylvania`}
        <br />
        <a href="mailto:privacy@radsquared.ai" className="text-secondary underline hover:text-primary transition-colors">privacy@radsquared.ai</a>
      </P>
    </LegalPageLayout>
  )
}
