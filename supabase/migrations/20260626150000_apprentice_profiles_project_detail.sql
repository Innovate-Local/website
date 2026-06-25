-- ===========================================================================
-- Apprentice profiles + richer project information + deliverables
--
-- Three additions that round out the apprentice and project surfaces:
--   1. apprentice_profiles — the matching/portfolio detail for an apprentice
--      (skills, availability, bio, links). 1:1 with their account.
--   2. projects gains scoping detail — summary, description, skills needed,
--      a timeline, an effort estimate, and links.
--   3. project_deliverables — the concrete pieces of work on a project, with
--      status + due dates, so a project is a workspace, not just a record.
-- ===========================================================================

-- --- 1. apprentice_profiles --------------------------------------------------
create table if not exists public.apprentice_profiles (
  user_id        uuid primary key references auth.users (id) on delete cascade,
  headline       text,
  bio            text,
  skills         text[] not null default '{}',
  availability   text not null default 'available'
                 check (availability in ('available', 'limited', 'unavailable')),
  hours_per_week integer,
  location       text,
  links          jsonb not null default '{}'::jsonb,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create trigger apprentice_profiles_set_updated_at
  before update on public.apprentice_profiles
  for each row execute function public.set_updated_at();

alter table public.apprentice_profiles enable row level security;
grant select, insert, update, delete on public.apprentice_profiles to authenticated;

create policy "apprentice_profiles select own" on public.apprentice_profiles
  for select to authenticated using (user_id = auth.uid());
create policy "apprentice_profiles insert own" on public.apprentice_profiles
  for insert to authenticated with check (user_id = auth.uid());
create policy "apprentice_profiles update own" on public.apprentice_profiles
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "apprentice_profiles staff all" on public.apprentice_profiles
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

-- --- 2. projects: scoping detail --------------------------------------------
alter table public.projects
  add column if not exists summary           text,
  add column if not exists description       text,
  add column if not exists skills_needed     text[] not null default '{}',
  add column if not exists start_date        date,
  add column if not exists due_date          date,
  add column if not exists estimated_credits integer,
  add column if not exists links             jsonb not null default '{}'::jsonb;

-- --- 3. project_deliverables -------------------------------------------------
create table if not exists public.project_deliverables (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references public.projects (id) on delete cascade,
  title       text not null,
  description text,
  status      text not null default 'todo'
              check (status in ('todo', 'in_progress', 'done')),
  due_date    date,
  position    integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists project_deliverables_project_idx on public.project_deliverables (project_id);

create trigger project_deliverables_set_updated_at
  before update on public.project_deliverables
  for each row execute function public.set_updated_at();

alter table public.project_deliverables enable row level security;
grant select, insert, update, delete on public.project_deliverables to authenticated;

-- Read: staff, the assigned team, or members of the owning org. Write: staff or
-- the assigned team (the people doing the work track it). Writes also go through
-- server code (Drizzle).
create policy "deliverables select visible" on public.project_deliverables
  for select to authenticated using (
    public.is_staff()
    or exists (
      select 1 from public.project_assignments a
      where a.project_id = project_deliverables.project_id and a.user_id = auth.uid()
    )
    or exists (
      select 1 from public.projects p
      join public.organization_members m on m.org_id = p.organization_id
      where p.id = project_deliverables.project_id and m.user_id = auth.uid()
    )
  );
create policy "deliverables write team" on public.project_deliverables
  for all to authenticated using (
    public.is_staff()
    or exists (
      select 1 from public.project_assignments a
      where a.project_id = project_deliverables.project_id and a.user_id = auth.uid()
    )
  ) with check (
    public.is_staff()
    or exists (
      select 1 from public.project_assignments a
      where a.project_id = project_deliverables.project_id and a.user_id = auth.uid()
    )
  );
