// Drizzle schema — the typed source of truth for application queries.
//
// IMPORTANT: the *database* DDL is owned by `supabase/migrations/`, not by this
// file. We deliberately run one migration system (Supabase's) against the
// project. This schema mirrors those tables so we get end-to-end TypeScript
// types and the Drizzle query builder; keep the two in sync when you add a
// migration. (`npm run db:pull` regenerates this file from the live DB if they
// ever drift — use it to verify, especially for `inquiries`, whose exact shape
// lives only in the remote project today.)

import { pgTable, uuid, text, jsonb, timestamp, integer, index } from 'drizzle-orm/pg-core'

// ---------------------------------------------------------------------------
// inquiries — existing table. Public contact forms (join/partner/members) are
// inserted here by the `submit-inquiry` Edge Function, which fires the
// `send-autoreply` trigger. Modelled from that function's insert shape; confirm
// against the live schema with `npm run db:pull` before relying on it for new
// writes.
// ---------------------------------------------------------------------------
export const inquiries = pgTable('inquiries', {
  id: uuid('id').defaultRandom().primaryKey(),
  type: text('type').notNull(),
  payload: jsonb('payload').notNull(),
  reference: text('reference').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

// ---------------------------------------------------------------------------
// students — people who submit their details to the platform. The first feature
// collects name + email; more profile fields will grow here over time.
// ---------------------------------------------------------------------------
export const students = pgTable(
  'students',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    name: text('name').notNull(),
    email: text('email').notNull().unique(),
    // Links an apprentice's detail row to their auth account (nullable: rows
    // created before accounts existed have none). Owner-scoped RLS lands later.
    userId: uuid('user_id'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    emailIdx: index('students_email_idx').on(t.email),
  }),
)

// ---------------------------------------------------------------------------
// resumes — metadata for an uploaded resume. The file itself lives in the
// Supabase Storage `resumes` bucket; `storagePath` is the object key within it.
// One student can upload more than one resume over time.
// ---------------------------------------------------------------------------
export const resumes = pgTable(
  'resumes',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    studentId: uuid('student_id')
      .notNull()
      .references(() => students.id, { onDelete: 'cascade' }),
    storagePath: text('storage_path').notNull(),
    filename: text('filename').notNull(),
    contentType: text('content_type').notNull(),
    sizeBytes: integer('size_bytes').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    studentIdx: index('resumes_student_id_idx').on(t.studentId),
  }),
)

// ===========================================================================
// Platform foundation — accounts, roles, organizations, hubs, projects.
// Mirrors supabase/migrations/20260625120000_platform_foundation.sql. The role
// and status string unions match that file's CHECK constraints; keep them in
// sync (and verify with `npm run db:pull`).
// ===========================================================================

export type UserRole = 'apprentice' | 'org_member' | 'hub_staff'

// hubs — operational nodes (State College today; more later).
export const hubs = pgTable('hubs', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  location: text('location'),
  status: text('status').$type<'active' | 'paused' | 'closed'>().notNull().default('active'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

// profiles — the universal account, 1:1 with auth.users (id === auth.users.id).
export const profiles = pgTable(
  'profiles',
  {
    id: uuid('id').primaryKey(),
    role: text('role').$type<UserRole>().notNull().default('apprentice'),
    fullName: text('full_name'),
    email: text('email'),
    hubId: uuid('hub_id').references(() => hubs.id, { onDelete: 'set null' }),
    status: text('status').$type<'invited' | 'active' | 'disabled'>().notNull().default('active'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    roleIdx: index('profiles_role_idx').on(t.role),
    hubIdx: index('profiles_hub_id_idx').on(t.hubId),
  }),
)

// organizations — local businesses / nonprofits / municipalities (the members).
export const organizations = pgTable('organizations', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  orgType: text('org_type').$type<'business' | 'nonprofit' | 'municipality' | 'other'>(),
  location: text('location'),
  industry: text('industry'),
  size: text('size'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

// organization_members — which users belong to which organization.
export const organizationMembers = pgTable(
  'organization_members',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    orgId: uuid('org_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    userId: uuid('user_id').notNull(),
    roleInOrg: text('role_in_org').$type<'owner' | 'member'>().notNull().default('member'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    userIdx: index('org_members_user_idx').on(t.userId),
    orgIdx: index('org_members_org_idx').on(t.orgId),
  }),
)

// projects — the core engagement: an org problem scoped by a hub.
export const projects = pgTable(
  'projects',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    hubId: uuid('hub_id').references(() => hubs.id, { onDelete: 'set null' }),
    organizationId: uuid('organization_id').references(() => organizations.id, {
      onDelete: 'set null',
    }),
    title: text('title').notNull(),
    problemStatement: text('problem_statement'),
    status: text('status')
      .$type<'intake' | 'scoping' | 'active' | 'delivered' | 'closed'>()
      .notNull()
      .default('intake'),
    createdBy: uuid('created_by'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    hubIdx: index('projects_hub_idx').on(t.hubId),
    orgIdx: index('projects_org_idx').on(t.organizationId),
    statusIdx: index('projects_status_idx').on(t.status),
  }),
)

// project_assignments — the apprentice team on a project.
export const projectAssignments = pgTable(
  'project_assignments',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    userId: uuid('user_id').notNull(),
    roleOnProject: text('role_on_project').$type<'lead' | 'member'>().notNull().default('member'),
    status: text('status').$type<'active' | 'completed' | 'removed'>().notNull().default('active'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    projectIdx: index('assignments_project_idx').on(t.projectId),
    userIdx: index('assignments_user_idx').on(t.userId),
  }),
)

// Inferred row types for use across the app.
export type Inquiry = typeof inquiries.$inferSelect
export type Student = typeof students.$inferSelect
export type NewStudent = typeof students.$inferInsert
export type Resume = typeof resumes.$inferSelect
export type NewResume = typeof resumes.$inferInsert
export type Hub = typeof hubs.$inferSelect
export type Profile = typeof profiles.$inferSelect
export type NewProfile = typeof profiles.$inferInsert
export type Organization = typeof organizations.$inferSelect
export type OrganizationMember = typeof organizationMembers.$inferSelect
export type Project = typeof projects.$inferSelect
export type NewProject = typeof projects.$inferInsert
export type ProjectAssignment = typeof projectAssignments.$inferSelect
