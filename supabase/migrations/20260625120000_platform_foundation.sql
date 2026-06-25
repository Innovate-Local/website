-- platform_foundation — accounts, roles, organizations, hubs, projects.
--
-- This is the shared foundation for the InnovateLocal platform. It introduces
-- authenticated accounts (Supabase Auth) with three roles and the core
-- relational model that the workflow slices (hub console, org portal,
-- apprentice portal) will build on. Tier/partner/credit features are NOT here.
--
-- Conventions carried over from 20260624115652_students_resumes.sql:
--   * DDL lives here (Supabase migrations), mirrored by hand in lib/db/schema.ts.
--   * Every table has RLS enabled and is deny-by-default; we then add explicit
--     policies. Privileged writes go through the server (service role), which
--     bypasses RLS — same model the public forms already use.
--   * Statuses/roles are text + CHECK (cheaper to evolve than pg enums); only
--     the stable role set is constrained.

-- ===========================================================================
-- Helpers
-- ===========================================================================

-- Generic updated_at touch trigger.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- NOTE: is_staff() is defined after public.profiles below — it's a language-sql
-- function whose body is validated at creation time, so the table it reads must
-- already exist.

-- ===========================================================================
-- hubs — operational nodes (State College today; more later)
-- ===========================================================================
create table if not exists public.hubs (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  slug       text not null unique,
  location   text,
  status     text not null default 'active' check (status in ('active', 'paused', 'closed')),
  created_at timestamptz not null default now()
);

-- Seed the first hub.
insert into public.hubs (name, slug, location)
values ('State College', 'state-college', 'State College, PA')
on conflict (slug) do nothing;

