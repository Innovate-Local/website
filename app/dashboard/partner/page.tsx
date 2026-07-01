import Link from 'next/link'
import { getUser, requireProfile } from '@/lib/auth/session'
import {
  getPartnerForUser,
  getPartnerOverview,
  getRedemptionSummary,
  listLedger,
  listPartnerMembers,
  listRecipients,
  listRedemptions,
} from '@/lib/platform/partners'
import { PageHeader } from '@/components/platform/PageHeader'
import { PartnerConsole } from '@/components/platform/partner/PartnerConsole'

// Community Innovation Partner console. Available to a partner's authorized users
// (and, for support, hub staff — who reach a specific partner via /dashboard/
// partners/[id]). A user who isn't on any partner sees an explainer.
export default async function PartnerPage() {
  const profile = await requireProfile()
  const user = await getUser()
  const partner = user ? await getPartnerForUser(user.id) : null

  if (!partner) {
    const staff = profile.role === 'hub_staff'
    return (
      <div className="flex flex-col gap-6">
        <PageHeader eyebrow="Community Innovation Partner" title="Partner console" />
        <div className="bg-surface-container-low p-8 font-body text-on-surface-variant">
          {staff ? (
            <>
              You’re not an authorized user on a partner. Manage partners and their allocations from{' '}
              <Link href="/dashboard/partners" className="text-primary hover:text-secondary">
                Partners
              </Link>
              .
            </>
          ) : (
            <>
              This console is for organizations enrolled as Community Innovation Partners. If your
              organization is a partner, ask your Program Admin to add you as an authorized user.
            </>
          )}
        </div>
      </div>
    )
  }

  const [overview, recipients, ledger, redemptions, redemptionSummary, members] = await Promise.all([
    getPartnerOverview(partner.partnerId, partner.annualAllocation),
    listRecipients(partner.partnerId),
    listLedger(partner.partnerId),
    listRedemptions(partner.partnerId),
    getRedemptionSummary(partner.partnerId),
    listPartnerMembers(partner.partnerId),
  ])

  return (
    <PartnerConsole
      partner={partner}
      overview={overview}
      recipients={recipients}
      ledger={ledger}
      redemptions={redemptions}
      redemptionSummary={redemptionSummary}
      members={members}
    />
  )
}
