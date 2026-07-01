-- ===========================================================================
-- MatchCore — Phases A/B/C. Structured competency profiles for apprentices
-- (CRR), discovery + complexity for projects (PCS), and match runs (SAS + team).
--
-- Design note: scores + raw signals are stored as JSONB and every row records
-- the `rubric_version` that produced it. Changing a rubric (lib/matchcore/config)
-- therefore needs NO migration — old rows stay interpretable under their version.
-- Denormalized scalar columns (crr, pcs, project_type, section_points) exist so
-- the matching engine can query pools cheaply without unpacking JSONB.
--
-- Writes flow through server actions (Drizzle over the pooler) guarded by
-- requireRole/requireProfile; RLS below is defence-in-depth for the anon/key
-- path. Reuses public.is_staff() and public.set_updated_at().
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- Phase A — apprentice_assessments (CRR). One row per assessment attempt; the
-- latest 'approved' (else 'scored') row is an apprentice's current profile.
-- ---------------------------------------------------------------------------
create table if not exists public.apprentice_assessments (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users (id) on delete cascade,
  rubric_version  text not null,
  status          text not null default 'in_progress'
                  check (status in ('in_progress', 'scored', 'approved', 'archived')),
  source          text not null default 'ai_interview'
                  check (source in ('ai_interview', 'manual')),
  transcript      jsonb not null default '[]'::jsonb,   -- interview messages
  signals         jsonb not null default '{}'::jsonb,   -- raw LLM extraction (audit)
  result          jsonb not null default '{}'::jsonb,   -- full CompetencyResult
  crr             integer,
  crr_tier        text,
  section_points  jsonb not null default '{}'::jsonb,   -- {sectionKey: points} for matching
  summary         text,
  scored_at       timestamptz,
  approved_by     uuid,
  approved_at     timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists apprentice_assessments_user_idx   on public.apprentice_assessments (user_id);
create index if not exists apprentice_assessments_status_idx on public.apprentice_assessments (status);

create trigger apprentice_assessments_set_updated_at
  before update on public.apprentice_assessments
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Phase B — project_discoveries (PCS). One (or more) discovery runs per project.
-- ---------------------------------------------------------------------------
create table if not exists public.project_discoveries (
  id              uuid primary key default gen_random_uuid(),
  project_id      uuid not null references public.projects (id) on delete cascade,
  rubric_version  text not null,
  status          text not null default 'in_progress'
                  check (status in ('in_progress', 'scored', 'approved', 'archived')),
  source          text not null default 'ai_interview'
                  check (source in ('ai_interview', 'manual')),
  transcript      jsonb not null default '[]'::jsonb,
  signals         jsonb not null default '{}'::jsonb,
  result          jsonb not null default '{}'::jsonb,   -- full ComplexityResult
  pcs             integer,
  complexity      text,
  project_type    text,
  secondary_type  text,
  summary         text,
  scored_at       timestamptz,
  approved_by     uuid,
  approved_at     timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists project_discoveries_project_idx on public.project_discoveries (project_id);
create index if not exists project_discoveries_status_idx  on public.project_discoveries (status);

create trigger project_discoveries_set_updated_at
  before update on public.project_discoveries
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Phase C — project_matches. A saved match run: ranked candidates + a proposed
-- team, with the PCS/type it was computed against snapshotted for reproducibility.
-- ---------------------------------------------------------------------------
create table if not exists public.project_matches (
  id              uuid primary key default gen_random_uuid(),
  project_id      uuid not null references public.projects (id) on delete cascade,
  rubric_version  text not null,
  pcs             integer,
  complexity      text,
  project_type    text,
  team_size       integer not null default 1,
  ranked          jsonb not null default '[]'::jsonb,   -- RankedMatch[]
  team            jsonb not null default '{}'::jsonb,   -- RecommendedTeam
  status          text not null default 'proposed'
                  check (status in ('proposed', 'approved', 'superseded')),
  generated_by    uuid,
  approved_by     uuid,
  approved_at     timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists project_matches_project_idx on public.project_matches (project_id);
create index if not exists project_matches_status_idx  on public.project_matches (status);

create trigger project_matches_set_updated_at
  before update on public.project_matches
  for each row execute function public.set_updated_at();

-- ===========================================================================
-- Row Level Security
-- ===========================================================================
alter table public.apprentice_assessments enable row level security;
alter table public.project_discoveries    enable row level security;
alter table public.project_matches         enable row level security;

grant select, insert, update, delete on public.apprentice_assessments to authenticated;
grant select, insert, update, delete on public.project_discoveries    to authenticated;
grant select, insert, update, delete on public.project_matches        to authenticated;

-- apprentice_assessments: an apprentice sees/creates/updates only their own;
-- hub staff see and manage all.
create policy "assessments select own" on public.apprentice_assessments
  for select to authenticated using (user_id = auth.uid());
create policy "assessments insert own" on public.apprentice_assessments
  for insert to authenticated with check (user_id = auth.uid());
create policy "assessments update own" on public.apprentice_assessments
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "assessments staff all" on public.apprentice_assessments
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

-- project_discoveries: staff manage all; a project's org members may READ its
-- discovery (the brief is theirs). Writes are staff-side for now.
create policy "discoveries staff all" on public.project_discoveries
  for all to authenticated using (public.is_staff()) with check (public.is_staff());
create policy "discoveries select own-org" on public.project_discoveries
  for select to authenticated using (
    exists (
      select 1
      from public.projects p
      join public.organization_members om on om.org_id = p.organization_id
      where p.id = project_id and om.user_id = auth.uid()
    )
  );

-- project_matches: internal to the matching process — staff only.
create policy "matches staff all" on public.project_matches
  for all to authenticated using (public.is_staff()) with check (public.is_staff());
