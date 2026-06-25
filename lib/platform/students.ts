// Apprentice ↔ account bridging. The `students` table predates accounts; these
// helpers connect a student row to the signed-in user (by email) and read an
// apprentice's own resumes. Server-only (Drizzle).
import { and, desc, eq, isNull } from 'drizzle-orm'
import type { User } from '@supabase/supabase-js'
import { getDb } from '@/lib/db'
import { students, resumes, type Student, type Resume } from '@/lib/db/schema'

// Find the student row already owned by this user, linking an existing
// email-matched row if it isn't claimed yet. Does NOT create a row — page views
// shouldn't manufacture empty students; creation happens on first upload.
export async function linkAndGetStudent(user: User): Promise<Student | null> {
  const db = getDb()

  const owned = await db.select().from(students).where(eq(students.userId, user.id)).limit(1)
  if (owned[0]) return owned[0]

  const email = (user.email ?? '').toLowerCase()
  if (!email) return null

  // Claim an unlinked row with the same email.
  const linked = await db
    .update(students)
    .set({ userId: user.id })
    .where(and(eq(students.email, email), isNull(students.userId)))
    .returning()
  return linked[0] ?? null
}

// Like linkAndGetStudent, but creates the student row if none exists — used by
// the upload action where a row is required.
export async function getOrCreateStudent(user: User, fullName: string | null): Promise<Student> {
  const existing = await linkAndGetStudent(user)
  if (existing) return existing

  const db = getDb()
  const email = (user.email ?? '').toLowerCase()
  const [created] = await db
    .insert(students)
    .values({ name: fullName?.trim() || email, email, userId: user.id })
    .returning()
  return created
}

export async function getStudentResumes(studentId: string): Promise<Resume[]> {
  const db = getDb()
  return db.select().from(resumes).where(eq(resumes.studentId, studentId)).orderBy(desc(resumes.createdAt))
}
