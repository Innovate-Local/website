// Drizzle schema — the typed source of truth for application queries.
//
// IMPORTANT: the *database* DDL is owned by `supabase/migrations/`, not by this
// file. We deliberately run one migration system (Supabase's) against the
// project. This schema mirrors those tables so we get end-to-end TypeScript
// types and the Drizzle query builder; keep the two in sync when you add a
// migration. (`npm run db:pull` regenerates this file from the live DB if they
// ever drift — use it to verify, especially for `inquiries`, whose exact shape
// lives only in the remote project today.)

import { pgTable, uuid, text, jsonb, timestamp, integer, smallint, date, boolean, index } from 'drizzle-orm/pg-core'

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
  stripeCustomerId: text('stripe_customer_id'),
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
    roleInOrg: text('role_in_org').$type<'admin' | 'member'>().notNull().default('member'),
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
    // Scoping detail (added 20260626150000).
    summary: text('summary'),
    description: text('description'),
    skillsNeeded: text('skills_needed').array().notNull().default([]),
    startDate: date('start_date'),
    dueDate: date('due_date'),
    estimatedCredits: integer('estimated_credits'),
    links: jsonb('links').notNull().default({}),
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
    removalReason: text('removal_reason'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    projectIdx: index('assignments_project_idx').on(t.projectId),
    userIdx: index('assignments_user_idx').on(t.userId),
  }),
)

// project_requests — org members propose work; staff convert to a project.
export const projectRequests = pgTable(
  'project_requests',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    orgId: uuid('org_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    submittedBy: uuid('submitted_by'),
    title: text('title').notNull(),
    summary: text('summary'),
    problemStatement: text('problem_statement'),
    // AI-drafted (or manually-entered) project fields carried into the project
    // on convert. Added 20260701140000.
    description: text('description'),
    skillsNeeded: text('skills_needed').array().notNull().default([]),
    status: text('status')
      .$type<'drafting' | 'open' | 'converted' | 'declined'>()
      .notNull()
      .default('open'),
    declineReason: text('decline_reason'),
    projectId: uuid('project_id').references(() => projects.id, { onDelete: 'set null' }),
    reviewedBy: uuid('reviewed_by'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    orgIdx: index('project_requests_org_idx').on(t.orgId),
    statusIdx: index('project_requests_status_idx').on(t.status),
  }),
)

// apprentice_profiles — the matching/portfolio detail for an apprentice account
// (1:1). Mirrors supabase/migrations/20260626150000_*.
export const apprenticeProfiles = pgTable('apprentice_profiles', {
  userId: uuid('user_id').primaryKey(),
  headline: text('headline'),
  bio: text('bio'),
  skills: text('skills').array().notNull().default([]),
  availability: text('availability')
    .$type<'available' | 'limited' | 'unavailable'>()
    .notNull()
    .default('available'),
  hoursPerWeek: integer('hours_per_week'),
  location: text('location'),
  links: jsonb('links').notNull().default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

// project_deliverables — the concrete pieces of work on a project.
export const projectDeliverables = pgTable(
  'project_deliverables',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    description: text('description'),
    status: text('status').$type<'todo' | 'in_progress' | 'done'>().notNull().default('todo'),
    dueDate: date('due_date'),
    position: integer('position').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    projectIdx: index('project_deliverables_project_idx').on(t.projectId),
  }),
)

// project_interests — apprentices raising their hand to join a project; staff
// review and decide. Mirrors
// supabase/migrations/20260626130000_project_interests.sql.
export const projectInterests = pgTable(
  'project_interests',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    userId: uuid('user_id').notNull(),
    message: text('message'),
    status: text('status')
      .$type<'interested' | 'withdrawn' | 'accepted' | 'declined'>()
      .notNull()
      .default('interested'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    projectIdx: index('project_interests_project_idx').on(t.projectId),
    userIdx: index('project_interests_user_idx').on(t.userId),
  }),
)

// project_feedback — bidirectional feedback on a completed engagement (org rates
// apprentices; apprentices reflect on the org). Generic by design — see
// supabase/migrations/20260626140000_project_feedback.sql. Keep the unions in
// sync with that file's CHECKs.
export const projectFeedback = pgTable(
  'project_feedback',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    authorId: uuid('author_id'),
    authorRole: text('author_role').$type<'apprentice' | 'org_member' | 'hub_staff'>().notNull(),
    subjectType: text('subject_type').$type<'apprentice' | 'organization'>().notNull(),
    subjectUserId: uuid('subject_user_id'),
    subjectOrgId: uuid('subject_org_id').references(() => organizations.id, { onDelete: 'cascade' }),
    rating: smallint('rating'),
    comment: text('comment'),
    metadata: jsonb('metadata').notNull().default({}),
    status: text('status').$type<'submitted' | 'withdrawn'>().notNull().default('submitted'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    projectIdx: index('project_feedback_project_idx').on(t.projectId),
    subjectUserIdx: index('project_feedback_subject_user_idx').on(t.subjectUserId),
    subjectOrgIdx: index('project_feedback_subject_org_idx').on(t.subjectOrgId),
  }),
)

