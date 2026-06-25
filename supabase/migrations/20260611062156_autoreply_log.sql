-- autoreply_log
-- Recovered from the remote migration history (supabase_migrations.
-- schema_migrations) on 2026-06-25 to reconcile the repo with the live
-- database. This is the SQL that was originally applied via the CLI.

-- Audit + idempotency log for the send-autoreply Edge Function.
-- One row per public.inquiries row the function has handled. The primary key
-- on inquiry_id is the double-send guard: a second webhook delivery for the
-- same inquiry fails the insert and the function stops.

create table if not exists public.autoreply_log (
  inquiry_id uuid primary key references public.inquiries (id) on delete cascade,
  reference  text,
  recipient  text,
  status     text not null,   -- processing | sent | sent_test | failed | needs_review | skipped_*
  resend_id  text,            -- Resend's id for the sent email, for tracing in their dashboard
  error      text,
  notes      text,            -- engine QC notes (unrecognized industry, long challenge text, ...)
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

comment on table public.autoreply_log is
  'One row per inquiry processed by the send-autoreply Edge Function; PK = no double-sends.';

-- RLS on, no policies: the public (anon) key can do nothing here. The Edge
-- Function uses the service role, which bypasses RLS.
alter table public.autoreply_log enable row level security;
