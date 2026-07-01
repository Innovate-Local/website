// Branded HTML email templates for the Community Innovation Partner portal.
// Pure string builders (no server imports) — safe to unit-test or preview. Email
// clients need inline styles, so the Modern Bureau palette is inlined here rather
// than pulled from Tailwind tokens.
const BONE = '#fff9ee'
const SURFACE_LOW = '#f9f3e8'
const INK = '#1d1c15'
const ON_VARIANT = '#4f4537'
const OCHRE = '#7e5700'
const UMBER = '#5A3E28'
const OUTLINE = '#d3c4b2'

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

// Shared shell: header stamp + content + footer, on a bone card.
function layout(opts: { stamp: string; body: string }): string {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:${SURFACE_LOW};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:${INK};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${SURFACE_LOW};padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:${BONE};">
        <tr><td style="padding:28px 40px 20px;border-bottom:1px solid ${OUTLINE};">
          <div style="font-size:11px;letter-spacing:0.22em;text-transform:uppercase;color:${UMBER};font-weight:800;">[ IL ] &nbsp; innovate local</div>
          <div style="font-size:10px;letter-spacing:0.22em;text-transform:uppercase;color:${OCHRE};font-weight:700;margin-top:10px;">${opts.stamp}</div>
        </td></tr>
        <tr><td style="padding:32px 40px;">${opts.body}</td></tr>
        <tr><td style="padding:20px 40px;background:${SURFACE_LOW};font-size:10px;letter-spacing:0.16em;text-transform:uppercase;color:${ON_VARIANT};font-weight:600;">
          InnovateLocal · Community Innovation Partner Program
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`
}

function button(href: string, label: string): string {
  return `<a href="${href}" style="display:inline-block;background:${OCHRE};color:${BONE};text-decoration:none;padding:14px 28px;font-size:12px;letter-spacing:0.18em;text-transform:uppercase;font-weight:800;">${label}</a>`
}

function h1(text: string): string {
  return `<h1 style="margin:0 0 16px;font-family:Georgia,'Times New Roman',serif;font-weight:700;font-size:30px;line-height:1.15;color:${UMBER};">${text}</h1>`
}

function p(text: string): string {
  return `<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:${INK};">${text}</p>`
}