// credit_transactions — the per-org Innovation Credits ledger. An org's
// available balance is sum(delta) over its own rows. Mirrors
// supabase/migrations/20260626120000_innovation_credits.sql; keep the `kind`
// union in sync with that file's CHECK.
export const creditTransactions = pgTable(
  'credit_transactions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    orgId: uuid('org_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    counterpartyOrgId: uuid('counterparty_org_id').references(() => organizations.id, {
      onDelete: 'set null',
    }),
    projectId: uuid('project_id').references(() => projects.id, { onDelete: 'set null' }),
    kind: text('kind')
      .$type<'grant' | 'transfer_out' | 'transfer_in' | 'spend' | 'reclaim' | 'purchase'>()
      .notNull(),
    delta: integer('delta').notNull(),
    engagementType: text('engagement_type'),
    note: text('note'),
    authorizedBy: uuid('authorized_by'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    orgIdx: index('credit_tx_org_idx').on(t.orgId),
    projectIdx: index('credit_tx_project_idx').on(t.projectId),
    createdIdx: index('credit_tx_created_idx').on(t.createdAt),
  }),
)

// org_subscriptions — an org's current Stripe subscription state (one per org).
export const orgSubscriptions = pgTable('org_subscriptions', {
  id: uuid('id').defaultRandom().primaryKey(),
  orgId: uuid('org_id')
    .notNull()
    .references(() => organizations.id, { onDelete: 'cascade' }),
  stripeSubscriptionId: text('stripe_subscription_id').notNull().unique(),
  stripeCustomerId: text('stripe_customer_id'),
  tier: text('tier').$type<'catalyst' | 'anchor' | 'keystone'>(),
  creditsPerPeriod: integer('credits_per_period').notNull().default(0),
  status: text('status').notNull().default('incomplete'),
  currentPeriodEnd: timestamp('current_period_end', { withTimezone: true }),
  cancelAtPeriodEnd: boolean('cancel_at_period_end').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

// payments — a record of each money movement (one-time top-up or subscription
// invoice). Credits are granted via credit_transactions on success.
export const payments = pgTable(
  'payments',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    orgId: uuid('org_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    kind: text('kind').$type<'one_time' | 'subscription'>().notNull(),
    stripeCheckoutSessionId: text('stripe_checkout_session_id').unique(),
    stripePaymentIntentId: text('stripe_payment_intent_id'),
    stripeInvoiceId: text('stripe_invoice_id').unique(),
    amountCents: integer('amount_cents').notNull().default(0),
    currency: text('currency').notNull().default('usd'),
    credits: integer('credits').notNull().default(0),
    status: text('status')
      .$type<'pending' | 'paid' | 'failed' | 'refunded' | 'canceled'>()
      .notNull()
      .default('pending'),
    createdBy: uuid('created_by'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    paidAt: timestamp('paid_at', { withTimezone: true }),
  },
  (t) => ({
    orgIdx: index('payments_org_idx').on(t.orgId),
  }),
)

// ===========================================================================
// Community Innovation Partners (CIP). Mirrors
// supabase/migrations/20260701120000_community_innovation_partners.sql. Keep the
// string unions in sync with that file's CHECK constraints.
// ===========================================================================

// partners — an organization designated as a Community Innovation Partner, with
// an annual credit allocation for a cycle and its governance policy.
export const partners = pgTable(
  'partners',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    orgId: uuid('org_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    tier: text('tier').notNull().default('Founding Community Innovation Partner'),
    annualAllocation: integer('annual_allocation').notNull().default(0),
    cycleStart: date('cycle_start'),
    cycleEnd: date('cycle_end'),
    footprint: text('footprint'),
    redemptionWindowDays: integer('redemption_window_days').notNull().default(180),
    drafterLimit: integer('drafter_limit').notNull().default(8),
    approverLimit: integer('approver_limit').notNull().default(32),
    dualSignoffThreshold: integer('dual_signoff_threshold').notNull().default(32),
    status: text('status').$type<'active' | 'inactive'>().notNull().default('active'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    orgIdx: index('partners_org_idx').on(t.orgId),
  }),
)

// partner_members — authorized users on a partner console (admin/approver/drafter).
export const partnerMembers = pgTable(
  'partner_members',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    partnerId: uuid('partner_id')
      .notNull()
      .references(() => partners.id, { onDelete: 'cascade' }),
    userId: uuid('user_id').notNull(),
    partnerRole: text('partner_role')
      .$type<'admin' | 'approver' | 'drafter'>()
      .notNull()
      .default('drafter'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    partnerIdx: index('partner_members_partner_idx').on(t.partnerId),
    userIdx: index('partner_members_user_idx').on(t.userId),
  }),
)

// partner_recipients — departments (kind='internal') + external orgs receiving
// partner credits; linked_org_id ties one to a platform organization when matched.
export const partnerRecipients = pgTable(
  'partner_recipients',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    partnerId: uuid('partner_id')
      .notNull()
      .references(() => partners.id, { onDelete: 'cascade' }),
    kind: text('kind')
      .$type<'business' | 'nonprofit' | 'municipality' | 'chamber' | 'internal'>()
      .notNull(),
    name: text('name').notNull(),
    contactName: text('contact_name'),
    contactEmail: text('contact_email'),
    relationshipManager: text('relationship_manager'),
    linkedOrgId: uuid('linked_org_id').references(() => organizations.id, {
      onDelete: 'set null',
    }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    partnerIdx: index('partner_recipients_partner_idx').on(t.partnerId),
  }),
)

// partner_redemption_codes — one code per external transfer; redeemed at /redeem.
export const partnerRedemptionCodes = pgTable(
  'partner_redemption_codes',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    partnerId: uuid('partner_id')
      .notNull()
      .references(() => partners.id, { onDelete: 'cascade' }),
    recipientId: uuid('recipient_id').references(() => partnerRecipients.id, {
      onDelete: 'set null',
    }),
    code: text('code').notNull().unique(),
    amount: integer('amount').notNull(),
    remaining: integer('remaining').notNull(),
    engagementSuggestion: text('engagement_suggestion'),
    message: text('message'),
    relationshipManager: text('relationship_manager'),
    expiresAt: date('expires_at'),
    status: text('status')
      .$type<'issued' | 'partially_redeemed' | 'redeemed' | 'expired' | 'reclaimed'>()
      .notNull()
      .default('issued'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    partnerIdx: index('partner_codes_partner_idx').on(t.partnerId),
    codeIdx: index('partner_codes_code_idx').on(t.code),
  }),
)

