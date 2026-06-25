import { requireRole, getUser } from '@/lib/auth/session'
import { linkAndGetStudent, getStudentResumes } from '@/lib/platform/students'
import { PageHeader } from '@/components/platform/PageHeader'
import { ResumeManager } from '@/components/platform/ResumeManager'

export default async function ResumePage() {
  await requireRole('apprentice')
  const user = await getUser()

  // Link any pre-existing student row (submitted before accounts) to this user,
  // then load their resumes.
  const student = user ? await linkAndGetStudent(user) : null
  const rows = student ? await getStudentResumes(student.id) : []

  return (
    <div className="flex flex-col">
      <PageHeader eyebrow="Apprentice" title="Resume" />
      <ResumeManager
        resumes={rows.map((r) => ({
          id: r.id,
          filename: r.filename,
          sizeBytes: r.sizeBytes,
          createdAt: r.createdAt.toISOString(),
        }))}
      />
    </div>
  )
}
