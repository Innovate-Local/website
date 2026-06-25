-- autoreply_log_notify_status
-- Recovered from the remote migration history (supabase_migrations.
-- schema_migrations) on 2026-06-25 to reconcile the repo with the live
-- database. This is the SQL that was originally applied via the CLI.

-- Track the internal team-notification outcome per inquiry,
-- separately from the confirmation-email status.
alter table public.autoreply_log add column if not exists notify_status text;

comment on column public.autoreply_log.notify_status is
  'Outcome of the internal new-inquiry notification email (sent / failed / null = no recipients configured)';