// partner_credit_events — append-only ledger of every partner credit movement.
export const partnerCreditEvents = pgTable(
  'partner_credit_events',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    partnerId: uuid('partner_id')
      .notNull()
      .references(() => partners.id, { onDelete: 'cascade' }),
    recipientId: uuid('recipient_id').references(() => partnerRecipients.id, {
      onDelete: 'set null',
    }),
    eventType: text('event_type')
      .$type<'allocation' | 'assign' | 'transfer' | 'redeem' | 'reclaim'>()
      .notNull(),
    amount: integer('amount').notNull(),
    engagementKey: text('engagement_key'),
    redemptionType: text('redemption_type'),
    projectId: uuid('project_id').references(() => projects.id, { onDelete: 'set null' }),
    projectLabel: text('project_label'),
    status: text('status'),
    codeId: uuid('code_id').references(() => partnerRedemptionCodes.id, { onDelete: 'set null' }),
    authorizedBy: uuid('authorized_by'),
    authorizedByName: text('authorized_by_name'),
    note: text('note'),
    eventDate: date('event_date').notNull().defaultNow(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    partnerIdx: index('partner_events_partner_idx').on(t.partnerId),
    recipientIdx: index('partner_events_recipient_idx').on(t.recipientId),
    createdIdx: index('partner_events_created_idx').on(t.createdAt),
  }),
)

// ===========================================================================
// MatchCore — Phases A/B/C. Mirrors
// supabase/migrations/20260701130000_matchcore.sql. Scores + raw signals live in
// jsonb; every row records the rubric_version that produced it. Keep the status
// unions in sync with that file's CHECK constraints.
// ===========================================================================

// apprentice_assessments — a scored competency profile (CRR) for an apprentice.
export const apprenticeAssessments = pgTable(
  'apprentice_assessments',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id').notNull(),
    rubricVersion: text('rubric_version').notNull(),
    status: text('status')
      .$type<'in_progress' | 'scored' | 'approved' | 'archived'>()
      .notNull()
      .default('in_progress'),
    source: text('source').$type<'ai_interview' | 'manual'>().notNull().default('ai_interview'),
    transcript: jsonb('transcript').notNull().default([]),
    signals: jsonb('signals').notNull().default({}),
    result: jsonb('result').notNull().default({}),
    crr: integer('crr'),
    crrTier: text('crr_tier'),
    sectionPoints: jsonb('section_points').notNull().default({}),
    summary: text('summary'),
    scoredAt: timestamp('scored_at', { withTimezone: true }),
    approvedBy: uuid('approved_by'),
    approvedAt: timestamp('approved_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    userIdx: index('apprentice_assessments_user_idx').on(t.userId),
    statusIdx: index('apprentice_assessments_status_idx').on(t.status),
  }),
)

