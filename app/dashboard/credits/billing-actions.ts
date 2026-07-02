'use server'

import { headers } from 'next/headers'
import { requireProfile } from '@/lib/auth/session'
import { resolveViewerOrg } from '@/lib/platform/credits'
import {
  createSubscriptionCheckout,
  createTopupCheckout,
  createBillingPortalUrl,
  planByKey,
} from '@/lib/platform/billing'

export type CheckoutResult = { ok: true; clientSecret: string } | { ok: false; error: string }
export type PortalResult = { ok: true; url: string } | { ok: false; error: string }

async function origin(): Promise<string> {
  const h = await headers()
  return h.get('origin') ?? `https://${h.get('host') ?? 'localhost:8080'}`
}

// The buying org is the acting user's organization; only its admins may pay.
// Authorized off the RESOLVED org role, so it's "act as"-faithful.
async function buyerOrg(): Promise<{ orgId: string; userId: string } | { error: string }> {
  const me = await requireProfile()
  const org = await resolveViewerOrg(me.id)
  if (!org) return { error: 'You’re not part of an organization yet.' }
  if (org.roleInOrg !== 'admin') return { error: 'Only organization admins can manage billing.' }
  return { orgId: org.orgId, userId: me.id }
}

export async function startSubscriptionCheckout(tierKey: string): Promise<CheckoutResult> {
  if (!planByKey(tierKey)) return { ok: false, error: 'Unknown plan.' }
  const ctx = await buyerOrg()
  if ('error' in ctx) return { ok: false, error: ctx.error }
  try {
    const { clientSecret } = await createSubscriptionCheckout({
      orgId: ctx.orgId,
      tierKey,
      createdBy: ctx.userId,
      origin: await origin(),
    })
    return { ok: true, clientSecret }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Could not start checkout.' }
  }
}

export async function startTopupCheckout(credits: number): Promise<CheckoutResult> {
  if (!Number.isInteger(credits) || credits <= 0) return { ok: false, error: 'Enter a valid credit amount.' }
  const ctx = await buyerOrg()
  if ('error' in ctx) return { ok: false, error: ctx.error }
  try {
    const { clientSecret } = await createTopupCheckout({
      orgId: ctx.orgId,
      credits,
      createdBy: ctx.userId,
      origin: await origin(),
    })
    return { ok: true, clientSecret }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Could not start checkout.' }
  }
}

export async function openBillingPortal(): Promise<PortalResult> {
  const ctx = await buyerOrg()
  if ('error' in ctx) return { ok: false, error: ctx.error }
  const url = await createBillingPortalUrl(ctx.orgId, await origin())
  if (!url) return { ok: false, error: 'No billing account yet — make a purchase first.' }
  return { ok: true, url }
}
