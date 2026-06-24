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

// Inferred row types for use across the app.
export type Inquiry = typeof inquiries.$inferSelect
export type Student = typeof students.$inferSelect
export type NewStudent = typeof students.$inferInsert
export type Resume = typeof resumes.$inferSelect
export type NewResume = typeof resumes.$inferInsert
