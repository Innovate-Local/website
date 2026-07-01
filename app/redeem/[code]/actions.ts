'use server'

import { revalidatePath } from 'next/cache'
import { engagementLabel } from '@/lib/platform/engagement-types'
import { getRedemptionByCode, recordRedemption } from '@/lib/platform/partners'

export type ActionResult = { ok: true; message: string } | { ok: false; error: string }

function parseAmount(raw: FormDataEntryValue | null): number {
  const n = Math.floor(Number(raw))
  return Number.isFinite(n) ? n : 0
}

// Public: a recipient redeems (all or part of) a code for an engagement. No auth
// — the code itself is the credential. Reads/writes go through Drizzle (RLS
// bypassed) which is why this lives server-side only.
export async function redeemCodeAction(code: string, formData: FormData): Promise<ActionResult> {
  const view = await getRedemptionByCode(code)
  if (!view) return { ok: false, error: 'That redemption code was not found.' }
  if (view.status === 'reclaimed') return { ok: false, error: 'These credits were reclaimed and are no longer available.' }
  if (view.remaining <= 0 || view.status === 'redeemed') {
    return { ok: false, error: 'These credits have already been fully redeemed.' }
  }
  if (view.expiresAt && new Date(view.expiresAt + 'T23:59:59') < new Date()) {
    return { ok: false, error: 'This redemption window has closed.' }
  }

  const amount = parseAmount(formData.get('amount'))
  if (amount <= 0) return { ok: false, error: 'Enter a credit amount greater than zero.' }
  if (amount > view.remaining) return { ok: false, error: `Only ${view.remaining} credits remain on this code.` }

  const engKey = String(formData.get('engagementKey') ?? '').trim() || null
  const projectLabel = String(formData.get('projectLabel') ?? '').trim() || null
  const redeemerName = String(formData.get('redeemerName') ?? '').trim() || view.recipientName || null

  await recordRedemption({
    codeId: view.id,
    partnerId: view.partnerId,
    recipientId: view.recipientId,
    amount,
    engagementKey: engKey,
    redemptionType: engagementLabel(engKey) ?? 'Recipient choice',
    projectLabel,
    authorizedByName: redeemerName,
  })

  revalidatePath(`/redeem/${code}`)
  return {
    ok: true,
    message: `Redeemed ${amount} credit${amount === 1 ? '' : 's'}. Your ${view.partnerName} relationship manager and the InnovateLocal team have been notified.`,
  }
}
