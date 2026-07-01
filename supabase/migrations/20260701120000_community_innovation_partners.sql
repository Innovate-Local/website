-- ===========================================================================
-- Community Innovation Partners (CIP)
--
-- A Partner (e.g. a bank) receives an annual credit allocation for a cycle and
-- distributes it two ways:
--   assign     (internal) → to one of the partner's own departments
--   transfer   (external) → to a regional org (business/nonprofit/municipality/
--                           chamber); the recipient gets an emailed redemption code
-- Recipients redeem codes for engagements (workshops/sprints/prototypes); unused
-- credits can be reclaimed back to the partner's balance.
--
-- The partner's available balance is DERIVED, not cached:
--   available = annual_allocation
--             − Σ(assign+transfer amounts) + Σ(reclaim amounts)
-- Per-recipient: assigned = Σ(assign+transfer) − Σ(reclaim); redeemed = Σ(redeem).
--
-- Governance today is "store policy + simple limits": partner_role (admin/
-- approver/drafter) + per-role transfer limits are stored and enforced app-side;
-- a full approval queue is deferred.
-- ===========================================================================

-- --- partners ---------------------------------------------------------------
create table if not exists public.partners (
  id                      uuid primary key default gen_random_uuid(),
  -- The partner's own organization (one partner per org).
  org_id                  uuid not null references public.organizations (id) on delete cascade,
  tier                    text not null default 'Founding Community Innovation Partner',
  annual_allocation       integer not null default 0,
  cycle_start             date,
  cycle_end               date,
  footprint               text,
  -- Policy: how long a recipient has to redeem a transfer.
  redemption_window_days  integer not null default 180,
  -- Policy: single-transfer auto-approve ceilings per partner role.
  drafter_limit           integer not null default 8,
  approver_limit          integer not null default 32,
  dual_signoff_threshold  integer not null default 32,
  status                  text not null default 'active' check (status in ('active', 'inactive')),
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),
  unique (org_id)
);
create index if not exists partners_org_idx on public.partners (org_id);

-- --- partner_members --------------------------------------------------------
-- Authorized users on the partner console. admin ≈ Program Admin (full control),
-- approver / drafter differ only by their single-transfer limit (see partners).
create table if not exists public.partner_members (
  id           uuid primary key default gen_random_uuid(),
  partner_id   uuid not null references public.partners (id) on delete cascade,
  user_id      uuid not null references auth.users (id) on delete cascade,
  partner_role text not null default 'drafter' check (partner_role in ('admin', 'approver', 'drafter')),
  created_at   timestamptz not null default now(),
  unique (partner_id, user_id)
);
create index if not exists partner_members_partner_idx on public.partner_members (partner_id);
create index if not exists partner_members_user_idx on public.partner_members (user_id);

-- SECURITY DEFINER membership check — reads partner_members bypassing RLS, so
-- policies can use it without recursive evaluation (mirrors public.is_staff()).
-- Defined here (language sql is validated at creation) now that the table exists.
create or replace function public.is_partner_member(p_partner_id uuid)
returns boolean language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.partner_members
    where partner_id = p_partner_id and user_id = auth.uid()
  );
$$;

-- --- partner_recipients -----------------------------------------------------
-- Every department (kind='internal') or external org receiving partner credits.
-- Free-form; linked_org_id ties it to a platform organization when one matches.
create table if not exists public.partner_recipients (
  id                   uuid primary key default gen_random_uuid(),
  partner_id           uuid not null references public.partners (id) on delete cascade,
  kind                 text not null check (kind in ('business', 'nonprofit', 'municipality', 'chamber', 'internal')),
  name                 text not null,
  contact_name         text,
  contact_email        text,
  -- Kish relationship manager (external recipients only).
  relationship_manager text,
  -- Set when the recipient matches an existing platform organization.
  linked_org_id        uuid references public.organizations (id) on delete set null,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);
create index if not exists partner_recipients_partner_idx on public.partner_recipients (partner_id);

