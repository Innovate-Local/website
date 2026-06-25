-- ===========================================================================
-- Innovation Credits + in-org admin/member roles
--
-- Adds a single per-org credit ledger (credit_transactions). An organization's
-- available balance is *derived* from the signed `delta` of its own rows — no
-- cached balance column, so the ledger is the single source of truth.
--
-- Credit flow:
--   grant        (+) hub staff allocate a pool to an org
--   transfer_out (-) org sends credits to another org   } one pair of rows per
--   transfer_in  (+) the recipient org receives them     } org-to-org transfer
--   spend        (-) org commits/redeems credits on a project (internal use)
--   reclaim      (+) credits returned to the org
--
-- Also promotes organization_members.role_in_org from owner/member to
-- admin/member (the in-org hierarchy the dashboard manages).
-- ===========================================================================

-- --- in-org roles: owner -> admin -------------------------------------------
-- Drop the old CHECK first; otherwise the owner->admin update is rejected by the
-- still-active (owner, member) constraint before the new one is in place.
alter table public.organization_members drop constraint if exists organization_members_role_in_org_check;
update public.organization_members set role_in_org = 'admin' where role_in_org = 'owner';
alter table public.organization_members
  add constraint organization_members_role_in_org_check check (role_in_org in ('admin', 'member'));

-- --- credit_transactions -----------------------------------------------------
create table if not exists public.credit_transactions (
  id                  uuid primary key default gen_random_uuid(),
  -- The org whose ledger this row belongs to; balance = sum(delta) over these.
  org_id              uuid not null references public.organizations (id) on delete cascade,
  -- For transfers: the other org. For grants/spends: null.
  counterparty_org_id uuid references public.organizations (id) on delete set null,
  -- For spends/redemptions tied to a project.
  project_id          uuid references public.projects (id) on delete set null,
  kind                text not null
                      check (kind in ('grant', 'transfer_out', 'transfer_in', 'spend', 'reclaim')),
  -- Signed effect on this org's available balance (+ adds, - removes).
  delta               integer not null,
  -- Optional engagement label for spends (workshop_seat, sprint, prototype, …).
  engagement_type     text,
  note                text,
  -- The profile that authorized the movement.
  authorized_by       uuid references auth.users (id) on delete set null,
  created_at          timestamptz not null default now()
);
create index if not exists credit_tx_org_idx     on public.credit_transactions (org_id);
create index if not exists credit_tx_project_idx  on public.credit_transactions (project_id);
create index if not exists credit_tx_created_idx  on public.credit_transactions (created_at desc);

-- ===========================================================================
-- Row Level Security
--   Writes go through server code (Drizzle/postgres role bypasses RLS); these
--   policies are defence-in-depth for reads. Members read their org's ledger;
--   staff read/write everything. Reuses public.is_staff() (SECURITY DEFINER).
-- ===========================================================================
alter table public.credit_transactions enable row level security;

grant select, insert, update, delete on public.credit_transactions to authenticated;

create policy "credit_tx select own org" on public.credit_transactions
  for select to authenticated using (
    org_id in (
      select org_id from public.organization_members where user_id = auth.uid()
    )
  );
create policy "credit_tx staff all" on public.credit_transactions
  for all to authenticated using (public.is_staff()) with check (public.is_staff());
