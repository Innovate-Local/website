-- ===========================================================================
-- project_feedback — bidirectional feedback on a completed engagement.
--
-- Intentionally generic so it extends without a rewrite:
--   • author_role records the perspective the feedback was given from.
--   • subject_type says what's being rated — an 'apprentice' or the
--     'organization'. (New subject types — e.g. 'hub', peer reviews — slot in by
--     widening the CHECK.)
--   • rating is a single 1–5 score today; `metadata jsonb` is the home for
--     future multi-dimensional scores / structured answers without new columns.
--   • status leaves room for drafts / moderation later.
--
-- Today's two flows: the organization (employer) rates each apprentice on the
-- team, and each apprentice reflects on the engagement (the organization).
-- ===========================================================================
create table if not exists public.project_feedback (
  id              uuid primary key default gen_random_uuid(),
  project_id      uuid not null references public.projects (id) on delete cascade,
  -- Keep feedback even if the author's account is later removed.
  author_id       uuid references auth.users (id) on delete set null,
  author_role     text not null check (author_role in ('apprentice', 'org_member', 'hub_staff')),
  subject_type    text not null check (subject_type in ('apprentice', 'organization')),
  subject_user_id uuid references auth.users (id) on delete cascade,
  subject_org_id  uuid references public.organizations (id) on delete cascade,
  rating          smallint check (rating between 1 and 5),
  comment         text,
  metadata        jsonb not null default '{}'::jsonb,
  status          text not null default 'submitted' check (status in ('submitted', 'withdrawn')),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  -- Exactly one subject is set, matching subject_type.
  constraint project_feedback_subject_chk check (
    (subject_type = 'apprentice'    and subject_user_id is not null and subject_org_id is null) or
    (subject_type = 'organization'  and subject_org_id  is not null and subject_user_id is null)
  )
);
create index if not exists project_feedback_project_idx      on public.project_feedback (project_id);
create index if not exists project_feedback_subject_user_idx on public.project_feedback (subject_user_id);
create index if not exists project_feedback_subject_org_idx  on public.project_feedback (subject_org_id);

-- One feedback row per (project, author, subject). Partial indexes keep this
-- version-safe (no reliance on NULLS-NOT-DISTINCT) and per-subject-type.
create unique index if not exists project_feedback_apprentice_uniq
  on public.project_feedback (project_id, author_id, subject_user_id)
  where subject_type = 'apprentice';
create unique index if not exists project_feedback_org_uniq
  on public.project_feedback (project_id, author_id, subject_org_id)
  where subject_type = 'organization';

create trigger project_feedback_set_updated_at
  before update on public.project_feedback
  for each row execute function public.set_updated_at();

-- ===========================================================================
-- Row Level Security — authors, the subject of the feedback, and staff can see
-- it; authors write their own. Writes also go through server code (Drizzle), so
-- these are defence-in-depth. Reuses public.is_staff().
-- ===========================================================================
alter table public.project_feedback enable row level security;

grant select, insert, update, delete on public.project_feedback to authenticated;

create policy "feedback select visible" on public.project_feedback
  for select to authenticated using (
    author_id = auth.uid()
    or subject_user_id = auth.uid()
    or subject_org_id in (select org_id from public.organization_members where user_id = auth.uid())
    or public.is_staff()
  );
create policy "feedback insert own" on public.project_feedback
  for insert to authenticated with check (author_id = auth.uid() or public.is_staff());
create policy "feedback update own" on public.project_feedback
  for update to authenticated using (author_id = auth.uid()) with check (author_id = auth.uid());
create policy "feedback staff all" on public.project_feedback
  for all to authenticated using (public.is_staff()) with check (public.is_staff());
