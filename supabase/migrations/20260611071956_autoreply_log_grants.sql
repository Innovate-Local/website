-- autoreply_log_grants
-- Recovered from the remote migration history (supabase_migrations.
-- schema_migrations) on 2026-06-25 to reconcile the repo with the live
-- database. This is the SQL that was originally applied via the CLI.

-- This project's hardened defaults leave new tables with no privileges.
-- The send-autoreply Edge Function (service_role) needs to claim and update
-- log rows. anon/authenticated stay at zero — correct for an internal table.
grant select, insert, update on table public.autoreply_log to service_role;
