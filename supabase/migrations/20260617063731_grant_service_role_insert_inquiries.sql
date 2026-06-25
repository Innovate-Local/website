-- grant_service_role_insert_inquiries
-- Recovered from the remote migration history (supabase_migrations.
-- schema_migrations) on 2026-06-25 to reconcile the repo with the live
-- database. This is the SQL that was originally applied via the CLI.

-- The public contact forms now save through the submit-inquiry Edge Function,
-- which runs as the service role. Table hardening had limited INSERT on
-- public.inquiries to the anon key only; grant it to service_role so the
-- gatekeeper function can save submissions. (anon INSERT is revoked separately
-- once the new path is verified, so the human-check can't be bypassed.)
GRANT INSERT ON public.inquiries TO service_role;
