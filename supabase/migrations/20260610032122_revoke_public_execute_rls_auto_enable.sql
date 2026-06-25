-- revoke_public_execute_rls_auto_enable
-- Recovered from the remote migration history (supabase_migrations.
-- schema_migrations) on 2026-06-25 to reconcile the repo with the live
-- database. This is the SQL that was originally applied via the CLI.

-- Harden: rls_auto_enable() is an event-trigger function and never needs to be
-- callable through the public REST API. Revoke EXECUTE from the API-exposed roles.
-- Clears Supabase security advisor warnings 0028/0029. No effect on the website.
revoke execute on function public.rls_auto_enable() from anon, authenticated, public;
