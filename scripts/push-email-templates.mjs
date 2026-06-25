// Push branded auth email templates to Supabase via the Management API.
//
// Reads the HTML in supabase/templates/ and PATCHes the project's auth config.
// It's a PARTIAL update of only the mailer subject/content fields, so it never
// touches other auth settings (site URL, redirect URLs, signups, etc.).
//
// Requires a personal access token in SUPABASE_ACCESS_TOKEN (.env or shell):
//   https://supabase.com/dashboard/account/tokens
//
// Usage: npm run email:templates  [--dry]

import { readFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join, resolve } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')
const TPL_DIR = join(ROOT, 'supabase', 'templates')
const DRY_RUN = process.argv.includes('--dry')

function loadEnvFile(path) {
  if (!existsSync(path)) return
  for (const rawLine of readFileSync(path, 'utf8').split('\n')) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue
    const eq = line.indexOf('=')
    if (eq === -1) continue
    const key = line.slice(0, eq).trim()
    let value = line.slice(eq + 1).trim()
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }
    if (!(key in process.env)) process.env[key] = value
  }
}
loadEnvFile(join(ROOT, '.env.local'))
loadEnvFile(join(ROOT, '.env'))

const TOKEN = process.env.SUPABASE_ACCESS_TOKEN
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
if (!TOKEN) {
  console.error('✗ SUPABASE_ACCESS_TOKEN is not set. Create one at https://supabase.com/dashboard/account/tokens')
  process.exit(1)
}
if (!SUPABASE_URL) {
  console.error('✗ NEXT_PUBLIC_SUPABASE_URL is not set.')
  process.exit(1)
}
const REF = new URL(SUPABASE_URL).hostname.split('.')[0]

// GoTrue mailer config keys ←→ template file + subject.
const TEMPLATES = [
  { key: 'confirmation', file: 'confirmation.html', subject: 'Confirm your email · InnovateLocal' },
  { key: 'invite', file: 'invite.html', subject: 'You’re invited to InnovateLocal' },
  { key: 'magic_link', file: 'magic-link.html', subject: 'Your InnovateLocal sign-in link' },
  { key: 'email_change', file: 'email-change.html', subject: 'Confirm your new email · InnovateLocal' },
  { key: 'recovery', file: 'recovery.html', subject: 'Reset your InnovateLocal password' },
  { key: 'reauthentication', file: 'reauthentication.html', subject: 'Your InnovateLocal verification code' },
]

const body = {}
for (const t of TEMPLATES) {
  const html = readFileSync(join(TPL_DIR, t.file), 'utf8')
  body[`mailer_subjects_${t.key}`] = t.subject
  body[`mailer_templates_${t.key}_content`] = html
}

console.log(`Project: ${REF}`)
console.log(`Templates: ${TEMPLATES.map((t) => t.key).join(', ')}`)
if (DRY_RUN) {
  console.log('[dry run] not sending.')
  process.exit(0)
}

const res = await fetch(`https://api.supabase.com/v1/projects/${REF}/config/auth`, {
  method: 'PATCH',
  headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
})

if (!res.ok) {
  console.error(`✗ Failed (${res.status}): ${await res.text()}`)
  process.exit(1)
}
console.log('✓ Email templates pushed.')