// project_discoveries — discovery briefs + complexity (PCS) for a project.
export const projectDiscoveries = pgTable(
  'project_discoveries',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    // A discovery attaches to a project OR (during the org describe flow, before
    // a project exists) a request; convert relinks it to the project.
    projectId: uuid('project_id').references(() => projects.id, { onDelete: 'cascade' }),
    requestId: uuid('request_id').references(() => projectRequests.id, { onDelete: 'cascade' }),
    rubricVersion: text('rubric_version').notNull(),
    status: text('status')
      .$type<'in_progress' | 'scored' | 'approved' | 'archived'>()
      .notNull()
      .default('in_progress'),
    source: text('source').$type<'ai_interview' | 'manual'>().notNull().default('ai_interview'),
    transcript: jsonb('transcript').notNull().default([]),
    signals: jsonb('signals').notNull().default({}),
    result: jsonb('result').notNull().default({}),
    pcs: integer('pcs'),
    complexity: text('complexity'),
    projectType: text('project_type'),
    secondaryType: text('secondary_type'),
    summary: text('summary'),
    scoredAt: timestamp('scored_at', { withTimezone: true }),
    approvedBy: uuid('approved_by'),
    approvedAt: timestamp('approved_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    projectIdx: index('project_discoveries_project_idx').on(t.projectId),
    requestIdx: index('project_discoveries_request_idx').on(t.requestId),
    statusIdx: index('project_discoveries_status_idx').on(t.status),
  }),
)

// project_matches — a saved match run (ranked candidates + proposed team).
export const projectMatches = pgTable(
  'project_matches',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    rubricVersion: text('rubric_version').notNull(),
    pcs: integer('pcs'),
    complexity: text('complexity'),
    projectType: text('project_type'),
    teamSize: integer('team_size').notNull().default(1),
    ranked: jsonb('ranked').notNull().default([]),
    team: jsonb('team').notNull().default({}),
    status: text('status').$type<'proposed' | 'approved' | 'superseded'>().notNull().default('proposed'),
    generatedBy: uuid('generated_by'),
    approvedBy: uuid('approved_by'),
    approvedAt: timestamp('approved_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    projectIdx: index('project_matches_project_idx').on(t.projectId),
    statusIdx: index('project_matches_status_idx').on(t.status),
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
export type CreditTransaction = typeof creditTransactions.$inferSelect
export type NewCreditTransaction = typeof creditTransactions.$inferInsert
export type ProjectInterest = typeof projectInterests.$inferSelect
export type NewProjectInterest = typeof projectInterests.$inferInsert
export type ProjectFeedback = typeof projectFeedback.$inferSelect
export type NewProjectFeedback = typeof projectFeedback.$inferInsert
export type ApprenticeProfile = typeof apprenticeProfiles.$inferSelect
export type NewApprenticeProfile = typeof apprenticeProfiles.$inferInsert
export type OrgSubscription = typeof orgSubscriptions.$inferSelect
export type Payment = typeof payments.$inferSelect
export type ProjectRequest = typeof projectRequests.$inferSelect
export type NewProjectRequest = typeof projectRequests.$inferInsert
export type ProjectDeliverable = typeof projectDeliverables.$inferSelect
export type NewProjectDeliverable = typeof projectDeliverables.$inferInsert
export type Partner = typeof partners.$inferSelect
export type NewPartner = typeof partners.$inferInsert
export type PartnerMember = typeof partnerMembers.$inferSelect
export type NewPartnerMember = typeof partnerMembers.$inferInsert
export type PartnerRecipient = typeof partnerRecipients.$inferSelect
export type NewPartnerRecipient = typeof partnerRecipients.$inferInsert
export type PartnerRedemptionCode = typeof partnerRedemptionCodes.$inferSelect
export type NewPartnerRedemptionCode = typeof partnerRedemptionCodes.$inferInsert
export type PartnerCreditEvent = typeof partnerCreditEvents.$inferSelect
export type NewPartnerCreditEvent = typeof partnerCreditEvents.$inferInsert
export type ApprenticeAssessment = typeof apprenticeAssessments.$inferSelect
export type NewApprenticeAssessment = typeof apprenticeAssessments.$inferInsert
export type ProjectDiscovery = typeof projectDiscoveries.$inferSelect
export type NewProjectDiscovery = typeof projectDiscoveries.$inferInsert
export type ProjectMatch = typeof projectMatches.$inferSelect
export type NewProjectMatch = typeof projectMatches.$inferInsert