// --- External transfer: recipient gets a redemption code --------------------
export function transferEmail(input: {
  partnerName: string
  recipientOrg: string
  contactName?: string | null
  amount: number
  code: string
  redeemUrl: string
  engagementSuggestion?: string | null
  message?: string | null
  relationshipManager?: string | null
  expiresAt: string
}): { subject: string; html: string } {
  const greeting = input.contactName ? `Hi ${escapeHtml(input.contactName)},` : 'Hello,'
  const expires = new Date(input.expiresAt + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
  const codeBlock = `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:8px 0 24px;background:${SURFACE_LOW};">
      <tr><td style="padding:22px 24px;text-align:center;">
        <div style="font-size:10px;letter-spacing:0.24em;text-transform:uppercase;color:${OCHRE};font-weight:700;margin-bottom:8px;">Redemption code</div>
        <div style="font-family:'SFMono-Regular',Consolas,monospace;font-size:26px;font-weight:700;letter-spacing:0.08em;color:${UMBER};">${escapeHtml(input.code)}</div>
        <div style="font-size:12px;color:${ON_VARIANT};margin-top:10px;">${input.amount} innovation credit${input.amount === 1 ? '' : 's'} · redeem by ${expires}</div>
      </td></tr>
    </table>`
  const suggestion = input.engagementSuggestion
    ? p(`Suggested use: <strong>${escapeHtml(input.engagementSuggestion)}</strong>. You can choose a different engagement when you redeem.`)
    : ''
  const note = input.message
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;border-left:3px solid ${OCHRE};"><tr><td style="padding:8px 0 8px 16px;font-size:14px;line-height:1.6;color:${ON_VARIANT};font-style:italic;">${escapeHtml(input.message)}</td></tr></table>`
    : ''
  const rm = input.relationshipManager
    ? p(`Questions? Your ${escapeHtml(input.partnerName)} relationship manager is ${escapeHtml(input.relationshipManager)}.`)
    : ''

  const body = `
    ${h1(`${escapeHtml(input.partnerName)} has directed innovation credits to ${escapeHtml(input.recipientOrg)}.`)}
    ${p(greeting)}
    ${p(`${escapeHtml(input.partnerName)} has transferred <strong>${input.amount} InnovateLocal innovation credit${input.amount === 1 ? '' : 's'}</strong> to your organization. Credits fund applied AI work — workshops, problem-framing sprints, and student-team prototypes — with local apprentice teams.`)}
    ${codeBlock}
    ${suggestion}
    ${note}
    <div style="margin:8px 0 24px;">${button(input.redeemUrl, 'Redeem your credits →')}</div>
    ${rm}
    ${p(`<span style="font-size:12px;color:${ON_VARIANT};">If the button doesn't work, paste this link into your browser:<br>${escapeHtml(input.redeemUrl)}</span>`)}
  `
  return {
    subject: `${input.partnerName} sent you ${input.amount} innovation credit${input.amount === 1 ? '' : 's'}`,
    html: layout({ stamp: 'Innovation Credits · Transfer notice', body }),
  }
}

// --- Internal assignment: department manager notice -------------------------
export function assignmentEmail(input: {
  partnerName: string
  department: string
  managerName?: string | null
  amount: number
  engagementSuggestion?: string | null
  note?: string | null
  consoleUrl: string
}): { subject: string; html: string } {
  const greeting = input.managerName ? `Hi ${escapeHtml(input.managerName)},` : 'Hello,'
  const suggestion = input.engagementSuggestion
    ? p(`Intended use: <strong>${escapeHtml(input.engagementSuggestion)}</strong>.`)
    : ''
  const note = input.note
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;border-left:3px solid ${OCHRE};"><tr><td style="padding:8px 0 8px 16px;font-size:14px;line-height:1.6;color:${ON_VARIANT};font-style:italic;">${escapeHtml(input.note)}</td></tr></table>`
    : ''
  const body = `
    ${h1(`${input.amount} innovation credit${input.amount === 1 ? '' : 's'} assigned to ${escapeHtml(input.department)}.`)}
    ${p(greeting)}
    ${p(`${escapeHtml(input.partnerName)} has assigned <strong>${input.amount} innovation credit${input.amount === 1 ? '' : 's'}</strong> to ${escapeHtml(input.department)}. Use them for workshop seats, problem-framing sprints, or student-team prototype engagements with InnovateLocal apprentice teams.`)}
    ${suggestion}
    ${note}
    <div style="margin:8px 0 8px;">${button(input.consoleUrl, 'Open the partner console →')}</div>
  `
  return {
    subject: `${input.amount} innovation credit${input.amount === 1 ? '' : 's'} assigned to ${input.department}`,
    html: layout({ stamp: 'Innovation Credits · Internal assignment', body }),
  }
}

// --- Expiration reminder (template ready; automated sending deferred) --------
export function expirationReminderEmail(input: {
  partnerName: string
  recipientOrg: string
  remaining: number
  code: string
  redeemUrl: string
  expiresAt: string
  daysLeft: number
}): { subject: string; html: string } {
  const expires = new Date(input.expiresAt + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
  const body = `
    ${h1(`${input.remaining} innovation credit${input.remaining === 1 ? '' : 's'} expiring in ${input.daysLeft} day${input.daysLeft === 1 ? '' : 's'}.`)}
    ${p(`Your ${escapeHtml(input.partnerName)} innovation credits (code <strong>${escapeHtml(input.code)}</strong>) expire on <strong>${expires}</strong>. Unredeemed credits return to ${escapeHtml(input.partnerName)} after that.`)}
    <div style="margin:8px 0 8px;">${button(input.redeemUrl, 'Redeem before they expire →')}</div>
  `
  return {
    subject: `Reminder: ${input.remaining} innovation credit${input.remaining === 1 ? '' : 's'} expiring soon`,
    html: layout({ stamp: 'Innovation Credits · Expiration reminder', body }),
  }
}
