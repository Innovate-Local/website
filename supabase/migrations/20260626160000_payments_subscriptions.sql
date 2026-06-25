-- ===========================================================================
-- Payments + subscriptions (Stripe) → Innovation Credits
--
-- Orgs pay for credits two ways, both via embedded Stripe Checkout:
--   • subscription (mode: subscription) — a monthly plan that grants a credit
--     allowance each period (granted on invoice.paid)
--   • one-time top-up (mode: payment) — buy a chosen number of credits now
--
-- A successful payment records a `purchase` row in credit_transactions (+delta).
-- These tables are the money-side record; the ledger remains the balance source.
-- ===========================================================================

-- --- credit_transactions: allow the 'purchase' kind ------------------------
alter table public.credit_transactions drop constraint if exists credit_transactions_kind_check;
alter table public.credit_transactions
  add constraint credit_transactions_kind_check
  check (kind in ('grant', 'transfer_out', 'transfer_in', 'spend', 'reclaim', 'purchase'));

-- --- organizations: the org's Stripe Customer ------------------------------
alter table public.organizations
  add column if not exists stripe_customer_id text;
create unique index if not exists organizations_stripe_customer_idx
  on public.organizations (stripe_customer_id) where stripe_customer_id is not null;

-- --- org_subscriptions: current subscription state per org -----------------
create table if not exists public.org_subscriptions (
  id                     uuid primary key default gen_random_uuid(),
  org_id                 uuid not null references public.organizations (id) on delete cascade,
  stripe_subscription_id text not null unique,
  stripe_customer_id     text,
  tier                   text check (tier in ('catalyst', 'anchor', 'keystone')),
  credits_per_period     integer not null default 0,
  -- Stripe subscription status (active, trialing, past_due, canceled, …) — stored
  -- as free text so new Stripe statuses don't need a migration.
  status                 text not null default 'incomplete',
  current_period_end     timestamptz,
  cancel_at_period_end   boolean not null default false,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  unique (org_id)
);
create index if not exists org_subscriptions_org_idx on public.org_subscriptions (org_id);

create trigger org_subscriptions_set_updated_at
  before update on public.org_subscriptions
  for each row execute function public.set_updated_at();

-- --- payments: a record of each money movement -----------------------------
create table if not exists public.payments (
  id                        uuid primary key default gen_random_uuid(),
  org_id                    uuid not null references public.organizations (id) on delete cascade,
  kind                      text not null check (kind in ('one_time', 'subscription')),
  stripe_checkout_session_id text unique,
  stripe_payment_intent_id  text,
  stripe_invoice_id         text unique,
  amount_cents              integer not null default 0,
  currency                  text not null default 'usd',
  credits                   integer not null default 0,
  status                    text not null default 'pending'
                            check (status in ('pending', 'paid', 'failed', 'refunded', 'canceled')),
  created_by                uuid references auth.users (id) on delete set null,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now(),
  paid_at                   timestamptz
);
create index if not exists payments_org_idx on public.payments (org_id);

create trigger payments_set_updated_at
  before update on public.payments
  for each row execute function public.set_updated_at();

-- ===========================================================================
-- RLS — org members read their org's billing; staff read all. All writes go
-- through server code (Drizzle/webhook as the DB role, bypassing RLS).
-- ===========================================================================
alter table public.org_subscriptions enable row level security;
alter table public.payments          enable row level security;

grant select, insert, update, delete on public.org_subscriptions to authenticated;
grant select, insert, update, delete on public.payments          to authenticated;

create policy "subscriptions select own org" on public.org_subscriptions
  for select to authenticated using (
    org_id in (select org_id from public.organization_members where user_id = auth.uid())
  );
create policy "subscriptions staff all" on public.org_subscriptions
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

create policy "payments select own org" on public.payments
  for select to authenticated using (
    org_id in (select org_id from public.organization_members where user_id = auth.uid())
  );
create policy "payments staff all" on public.payments
  for all to authenticated using (public.is_staff()) with check (public.is_staff());
