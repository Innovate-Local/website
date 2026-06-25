// Feedback service — bidirectional, completed-engagement feedback and the
// apprentice track record that aggregates it. Server-only (Drizzle). One place
// owns "what feedback exists and who may see it".
import { alias } from 'drizzle-orm/pg-core'
import { and, desc, eq, inArray, sql } from 'drizzle-orm'
import { getDb } from '@/lib/db'
import {
  projectFeedback,
  projects,
  projectAssignments,
  organizations,
  profiles,
} from '@/lib/db/schema'
import type { ProjectStatus } from './project-status'
import type { FeedbackSubjectType } from './feedback-types'

export { FEEDBACK_SUBJECT_TYPES, RATING_SCALE, RATING_LABEL, ratingStars } from './feedback-types'
export type { FeedbackSubjectType, Rating } from './feedback-types'

// Projects are open to feedback once the engagement is done.
export const FEEDBACK_OPEN_STATUSES: ProjectStatus[] = ['delivered', 'closed']
export function isFeedbackOpen(status: ProjectStatus): boolean {
  return FEEDBACK_OPEN_STATUSES.includes(status)
}

export type FeedbackRow = {
  id: string
  authorId: string | null
  authorName: string | null
  authorRole: 'apprentice' | 'org_member' | 'hub_staff'
  subjectType: FeedbackSubjectType
  subjectUserId: string | null
  subjectUserName: string | null
  subjectOrgId: string | null
  subjectOrgName: string | null
  rating: number | null
  comment: string | null
  createdAt: Date
}

// All submitted feedback for a project, with author/subject labels resolved.
export async function getProjectFeedback(projectId: string): Promise<FeedbackRow[]> {
  const db = getDb()
  const authorP = alias(profiles, 'author_p')
  const subjectP = alias(profiles, 'subject_p')
  return db
    .select({
      id: projectFeedback.id,
      authorId: projectFeedback.authorId,
      authorName: sql<string | null>`coalesce(${authorP.fullName}, ${authorP.email})`,
      authorRole: sql<'apprentice' | 'org_member' | 'hub_staff'>`${projectFeedback.authorRole}`,
      subjectType: sql<FeedbackSubjectType>`${projectFeedback.subjectType}`,
      subjectUserId: projectFeedback.subjectUserId,
      subjectUserName: sql<string | null>`coalesce(${subjectP.fullName}, ${subjectP.email})`,
      subjectOrgId: projectFeedback.subjectOrgId,
      subjectOrgName: organizations.name,
      rating: projectFeedback.rating,
      comment: projectFeedback.comment,
      createdAt: projectFeedback.createdAt,
    })
    .from(projectFeedback)
    .leftJoin(authorP, eq(authorP.id, projectFeedback.authorId))
    .leftJoin(subjectP, eq(subjectP.id, projectFeedback.subjectUserId))
    .leftJoin(organizations, eq(organizations.id, projectFeedback.subjectOrgId))
    .where(and(eq(projectFeedback.projectId, projectId), eq(projectFeedback.status, 'submitted')))
    .orderBy(desc(projectFeedback.createdAt))
}

// Feedback for a project visible to a given viewer (we scope in code since reads
// use Drizzle). Staff + org members see all of the project's feedback;
// apprentices see only feedback about themselves or that they authored.
export async function getProjectFeedbackForViewer(
  projectId: string,
  role: 'apprentice' | 'org_member' | 'hub_staff',
  userId: string,
): Promise<FeedbackRow[]> {
  const all = await getProjectFeedback(projectId)
  if (role === 'apprentice') {
    return all.filter((f) => f.subjectUserId === userId || f.authorId === userId)
  }
  return all
}

export type MyFeedbackEntry = {
  subjectType: FeedbackSubjectType
  subjectUserId: string | null
  subjectOrgId: string | null
  rating: number | null
  comment: string | null
}

// What the current author has already submitted for a project (to pre-fill).
export async function getMyProjectFeedback(
  projectId: string,
  authorId: string,
): Promise<MyFeedbackEntry[]> {
  const db = getDb()
  return db
    .select({
      subjectType: sql<FeedbackSubjectType>`${projectFeedback.subjectType}`,
      subjectUserId: projectFeedback.subjectUserId,
      subjectOrgId: projectFeedback.subjectOrgId,
      rating: projectFeedback.rating,
      comment: projectFeedback.comment,
    })
    .from(projectFeedback)
    .where(and(eq(projectFeedback.projectId, projectId), eq(projectFeedback.authorId, authorId)))
}

export type RatingSummary = { avgRating: number | null; ratingCount: number }

// An apprentice's overall rating from organizations across all their projects.
export async function getApprenticeRatingSummary(userId: string): Promise<RatingSummary> {
  const db = getDb()
  const [row] = await db
    .select({
      avgRating: sql<number | null>`round(avg(${projectFeedback.rating}), 1)::float`,
      ratingCount: sql<number>`count(${projectFeedback.rating})::int`,
    })
    .from(projectFeedback)
    .where(
      and(
        eq(projectFeedback.subjectUserId, userId),
        eq(projectFeedback.subjectType, 'apprentice'),
        eq(projectFeedback.status, 'submitted'),
      ),
    )
  return { avgRating: row?.avgRating ?? null, ratingCount: row?.ratingCount ?? 0 }
}

export type TrackRecordProject = {
  id: string
  title: string
  status: ProjectStatus
  orgName: string | null
  roleOnProject: 'lead' | 'member'
  creditsSpent: number
  avgRating: number | null
}

export type ApprenticeTrackRecord = {
  completedCount: number
  avgRating: number | null
  ratingCount: number
  totalCredits: number
  projects: TrackRecordProject[]
}

// An apprentice's portfolio: the engagements they delivered, with the credits
// committed and the rating they earned on each.
export async function getApprenticeTrackRecord(userId: string): Promise<ApprenticeTrackRecord> {
  const db = getDb()
  const rows = await db
    .select({
      id: projects.id,
      title: projects.title,
      status: sql<ProjectStatus>`${projects.status}`,
      orgName: organizations.name,
      roleOnProject: projectAssignments.roleOnProject,
      creditsSpent: sql<number>`(
        select coalesce(-sum(c.delta), 0)::int from credit_transactions c
        where c.project_id = ${projects.id} and c.kind = 'spend'
      )`,
      avgRating: sql<number | null>`(
        select round(avg(f.rating), 1)::float from project_feedback f
        where f.project_id = ${projects.id} and f.subject_user_id = ${userId}
          and f.subject_type = 'apprentice' and f.status = 'submitted'
      )`,
    })
    .from(projectAssignments)
    .innerJoin(projects, eq(projects.id, projectAssignments.projectId))
    .leftJoin(organizations, eq(organizations.id, projects.organizationId))
    .where(
      and(
        eq(projectAssignments.userId, userId),
        inArray(projectAssignments.status, ['active', 'completed']),
        inArray(projects.status, FEEDBACK_OPEN_STATUSES),
      ),
    )
    .orderBy(desc(projects.updatedAt))

  const summary = await getApprenticeRatingSummary(userId)
  return {
    completedCount: rows.length,
    avgRating: summary.avgRating,
    ratingCount: summary.ratingCount,
    totalCredits: rows.reduce((s, r) => s + r.creditsSpent, 0),
    projects: rows,
  }
}
