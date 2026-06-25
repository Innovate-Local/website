# Database & Migrations — runbook

How the InnovateLocal Postgres database (hosted on Supabase) is changed and how
those changes get applied. Read this before adding a migration.

## TL;DR

- DDL lives in `supabase/migrations/*.sql`. `lib/db/schema.ts` is a hand-written
  Drizzle **mirror** of it (for typed queries), kept in sync manually.
- The Supabase **CLI is installed** (`brew install supabase/tap/supabase`) and
  the project is configured (`supabase/config.toml`, `project_id` =
  `qqlnpeodeicifbfepslb`).
- Local migrations and the remote history are **fully reconciled** —
  `supabase db push` is the normal flow.
- Connection comes from `DATABASE_URL` in `.env`. It's the **transaction**
  pooler (port 6543, used by the app). For schema work (push/list) use the
  **session** pooler — same URL with port **5432**.

## Adding & applying a migration

1. Create the file: `supabase migration new <name>` (or hand-write
   `supabase/migrations/<timestamp>_<name>.sql`). Write the DDL.
2. Apply it to the remote database:
   ```sh
   DBURL=$(node --env-file=.env -e "const u=new URL(process.env.DATABASE_URL); u.port='5432'; process.stdout.write(u.toString())")
   supabase db push --db-url "$DBURL"
   ```
   (`--db-url` avoids needing `supabase login` + `supabase link`. If you prefer
   the linked flow, run `supabase login` then `supabase link --project-ref
   qqlnpeodeicifbfepslb` once, after which plain `supabase db push` works.)
3. Update `lib/db/schema.ts` to mirror the change.
4. Verify: `supabase migration list --db-url "$DBURL"` (Local == Remote), then
   `npm run typecheck && npm run build`.

Authoring rules so a file applies cleanly (it runs as one transaction):
- A `language sql` function is validated at creation time — define it **after**
  any table it references (this is why `is_staff()` sits below `profiles` in the
  foundation migration). `language plpgsql` bodies aren't validated until called.
- `CREATE POLICY`/`CREATE TRIGGER` have no `IF NOT EXISTS`; don't author a file
  expecting to re-run it. Prefer `create table if not exists` / `on conflict do
  nothing` where natural.

> `npm run db:pull` introspects the live DB to check drift, but drizzle-kit
> currently crashes parsing some `CHECK` constraints — it confirms tables/policies
> before it does, but isn't reliable end-to-end here. Treat the migration file +
> hand-written mirror as the source of truth.

## History reconciliation (done 2026-06-25 — context)

For a while this repo was **not** the system of record for migrations: the remote
`supabase_migrations.schema_migrations` table held 8 CLI-applied migrations
(June 10–17: `inquiries`/`autoreply_log`/pg_net/grants/RLS hardening) whose
`.sql` files were absent here, and `20260624115652_students_resumes.sql` existed
in the repo but had been applied out-of-band (not recorded). That blocked
`supabase db push`.

It was reconciled **without destroying history** (the CLI's suggested
`migration repair --status reverted …` was deliberately avoided):

- The 8 missing files were **recovered from the database itself** — the
  `statements` column of `schema_migrations` holds the original SQL — and written
  back into `supabase/migrations/` (headers note their provenance).
- `students_resumes` was recorded into `schema_migrations` (its tables already
  existed).

Result: `supabase migration list` shows Local == Remote for all 10 versions, and
`supabase db push` reports "up to date". No further action needed.

## Bringing auth online (one-time, Supabase dashboard)

These are remote project settings the CLI can't push without linking/login:

1. **Auth → URL Configuration:** Site URL + Redirect URLs
   `http://localhost:8080/auth/callback` and
   `https://innovatelocal.ai/auth/callback`. _(Done.)_ Email magic link is on by
   default.
2. **Seed the first hub staff:** sign in once at `/login` (creates an
   `apprentice` profile via the signup trigger), then run
   `update public.profiles set role = 'hub_staff' where email = '<you>';`
3. **Org-member invites — Email Template (required for invites to work):**
   Auth → Email Templates → **Invite user**. Admin invites use a `token_hash`
   link (no PKCE verifier), so the link must hit our app directly. Set the body's
   link to:
   ```html
   <a href="{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=invite">Accept your invite</a>
   ```
   The `/auth/callback` route verifies the token (`verifyOtp`) and drops them on
   `/dashboard`. (Default magic-link login is unaffected — the callback handles
   both `?code=` and `?token_hash=`.)
4. **SMTP for real invites:** Supabase's built-in email is rate-limited (a few
   per hour) and not for production. Configure custom SMTP (Auth → SMTP, e.g.
   Resend/Postmark) before relying on invite delivery.
