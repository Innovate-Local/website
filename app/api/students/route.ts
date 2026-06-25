// POST /api/students — student resume intake.
//
// A regular Next.js Route Handler (Node runtime), NOT a Deno Edge Function. It:
//   1. validates name + email + the uploaded file (type/size),
//   2. uploads the file to the private `resumes` Storage bucket (service role),
//   3. upserts the student and records the resume row via Drizzle.
//
// Bot protection today is the honeypot field + strict file validation. To harden
// later, verify a Cloudflare Turnstile token here exactly as submit-inquiry does
// (the site key env var is already wired into the form component).

import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { students } from '@/lib/db/schema'
import { validateResumeFile, storeResume } from '@/lib/platform/resumes'

export const runtime = 'nodejs'

const HONEYPOT_FIELD = 'company_website'

function bad(error: string) {
  return NextResponse.json({ ok: false, error }, { status: 200 })
}

export async function POST(req: Request) {
  let form: FormData
  try {
    form = await req.formData()
  } catch {
    return bad('Something went wrong. Please try again.')
  }

  // Honeypot — a real person never fills this. Accept silently, save nothing.
  if (String(form.get(HONEYPOT_FIELD) ?? '').trim()) {
    return NextResponse.json({ ok: true }, { status: 200 })
  }

  const name = String(form.get('name') ?? '').trim()
  const email = String(form.get('email') ?? '').trim().toLowerCase()
  const file = form.get('resume')

  if (!name) return bad('Please enter your name.')
  if (!email.includes('@')) return bad('Please provide a valid email address.')

  const validation = validateResumeFile(file)
  if (!validation.ok) return bad(validation.error)

  const db = getDb()

  // Upsert the student so a repeat submission updates the name rather than
  // failing on the unique email.
  const [student] = await db
    .insert(students)
    .values({ name, email })
    .onConflictDoUpdate({ target: students.email, set: { name } })
    .returning({ id: students.id })

  try {
    await storeResume({ studentId: student.id, file: file as File, ext: validation.ext })
  } catch (e) {
    console.error('[api/students] resume store failed:', e)
    return bad('We could not save your resume. Please try again.')
  }

  return NextResponse.json({ ok: true }, { status: 200 })
}
