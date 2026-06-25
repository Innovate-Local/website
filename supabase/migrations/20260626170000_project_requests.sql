-- ===========================================================================
-- project_requests — org members propose work; hub staff review and convert
-- into a real Project (or decline). Org *admins* create projects directly (no
-- request needed); this intake is for non-admin members and keeps staff as the
-- gatekeeper of the project pipeline.
-- ===========================================================================
create table if not exists public.project_requests (
  id                uuid primary key default gen_random_uuid(),
  org_id            uuid not null references public.organizations (id) on delete cascade,
  submitted_by      uuid references auth.users (id) on delete set null,
  title             text not null,
  summary           text,
  problem_statement text,
  status            text not null default 'open' check (status in ('open', 'converted', 'declined')),
  decline_reason    text,
  -- Set when a request is converted into a project.
  project_id        uuid references public.projects (id) on delete set null,
  reviewed_by       uuid references auth.users (id) on delete set null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index if not exists project_requests_org_idx    on public.project_requests (org_id);
create index if not exists project_requests_status_idx on public.project_requests (status);

create trigger project_requests_set_updated_at
  before update on public.project_requests
  for each row execute function public.set_updated_at();

-- ===========================================================================
-- RLS — org members see their org's requests + submit their own; staff manage
-- all. Writes also go through server code (Drizzle). Reuses public.is_staff().
-- ===========================================================================
alter table public.project_requests enable row level security;
grant select, insert, update, delete on public.project_requests to authenticated;

create policy "requests select own org" on public.project_requests
  for select to authenticated using (
    org_id in (select org_id from public.organization_members where user_id = auth.uid())
  );
create policy "requests insert own" on public.project_requests
  for insert to authenticated with check (
    submitted_by = auth.uid()
    and org_id in (select org_id from public.organization_members where user_id = auth.uid())
  );
create policy "requests staff all" on public.project_requests
  for all to authenticated using (public.is_staff()) with check (public.is_staff());
