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
import { eq } from 'drizzle-orm'
import { getDb } from '@/lib/db'
import { students, resumes } from '@/lib/db/schema'
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'

export const runtime = 'nodejs'

const HONEYPOT_FIELD = 'company_website'
const MAX_BYTES = 5 * 1024 * 1024 // 5 MB
const ALLOWED_TYPES: Record<string, string> = {
  'application/pdf': 'pdf',
  'application/msword': 'doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
}

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
  if (!(file instanceof File) || file.size === 0) return bad('Please attach your resume.')
  if (file.size > MAX_BYTES) return bad('Your resume must be 5 MB or smaller.')

  const ext = ALLOWED_TYPES[file.type]
  if (!ext) return bad('Please upload a PDF or Word document.')

  const supabase = getSupabaseAdmin()
  const db = getDb()

  // Upsert the student so a repeat submission updates the name rather than
  // failing on the unique email.
  const [student] = await db
    .insert(students)
    .values({ name, email })
    .onConflictDoUpdate({ target: students.email, set: { name } })
    .returning({ id: students.id })

  // Store the file under the student's id so future RLS policies can scope by
  // owner; a random segment keeps repeat uploads from colliding.
  const storagePath = `${student.id}/${crypto.randomUUID()}.${ext}`
  const buffer = new Uint8Array(await file.arrayBuffer())

  const { error: uploadError } = await supabase.storage
    .from('resumes')
    .upload(storagePath, buffer, { contentType: file.type, upsert: false })

  if (uploadError) {
    console.error('[api/students] upload failed:', uploadError.message)
    return bad('We could not save your resume. Please try again.')
  }

  try {
    await db.insert(resumes).values({
      studentId: student.id,
      storagePath,
      filename: file.name,
      contentType: file.type,
      sizeBytes: file.size,
    })
  } catch (e) {
    // Don't leave an orphaned file if the metadata write fails.
    await supabase.storage.from('resumes').remove([storagePath])
    console.error('[api/students] resume insert failed:', e)
    return bad('Something went wrong on our end. Please try again.')
  }

  return NextResponse.json({ ok: true }, { status: 200 })
}
