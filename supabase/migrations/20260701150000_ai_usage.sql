-- ===========================================================================
-- ai_usage_events — one row per LLM call, for cost/insight analytics. Written by
-- the AI client (lib/ai) after each request; read only by hub staff (internal).
-- cost is stored in micro-USD (integer) to avoid float drift. Attribution refs
-- (user/org/project/request) are nullable — set when the caller knows them.
-- ===========================================================================
create table if not exists public.ai_usage_events (
  id                uuid primary key default gen_random_uuid(),
  feature           text not null,                 -- e.g. competency_interview, project_draft
  model             text not null,
  prompt_tokens     integer not null default 0,
  completion_tokens integer not null default 0,     -- includes reasoning tokens
  reasoning_tokens  integer not null default 0,
  total_tokens      integer not null default 0,
  cost_micros       bigint  not null default 0,     -- 1e-6 USD
  user_id           uuid,
  org_id            uuid references public.organizations (id) on delete set null,
  project_id        uuid references public.projects (id) on delete set null,
  request_id        uuid references public.project_requests (id) on delete set null,
  created_at        timestamptz not null default now()
);
create index if not exists ai_usage_created_idx on public.ai_usage_events (created_at);
create index if not exists ai_usage_feature_idx on public.ai_usage_events (feature);
create index if not exists ai_usage_org_idx     on public.ai_usage_events (org_id);
create index if not exists ai_usage_project_idx on public.ai_usage_events (project_id);

-- Internal analytics — staff only. Inserts run through the server (Drizzle over
-- the pooler), so no INSERT policy for other roles is needed.
alter table public.ai_usage_events enable row level security;
grant select, insert on public.ai_usage_events to authenticated;
create policy "ai usage staff all" on public.ai_usage_events
  for all to authenticated using (public.is_staff()) with check (public.is_staff());