-- ===========================================================================
-- profiles — the universal account, 1:1 with auth.users
-- ===========================================================================
create table if not exists public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  role       text not null default 'apprentice'
             check (role in ('apprentice', 'org_member', 'hub_staff')),
  full_name  text,
  email      text,
  hub_id     uuid references public.hubs (id) on delete set null,
  status     text not null default 'active' check (status in ('invited', 'active', 'disabled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists profiles_role_idx on public.profiles (role);
create index if not exists profiles_hub_id_idx on public.profiles (hub_id);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- New auth user → create their profile row (default role: apprentice).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'full_name',
    'apprentice'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Stop a normal user from editing privileged fields on their own profile
-- (role / status / hub_id). Only the service role may change them. full_name
-- (and future self-editable fields) stay editable via the "update own" policy.
create or replace function public.guard_profile_privileged_fields()
returns trigger
language plpgsql
as $$
begin
  if auth.role() <> 'service_role' then
    if new.role   is distinct from old.role
    or new.status is distinct from old.status
    or new.hub_id is distinct from old.hub_id then
      raise exception 'Only staff may change role, status, or hub assignment.';
    end if;
  end if;
  return new;
end;
$$;

create trigger profiles_guard_privileged
  before update on public.profiles
  for each row execute function public.guard_profile_privileged_fields();

-- Is the current user hub staff? SECURITY DEFINER so it reads public.profiles
-- bypassing RLS — this is what lets policies on any table (including profiles
-- itself) call it without recursive policy evaluation. Defined here, after
-- profiles exists, because a language-sql body is validated at creation time.
create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'hub_staff'
  );
$$;

-- ===========================================================================
-- organizations + organization_members
-- ===========================================================================
create table if not exists public.organizations (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  org_type   text check (org_type in ('business', 'nonprofit', 'municipality', 'other')),
  location   text,
  industry   text,
  size       text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger organizations_set_updated_at
  before update on public.organizations
  for each row execute function public.set_updated_at();

create table if not exists public.organization_members (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references public.organizations (id) on delete cascade,
  user_id     uuid not null references auth.users (id) on delete cascade,
  role_in_org text not null default 'member' check (role_in_org in ('owner', 'member')),
  created_at  timestamptz not null default now(),
  unique (org_id, user_id)
);
create index if not exists org_members_user_idx on public.organization_members (user_id);
create index if not exists org_members_org_idx  on public.organization_members (org_id);

-- ===========================================================================
-- projects — the core engagement entity, and its apprentice team
-- ===========================================================================
create table if not exists public.projects (
  id                uuid primary key default gen_random_uuid(),
  hub_id            uuid references public.hubs (id) on delete set null,
  organization_id   uuid references public.organizations (id) on delete set null,
  title             text not null,
  problem_statement text,
  status            text not null default 'intake'
                    check (status in ('intake', 'scoping', 'active', 'delivered', 'closed')),
  created_by        uuid references auth.users (id) on delete set null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index if not exists projects_hub_idx    on public.projects (hub_id);
create index if not exists projects_org_idx     on public.projects (organization_id);
create index if not exists projects_status_idx  on public.projects (status);

create trigger projects_set_updated_at
  before update on public.projects
  for each row execute function public.set_updated_at();

create table if not exists public.project_assignments (
  id              uuid primary key default gen_random_uuid(),
  project_id      uuid not null references public.projects (id) on delete cascade,
  user_id         uuid not null references auth.users (id) on delete cascade,
  role_on_project text not null default 'member' check (role_on_project in ('lead', 'member')),
  status          text not null default 'active' check (status in ('active', 'completed', 'removed')),
  created_at      timestamptz not null default now(),
  unique (project_id, user_id)
);
create index if not exists assignments_project_idx on public.project_assignments (project_id);
create index if not exists assignments_user_idx    on public.project_assignments (user_id);

-- ===========================================================================
-- Bridge existing apprentice data to accounts (owner policies land in a later
-- phase; the column lands now so the model is complete).
-- ===========================================================================
alter table public.students
  add column if not exists user_id uuid references auth.users (id) on delete set null;
create unique index if not exists students_user_id_key on public.students (user_id)
  where user_id is not null;

-- ===========================================================================
-- Row Level Security
-- ===========================================================================
alter table public.hubs                 enable row level security;
alter table public.profiles             enable row level security;
alter table public.organizations        enable row level security;
alter table public.organization_members enable row level security;
alter table public.projects             enable row level security;
alter table public.project_assignments  enable row level security;

-- Table privileges for the authenticated role; RLS gates the rows. (anon gets
-- nothing here — public forms continue to use the service role.)
grant select, insert, update, delete on
  public.hubs, public.profiles, public.organizations,
  public.organization_members, public.projects, public.project_assignments
  to authenticated;

-- --- hubs: every signed-in user may read; only staff may write ---
create policy "hubs readable by authenticated" on public.hubs
  for select to authenticated using (true);
create policy "hubs writable by staff" on public.hubs
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

-- --- profiles ---
create policy "profiles select own" on public.profiles
  for select to authenticated using (id = auth.uid());
create policy "profiles update own" on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
create policy "profiles staff all" on public.profiles
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

-- --- organizations ---
create policy "organizations select own" on public.organizations
  for select to authenticated using (
    exists (
      select 1 from public.organization_members m
      where m.org_id = organizations.id and m.user_id = auth.uid()
    )
  );
create policy "organizations staff all" on public.organizations
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

-- --- organization_members ---
create policy "org_members select own" on public.organization_members
  for select to authenticated using (user_id = auth.uid());
create policy "org_members staff all" on public.organization_members
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

-- --- projects ---
create policy "projects select assigned apprentice" on public.projects
  for select to authenticated using (
    exists (
      select 1 from public.project_assignments a
      where a.project_id = projects.id and a.user_id = auth.uid()
    )
  );
create policy "projects select own org" on public.projects
  for select to authenticated using (
    organization_id in (
      select org_id from public.organization_members where user_id = auth.uid()
    )
  );
create policy "projects staff all" on public.projects
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

-- --- project_assignments ---
create policy "assignments select own" on public.project_assignments
  for select to authenticated using (user_id = auth.uid());
create policy "assignments staff all" on public.project_assignments
  for all to authenticated using (public.is_staff()) with check (public.is_staff());
