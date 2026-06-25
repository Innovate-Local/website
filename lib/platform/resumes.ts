// Shared resume validation + storage logic, used by both the public intake
// route (app/api/students) and the authenticated dashboard upload. Server-only:
// it uses the service-role Storage client.
import { getDb } from '@/lib/db'
import { resumes } from '@/lib/db/schema'
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'

export const RESUME_BUCKET = 'resumes'
export const MAX_RESUME_BYTES = 5 * 1024 * 1024 // 5 MB
export const ALLOWED_RESUME_TYPES: Record<string, string> = {
  'application/pdf': 'pdf',
  'application/msword': 'doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
}

export type ResumeValidation = { ok: true; ext: string } | { ok: false; error: string }

export function validateResumeFile(file: unknown): ResumeValidation {
  if (!(file instanceof File) || file.size === 0) return { ok: false, error: 'Please attach your resume.' }
  if (file.size > MAX_RESUME_BYTES) return { ok: false, error: 'Your resume must be 5 MB or smaller.' }
  const ext = ALLOWED_RESUME_TYPES[file.type]
  if (!ext) return { ok: false, error: 'Please upload a PDF or Word document.' }
  return { ok: true, ext }
}

// Upload the file under the student's id, then record the resume row. Cleans up
// the stored object if the metadata insert fails (no orphans). Returns the new
// resume id.
export async function storeResume({
  studentId,
  file,
  ext,
}: {
  studentId: string
  file: File
  ext: string
}): Promise<{ id: string }> {
  const supabase = getSupabaseAdmin()
  const db = getDb()

  const storagePath = `${studentId}/${crypto.randomUUID()}.${ext}`
  const buffer = new Uint8Array(await file.arrayBuffer())

  const { error: uploadError } = await supabase.storage
    .from(RESUME_BUCKET)
    .upload(storagePath, buffer, { contentType: file.type, upsert: false })
  if (uploadError) throw new Error(`resume upload failed: ${uploadError.message}`)

  try {
    const [row] = await db
      .insert(resumes)
      .values({
        studentId,
        storagePath,
        filename: file.name,
        contentType: file.type,
        sizeBytes: file.size,
      })
      .returning({ id: resumes.id })
    return row
  } catch (e) {
    await supabase.storage.from(RESUME_BUCKET).remove([storagePath])
    throw e
  }
}

// Short-lived signed URL for downloading a stored resume. Callers must do the
// ownership/authorization check before minting this.
export async function createResumeSignedUrl(storagePath: string, expiresIn = 60): Promise<string> {
  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase.storage
    .from(RESUME_BUCKET)
    .createSignedUrl(storagePath, expiresIn)
  if (error || !data) throw new Error(`signed url failed: ${error?.message ?? 'unknown'}`)
  return data.signedUrl
}
