-- ===========================================================================
-- project_interests — apprentices express interest in joining a project; hub
-- staff review who's interested and decide whom to add to the team.
--
-- One row per (project, apprentice). Status lifecycle:
--   interested  apprentice has raised their hand (the default)
--   withdrawn   apprentice pulled their interest
--   accepted    staff added them to the team
--   declined    staff passed for now
-- ===========================================================================
create table if not exists public.project_interests (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references public.projects (id) on delete cascade,
  user_id     uuid not null references auth.users (id) on delete cascade,
  message     text,
  status      text not null default 'interested'
              check (status in ('interested', 'withdrawn', 'accepted', 'declined')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (project_id, user_id)
);
create index if not exists project_interests_project_idx on public.project_interests (project_id);
create index if not exists project_interests_user_idx    on public.project_interests (user_id);

create trigger project_interests_set_updated_at
  before update on public.project_interests
  for each row execute function public.set_updated_at();

-- ===========================================================================
-- Row Level Security
--   Apprentices read/write their own interest rows; hub staff see and manage
--   everything. Writes also go through server code (Drizzle), so these are
--   defence-in-depth. Reuses public.is_staff().
-- ===========================================================================
alter table public.project_interests enable row level security;

grant select, insert, update, delete on public.project_interests to authenticated;

create policy "interests select own" on public.project_interests
  for select to authenticated using (user_id = auth.uid());
create policy "interests insert own" on public.project_interests
  for insert to authenticated with check (user_id = auth.uid());
create policy "interests update own" on public.project_interests
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "interests staff all" on public.project_interests
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

-- ===========================================================================
-- Removing a team member now captures *why*. We soft-remove (status 'removed',
-- which already exists) and keep the row + reason for the record, instead of
-- deleting. The unique (project_id, user_id) still lets them be re-added later.
-- ===========================================================================
alter table public.project_assignments
  add column if not exists removal_reason text;

