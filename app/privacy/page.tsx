import type { Metadata } from 'next'
import { LegalPageLayout, H2, P, Sub, UL, LI, B } from '@/components/layout/LegalPageLayout'

export const metadata: Metadata = {
  title: 'Privacy Policy // Innovate Local',
  description:
    'How InnovateLocal.ai collects, uses, protects, and shares information.',
}

export default function PrivacyPage() {
  return (
    <LegalPageLayout title="Privacy Policy" effectiveDate="May 29, 2026">
      <P>{`This Privacy Policy explains how InnovateLocal.ai ("InnovateLocal," "we," "us," or "our") collects, uses, protects, and shares information when you visit innovatelocal.ai or sign up for our waitlist or beta program (the "Service").`}</P>
      <P>{`InnovateLocal.ai is operated by Radians per Second Squared, LLC, a limited liability company organized under the laws of the Commonwealth of Pennsylvania ("Rad/s2"). We operate under an information security management system aligned with ISO/IEC 27001 and an AI management system aligned with ISO/IEC 42001.`}</P>

      <H2>{`1. Information we collect`}</H2>
      <P>{`We collect only what we need to run the waitlist and beta program, and only what you voluntarily provide.`}</P>
      <Sub>{`Information you provide:`}</Sub>
      <UL>
        <LI><B>{`Waitlist sign-up.`}</B>{` Your email address, which is typically an institutional (for example, .edu) address.`}</LI>
        <LI><B>{`Beta qualification survey (optional).`}</B>{` Your name, institution or organization, your role, your area of interest, the size of your program or business, and any other details you choose to share in free-text fields.`}</LI>
        <LI><B>{`Communications.`}</B>{` Any information you include when you contact us.`}</LI>
      </UL>
      <P>{`We do not use tracking cookies, analytics platforms, or third-party data brokers (see Section 9).`}</P>
      <P><B>{`Please do not submit sensitive information`}</B>{` (for example, government identifiers, financial account numbers, or health information) in free-text fields. If you do, we treat it under the protections described in Section 4.`}</P>

      <H2>{`2. How we use information`}</H2>
      <P>{`We use the information we collect to:`}</P>
      <UL>
        <LI>{`Operate and manage the waitlist and beta program, including verifying eligibility.`}</LI>
        <LI>{`Match participating businesses, nonprofits, and student teams to projects.`}</LI>
        <LI>{`Communicate with you about the Service, your sign-up, and program updates.`}</LI>
        <LI>{`Improve and secure the Service.`}</LI>
        <LI>{`Comply with our legal and contractual obligations.`}</LI>
      </UL>
      <P>{`We do not sell your personal information.`}</P>

      <H2>{`3. Artificial intelligence and your data`}</H2>
      <P>{`InnovateLocal.ai uses artificial intelligence to support intake, documentation, and project matching. We govern these features under our ISO/IEC 42001-aligned AI management system.`}</P>
      <UL>
        <LI><B>{`No training on your content by third-party providers.`}</B>{` Where a provider supports it, we configure its service so that your inputs and outputs are not used to train that provider's models. Where such a control is not available, we do not send your confidential information to that provider.`}</LI>
        <LI><B>{`Human oversight.`}</B>{` AI-assisted outputs are reviewed by people before they are relied upon for consequential decisions.`}</LI>
        <LI><B>{`Retention minimization with providers.`}</B>{` Where a provider offers retention controls, we select the shortest available retention period.`}</LI>
        <LI><B>{`Disclosure of change.`}</B>{` If we materially change the AI providers we use, we will update this Policy.`}</LI>
      </UL>

      <H2>{`4. How we protect information`}</H2>
      <P>{`We protect information under our ISO/IEC 27001-aligned information security program. Measures include:`}</P>
      <UL>
        <LI><B>{`Data classification.`}</B>{` We classify information under a four-level scheme (Public, Internal, Confidential, Secret). Personally identifiable information is classified as Confidential or higher and handled accordingly.`}</LI>
        <LI><B>{`Access control.`}</B>{` Access to personal information is limited to authorized personnel on a least-privilege basis, protected by single sign-on and multi-factor authentication.`}</LI>
        <LI><B>{`Encryption.`}</B>{` We protect information in transit and at rest using industry-standard encryption.`}</LI>
        <LI><B>{`Administrative, technical, and physical safeguards.`}</B>{` We assess foreseeable risks, train our people, test our controls, and securely dispose of information at the end of its retention period.`}</LI>
        <LI><B>{`Incident response.`}</B>{` We maintain a security incident response team and a documented response process. If a security incident affects your personal information, we will notify affected users and any required parties without undue delay and as required by applicable law.`}</LI>
      </UL>
      <P>{`No method of transmission or storage is completely secure, and we cannot guarantee absolute security.`}</P>

      <H2>{`5. How we share information`}</H2>
      <P>{`We share personal information only as described here:`}</P>
      <UL>
        <LI><B>{`Service providers.`}</B>{` We use vetted third parties to host and operate the Service, such as infrastructure, database hosting, and AI service providers. Each provider is subject to our supplier due-diligence process and is bound by contractual confidentiality obligations before any confidential information is shared.`}</LI>
        <LI><B>{`Within Rad/s2 and its venture studio,`}</B>{` as needed to operate the program and match projects.`}</LI>
        <LI><B>{`Legal and safety.`}</B>{` When required by law, regulation, or legal process, or to protect the rights, property, or safety of users, the public, or Rad/s2.`}</LI>
        <LI><B>{`Business transfers.`}</B>{` In connection with a merger, acquisition, or sale of assets, subject to this Policy.`}</LI>
      </UL>
      <P>{`We do not sell or rent your information to third parties, and we do not work with third-party data brokers.`}</P>

      <H2>{`6. Data retention`}</H2>
      <P>{`We keep personal information only as long as needed for the purposes described in this Policy, after which we securely dispose of it. In general, we retain waitlist and beta information for the duration of the program and for a reasonable period afterward, then delete or anonymize it, unless a longer period is required by law or contract. You may ask us to delete your information sooner (see Section 7).`}</P>

      <H2>{`7. Your choices and rights`}</H2>
      <P>{`You may:`}</P>
      <UL>
        <LI><B>{`Access or correct`}</B>{` the information we hold about you.`}</LI>
        <LI><B>{`Request deletion`}</B>{` of your information.`}</LI>
        <LI><B>{`Opt out`}</B>{` of non-essential communications at any time using the unsubscribe link or by contacting us.`}</LI>
      </UL>
      <P>{`To exercise these choices, contact us at privacy@radsquared.ai. Depending on where you live, you may have additional rights under applicable privacy laws, and we will honor those rights as required.`}</P>

      <H2>{`8. Children's privacy`}</H2>
      <P>{`The Service is intended for adults (18 years of age or older) and for university-affiliated users and local organizations. The Service is not directed to children, and we do not knowingly collect personal information from children under 13. If you believe a child has provided us personal information, contact us at privacy@radsquared.ai and we will delete it.`}</P>

      <H2>{`9. Cookies and tracking`}</H2>
      <P>{`Consistent with Rad/s2's practice across our sites, we do not use advertising cookies, analytics platforms, or third-party tracking on innovatelocal.ai. We may use only the strictly necessary cookies required for the site and sign-up to function.`}</P>

      <H2>{`10. Changes to this Policy`}</H2>
      <P>{`We may update this Policy from time to time. When we do, we will revise the effective date above and, for material changes, provide additional notice where appropriate.`}</P>

      <H2>{`11. Contact us`}</H2>
      <P>{`Questions about this Policy or our data practices:`}</P>
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
