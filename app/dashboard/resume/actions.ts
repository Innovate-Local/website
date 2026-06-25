'use server'

import { revalidatePath } from 'next/cache'
import { eq } from 'drizzle-orm'
import { requireRole, requireProfile, getUser } from '@/lib/auth/session'
import { getDb } from '@/lib/db'
import { resumes, students } from '@/lib/db/schema'
import { validateResumeFile, storeResume, createResumeSignedUrl } from '@/lib/platform/resumes'
import { getOrCreateStudent } from '@/lib/platform/students'

export type UploadResult = { ok: true } | { ok: false; error: string }
export type UrlResult = { ok: true; url: string } | { ok: false; error: string }

// Apprentice uploads a resume for their own account. Creates/links their student
// row on first upload.
export async function uploadResume(formData: FormData): Promise<UploadResult> {
  const profile = await requireRole('apprentice')
  const user = await getUser()
  if (!user) return { ok: false, error: 'You are not signed in.' }

  const file = formData.get('resume')
  const validation = validateResumeFile(file)
  if (!validation.ok) return { ok: false, error: validation.error }

  try {
    const student = await getOrCreateStudent(user, profile.fullName)
    await storeResume({ studentId: student.id, file: file as File, ext: validation.ext })
  } catch (e) {
    console.error('[resume.upload] failed:', e)
    return { ok: false, error: 'We could not save your resume. Please try again.' }
  }

  revalidatePath('/dashboard/resume')
  return { ok: true }
}

// Mint a short-lived download URL for a resume the caller is allowed to see
// (its owner, or any staff). Ownership is checked here before the URL is minted.
export async function getResumeUrl(resumeId: string): Promise<UrlResult> {
  const profile = await requireProfile()
  const user = await getUser()

  const db = getDb()
  const [row] = await db
    .select({ storagePath: resumes.storagePath, ownerId: students.userId })
    .from(resumes)
    .leftJoin(students, eq(students.id, resumes.studentId))
    .where(eq(resumes.id, resumeId))
    .limit(1)

  if (!row) return { ok: false, error: 'Resume not found.' }

  const isOwner = !!user && !!row.ownerId && row.ownerId === user.id
  const isStaff = profile.role === 'hub_staff'
  if (!isOwner && !isStaff) return { ok: false, error: 'You are not allowed to view this resume.' }

  try {
    const url = await createResumeSignedUrl(row.storagePath)
    return { ok: true, url }
  } catch (e) {
    console.error('[resume.getUrl] failed:', e)
    return { ok: false, error: 'Could not generate a download link. Please try again.' }
  }
}
