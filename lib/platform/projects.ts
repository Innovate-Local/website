// Projects service — the core engagement loop (an org problem, scoped by a hub,
// delivered by an apprentice team). Server-only (Drizzle). Read access is
// role-scoped here so pages and actions share one definition of "what can this
// user see".
import { and, desc, eq, inArray, sql, type SQL } from 'drizzle-orm'
import { getDb } from '@/lib/db'
import {
  projects,
  projectAssignments,
  organizations,
  organizationMembers,
  profiles,
  hubs,
  type Profile,
  type Project,
} from '@/lib/db/schema'
import { PROJECT_STATUSES, type ProjectStatus } from './project-status'

// Re-exported so server code can keep importing these from one place.
export { PROJECT_STATUSES, PROJECT_STATUS_LABEL } from './project-status'
export type { ProjectStatus } from './project-status'

export type ProjectListItem = {
  id: string
  title: string
  status: ProjectStatus
  orgName: string | null
  teamSize: number
}

// Which projects this user may see: staff → all; apprentice → assigned;
// org_member → their org's. Returns undefined for "all" (no filter).
function visibilityFilter(profile: Profile, userId: string): SQL | undefined {
  if (profile.role === 'hub_staff') return undefined
  if (profile.role === 'apprentice') {
    return inArray(
      projects.id,
      getDb()
        .select({ id: projectAssignments.projectId })
        .from(projectAssignments)
        .where(eq(projectAssignments.userId, userId)),
    )
  }
  // org_member
  return inArray(
    projects.organizationId,
    getDb()
      .select({ id: organizationMembers.orgId })
      .from(organizationMembers)
      .where(eq(organizationMembers.userId, userId)),
  )
}

export async function listProjectsForUser(profile: Profile, userId: string): Promise<ProjectListItem[]> {
  const db = getDb()
  return db
    .select({
      id: projects.id,
      title: projects.title,
      status: sql<ProjectStatus>`${projects.status}`,
      orgName: organizations.name,
      teamSize: sql<number>`count(distinct ${projectAssignments.id})::int`,
    })
    .from(projects)
    .leftJoin(organizations, eq(organizations.id, projects.organizationId))
    .leftJoin(projectAssignments, eq(projectAssignments.projectId, projects.id))
    .where(visibilityFilter(profile, userId))
    .groupBy(projects.id, organizations.name)
    .orderBy(desc(projects.createdAt))
}

export type ProjectDetail = Project & { orgName: string | null }

// A single project the user is allowed to see, or null.
export async function getProjectForUser(
  projectId: string,
  profile: Profile,
  userId: string,
): Promise<ProjectDetail | null> {
  const db = getDb()
  const [proj] = await db
    .select({
      id: projects.id,
      hubId: projects.hubId,
      organizationId: projects.organizationId,
      title: projects.title,
      problemStatement: projects.problemStatement,
      status: projects.status,
      createdBy: projects.createdBy,
      createdAt: projects.createdAt,
      updatedAt: projects.updatedAt,
      orgName: organizations.name,
    })
    .from(projects)
    .leftJoin(organizations, eq(organizations.id, projects.organizationId))
    .where(eq(projects.id, projectId))
    .limit(1)

  if (!proj) return null
  if (profile.role === 'hub_staff') return proj

  if (profile.role === 'apprentice') {
    const [a] = await db
      .select({ id: projectAssignments.id })
      .from(projectAssignments)
      .where(and(eq(projectAssignments.projectId, projectId), eq(projectAssignments.userId, userId)))
      .limit(1)
    return a ? proj : null
  }

  // org_member
  if (!proj.organizationId) return null
  const [m] = await db
    .select({ id: organizationMembers.id })
    .from(organizationMembers)
    .where(
      and(
        eq(organizationMembers.orgId, proj.organizationId),
        eq(organizationMembers.userId, userId),
      ),
    )
    .limit(1)
  return m ? proj : null
}

export type TeamMember = {
  id: string
  userId: string
  roleOnProject: 'lead' | 'member'
  fullName: string | null
  email: string | null
}

export async function getProjectTeam(projectId: string): Promise<TeamMember[]> {
  const db = getDb()
  return db
    .select({
      id: projectAssignments.id,
      userId: projectAssignments.userId,
      roleOnProject: projectAssignments.roleOnProject,
      fullName: profiles.fullName,
      email: profiles.email,
    })
    .from(projectAssignments)
    .leftJoin(profiles, eq(profiles.id, projectAssignments.userId))
    .where(eq(projectAssignments.projectId, projectId))
    .orderBy(projectAssignments.roleOnProject) // ascending: 'lead' before 'member'
}

// Staff helpers for the create/assign UI.
export async function listOrganizationsBrief(): Promise<{ id: string; name: string }[]> {
  const db = getDb()
  return db.select({ id: organizations.id, name: organizations.name }).from(organizations).orderBy(organizations.name)
}

export async function listApprentices(): Promise<{ id: string; fullName: string | null; email: string | null }[]> {
  const db = getDb()
  return db
    .select({ id: profiles.id, fullName: profiles.fullName, email: profiles.email })
    .from(profiles)
    .where(eq(profiles.role, 'apprentice'))
    .orderBy(profiles.fullName)
}

export async function getDefaultHubId(): Promise<string | null> {
  const db = getDb()
  const [hub] = await db.select({ id: hubs.id }).from(hubs).orderBy(hubs.createdAt).limit(1)
  return hub?.id ?? null
}
