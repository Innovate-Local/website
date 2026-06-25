-- revoke_anon_insert_inquiries
-- Recovered from the remote migration history (supabase_migrations.
-- schema_migrations) on 2026-06-25 to reconcile the repo with the live
-- database. This is the SQL that was originally applied via the CLI.

-- Close the bypass: submissions now go through the submit-inquiry Edge Function,
-- which requires a valid Cloudflare Turnstile token and inserts as service_role.
-- Remove the anon (public) key's ability to insert directly into public.inquiries
-- so the human-check cannot be skipped by writing to the table with the public
-- key. (service_role keeps INSERT, granted in the previous migration.)
REVOKE INSERT ON public.inquiries FROM anon;
