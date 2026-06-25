-- harden_trg_send_autoreply
-- Recovered from the remote migration history (supabase_migrations.
-- schema_migrations) on 2026-06-25 to reconcile the repo with the live
-- database. This is the SQL that was originally applied via the CLI.

-- Advisor lints 0028/0029: the SECURITY DEFINER trigger function was
-- executable via the public API (Postgres grants EXECUTE to PUBLIC by
-- default). Nobody should call it directly — it only runs as the
-- inquiries INSERT trigger, and trigger firing does not re-check EXECUTE.
revoke execute on function public.trg_send_autoreply() from public, anon, authenticated;
