-- enable_pg_net
-- Recovered from the remote migration history (supabase_migrations.
-- schema_migrations) on 2026-06-25 to reconcile the repo with the live
-- database. This is the SQL that was originally applied via the CLI.

-- pg_net: lets Postgres make async HTTP calls — the mechanism behind
-- database webhooks. Needed so an INSERT trigger can call the
-- send-autoreply Edge Function.
create extension if not exists pg_net with schema extensions;
