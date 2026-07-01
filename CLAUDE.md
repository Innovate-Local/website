# CLAUDE.md — orientation for this repo

InnovateLocal: a Next.js 15 (App Router) + React 19 + TypeScript + Tailwind 3
marketing site **plus** an authenticated platform under `/app/dashboard`, backed
by Supabase (Postgres + Auth + Storage) with Drizzle ORM. Deployed on Vercel
(auto-deploys `main`).

## Read these first (don't re-derive)
Before non-trivial work, skim the doc that matches the task:
- **`docs/extending-the-platform.md`** — the primary guide: architecture, the 3
  data clients, roles/auth, the "add a feature" recipe, server-action shape, the
  client/server boundary gotcha, design system, env vars, **§12 payments (Stripe)**,
  **§15 email (Resend)**, **§16 Community Innovation Partners**, **§17 "act as" tool**.
- **`docs/database-migrations.md`** — how DB changes are authored + applied.
- **`docs/platform-foundation-plan.md`** — data model + roadmap.
- **`docs/cip-portal-plan.md`** — the partner-portal build plan + deferred items.

## Environment (`.env`)
- Secrets live in **`.env`** (gitignored; `.env*.local` too). Load with
  `node --env-file=.env …` or Next reads it automatically. **Never commit secrets,
  never log keys, never put a secret in a `NEXT_PUBLIC_` var.**
- The full var table is in `docs/extending-the-platform.md` §10. Notable:
  `DATABASE_URL` (Drizzle), `SUPABASE_SECRET_KEY`, `STRIPE_*`, `RESEND_API_KEY` +
  `EMAIL_FROM` (transactional email; needs a Resend-verified domain).
- Migrations need port **5432** (session pooler), the app uses 6543. Build the
  migration URL without printing the secret:
  ```sh
  DBURL=$(node --env-file=.env -e "const u=new URL(process.env.DATABASE_URL);u.port='5432';process.stdout.write(u.toString())")
  ```

## Commands
- `npm run dev` — local dev on `:8080`
- `npm run typecheck` — `tsc --noEmit`
- `npm run build` — full build; **the only thing that catches the client/server
  import boundary** (a `'use client'` file must not transitively import `lib/db`)
- `supabase db push --db-url "$DBURL"` — apply migrations (then `migration list`
  to confirm Local == Remote)

**Always run `npm run typecheck && npm run build` before committing.**

## Conventions that matter
- **DDL lives in `supabase/migrations/`**; hand-mirror it in `lib/db/schema.ts`.
  Statuses/roles are `text` + `CHECK`, typed via `.$type<…>()`. RLS on every table,
  deny-by-default, with a `public.is_staff()` (and `is_partner_member()`) bypass.
- **Feature code path:** migration → schema mirror → service module in
  `lib/platform/*` (queries + domain logic; pure constants in a separate no-DB
  file) → `'use server'` actions (start with `requireRole/requireProfile`, return
  `{ ok } | { ok:false, error }`, `revalidatePath`) → server page → client form.
- **Auth:** `lib/auth/session.ts`. `getProfile()`/`requireRole()` are the
  **effective** identity (honour the staff "act as" persona); `getRealProfile()`/
  `isRealStaff()` are the true account — **authorization bypasses use the real
  role**. For anything scoped to "the current user's org/partner," use
  `resolveViewerOrg` / `resolveViewerPartner` so it works under "act as".
- **UI:** Modern Bureau design tokens (CSS vars → Tailwind classes; **square
  corners, no border-radius**). Use tokens, not raw hex. Lead pages with
  `PageHeader`; build forms from `components/platform/styles.ts`. **Gotcha:** no
  `/NN` alpha on the `var()`-hex color tokens (compiles to invalid CSS) — use
  solid tokens on colored backgrounds.
- **Backend logic** = Next server actions/route handlers (not Supabase Edge
  Functions). Prefer reusable service modules + components.

## Git
- Commit/push only when asked. **Commit style: simple one-line messages, no AI
  attribution / Co-Authored-By.** If on `main`, prefer a branch for larger work.