-- --- partner_redemption_codes -----------------------------------------------
-- One code per external transfer. The recipient redeems it (in full or in part)
-- at the public /redeem/<code> page. remaining tracks the unredeemed balance.
create table if not exists public.partner_redemption_codes (
  id                    uuid primary key default gen_random_uuid(),
  partner_id            uuid not null references public.partners (id) on delete cascade,
  recipient_id          uuid references public.partner_recipients (id) on delete set null,
  code                  text not null unique,
  amount                integer not null,
  remaining             integer not null,
  engagement_suggestion text,
  message               text,
  relationship_manager  text,
  expires_at            date,
  status                text not null default 'issued'
                        check (status in ('issued', 'partially_redeemed', 'redeemed', 'expired', 'reclaimed')),
  created_at            timestamptz not null default now()
);
create index if not exists partner_codes_partner_idx on public.partner_redemption_codes (partner_id);
create index if not exists partner_codes_code_idx on public.partner_redemption_codes (code);

-- --- partner_credit_events (the ledger) -------------------------------------
-- Append-only record of every credit movement. amount is always positive; the
-- event_type says how it affects the partner and recipient balances.
create table if not exists public.partner_credit_events (
  id                 uuid primary key default gen_random_uuid(),
  partner_id         uuid not null references public.partners (id) on delete cascade,
  -- null for the opening allocation grant.
  recipient_id       uuid references public.partner_recipients (id) on delete set null,
  event_type         text not null check (event_type in ('allocation', 'assign', 'transfer', 'redeem', 'reclaim')),
  amount             integer not null,
  engagement_key     text,
  redemption_type    text,
  project_id         uuid references public.projects (id) on delete set null,
  project_label      text,
  -- Redemptions carry a fulfilment status (in_progress / completed).
  status             text,
  code_id            uuid references public.partner_redemption_codes (id) on delete set null,
  authorized_by      uuid references auth.users (id) on delete set null,
  authorized_by_name text,
  note               text,
  event_date         date not null default current_date,
  created_at         timestamptz not null default now()
);
create index if not exists partner_events_partner_idx on public.partner_credit_events (partner_id);
create index if not exists partner_events_recipient_idx on public.partner_credit_events (recipient_id);
create index if not exists partner_events_created_idx on public.partner_credit_events (created_at desc);

-- ===========================================================================
-- Row Level Security
--   Writes go through server code (Drizzle/postgres role bypasses RLS). These
--   policies are defence-in-depth for reads: a partner's members read their
--   partner's rows; staff read/write everything. Public /redeem reads go through
--   Drizzle (server), so no anon policy is needed here.
-- ===========================================================================
alter table public.partners                enable row level security;
alter table public.partner_members         enable row level security;
alter table public.partner_recipients      enable row level security;
alter table public.partner_redemption_codes enable row level security;
alter table public.partner_credit_events   enable row level security;

grant select, insert, update, delete on public.partners                 to authenticated;
grant select, insert, update, delete on public.partner_members          to authenticated;
grant select, insert, update, delete on public.partner_recipients       to authenticated;
grant select, insert, update, delete on public.partner_redemption_codes to authenticated;
grant select, insert, update, delete on public.partner_credit_events    to authenticated;

create policy "partners select member/staff" on public.partners
  for select to authenticated using (public.is_partner_member(id) or public.is_staff());
create policy "partners staff all" on public.partners
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

create policy "partner_members select member/staff" on public.partner_members
  for select to authenticated using (public.is_partner_member(partner_id) or public.is_staff());
create policy "partner_members staff all" on public.partner_members
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

create policy "partner_recipients select member/staff" on public.partner_recipients
  for select to authenticated using (public.is_partner_member(partner_id) or public.is_staff());
create policy "partner_recipients staff all" on public.partner_recipients
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

create policy "partner_codes select member/staff" on public.partner_redemption_codes
  for select to authenticated using (public.is_partner_member(partner_id) or public.is_staff());
create policy "partner_codes staff all" on public.partner_redemption_codes
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

create policy "partner_events select member/staff" on public.partner_credit_events
  for select to authenticated using (public.is_partner_member(partner_id) or public.is_staff());
create policy "partner_events staff all" on public.partner_credit_events
  for all to authenticated using (public.is_staff()) with check (public.is_staff());
