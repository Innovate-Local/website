# Extending the Platform — architecture & conventions

A practical guide for adding features to the InnovateLocal platform without
re-deriving how it's wired. It documents the moving parts, the extension points,
and the conventions that keep new work consistent. Pair it with:

- `docs/platform-foundation-plan.md` — the platform's data model + roadmap.
- `docs/database-migrations.md` — how DB changes get applied.
- `supabase/templates/_README.md` — auth email templates.

---

## 1. Stack & where things live

- **Next.js 15 App Router** + React 19 + TypeScript, Tailwind 3. Deployed on
  Vercel (server code runs as serverless functions; `middleware.ts` runs at the
  edge).
- **Supabase**: Postgres (data), Auth (accounts), Storage (files).
- **Drizzle ORM** for typed relational queries.

```
app/
  (marketing)            ← public pages (/, /join, /partner, …) — untouched by the platform
  login/  auth/          ← unauthenticated auth screens + callback/signout
  dashboard/             ← the authenticated platform (gated by middleware)
    <feature>/
      page.tsx           ← server component (reads data, gates by role)
      [id]/page.tsx      ← detail pages
      actions.ts         ← 'use server' mutations for this feature
  api/                   ← public route handlers (e.g. resume intake)
components/
  platform/              ← dashboard UI (shell, forms, reusable bits, styles.ts)
  ui/ sections/ layout/  ← marketing components
lib/
  auth/session.ts        ← getUser / getProfile / requireUser / requireProfile / requireRole
  db/ index.ts schema.ts ← Drizzle client + the schema mirror
  supabase/              ← @supabase/ssr clients (client, server, middleware)
  supabaseAdmin.ts       ← service-role client (privileged, server-only)
  platform/              ← per-feature service modules (queries + domain logic)
supabase/
  migrations/            ← DDL (source of truth for the database)
  templates/             ← branded auth email HTML
scripts/                 ← one-off Node tooling (migrations, email push)
```

---

## 2. The three data clients — pick the right one

| Client | File | Auth context | RLS | Use for |
|---|---|---|---|---|
| **Drizzle** | `lib/db` → `getDb()` | connects as the Postgres role | **bypassed** | Typed relational reads/writes in server code. You scope access yourself. |
| **Supabase server** | `lib/supabase/server` → `createClient()` | the signed-in user (cookies) | **enforced** | Reading the auth user; user-scoped reads that should respect RLS. |
| **Supabase admin** | `lib/supabaseAdmin` → `getSupabaseAdmin()` | service role | **bypassed** | Privileged ops: creating/inviting users, Storage uploads, signed URLs. |

Rule of thumb: feature data access goes through **Drizzle** with explicit
`where` scoping (see `lib/platform/projects.ts` `visibilityFilter`). RLS is
**defense-in-depth**, not the app's primary gate — so always authorize in code
too. All three are **server-only**; never import them into a client component
(see §7).

---

## 3. Roles & authorization

Three roles today: `apprentice`, `org_member`, `hub_staff` (the `UserRole` union
in `lib/db/schema.ts`). Authorization is layered:

- **Route gate** — `middleware.ts` redirects anonymous users away from
  `/dashboard/*`.
- **Page/action gate** — `lib/auth/session.ts`:
  - `requireUser()` → redirects to `/login` if signed out.
  - `requireProfile()` → returns the profile row (role, name, …).
  - `requireRole('hub_staff', …)` → returns the profile or redirects.
  Start every server action and protected page with one of these.
- **Row gate (RLS)** — every table is RLS-enabled, deny-by-default, with
  owner-scoped + `is_staff()` policies (see §5).

Adding privileged logic? Guard the **server action** with `requireRole(...)` and
do the write via Drizzle (or admin client). Don't rely on hiding a button.

---

## 4. Adding a feature end-to-end (the recipe)

Most features follow the same path. Using a hypothetical `deliverables` entity:

1. **Migration** — `supabase/migrations/<ts>_deliverables.sql`: create the
   table, enable RLS, add policies (`owner`/`is_staff()`), grant `authenticated`
   the privileges the policies need. Apply with `supabase db push --db-url …`
   (see `docs/database-migrations.md`).
2. **Schema mirror** — add the table + inferred types to `lib/db/schema.ts`
   (hand-mirrored; keep column names/`$type` unions in sync with the SQL).
3. **Service module** — `lib/platform/deliverables.ts`: server-only query
   functions, with role-scoped read access (mirror the
   `visibilityFilter`/`getXForUser` pattern). Pure constants/labels/types that a
   client component needs go in a **separate** no-DB-import file (e.g.
   `deliverable-status.ts`) — see §7.
4. **Actions** — `app/dashboard/deliverables/actions.ts` with `'use server'`:
   each export starts with `requireRole(...)`, validates input, writes via
   Drizzle, calls `revalidatePath(...)`, and returns a result object (§6).
5. **Pages** — `app/dashboard/deliverables/page.tsx` (+ `[id]/page.tsx`): server
   components that gate by role and render. Use `PageHeader` and the shared
   styles.
6. **Client bits** — interactive forms in `components/platform/` (`'use client'`,
   `useTransition`, call the actions).
7. **Navigation** — add the route to `navForRole()` in `lib/platform/roles.ts`
   for the roles that should see it; optionally a quick link in
   `app/dashboard/page.tsx` (`ROLE_HOME`).

That's the whole loop. Steps 1–2 are the only DB-touching ones; the rest is
typed all the way through.

---

## 5. Database conventions

- **DDL lives in `supabase/migrations/`** and is mirrored by hand in
  `lib/db/schema.ts`. They are kept in sync manually; `npm run db:pull`
  introspects the live DB to check drift (caveat: drizzle-kit currently crashes
  parsing some `CHECK` constraints — it still verifies tables/policies first).
- **Statuses/roles** are modeled as `text` + `CHECK` (cheaper to evolve than pg
  enums), typed in Drizzle with `.$type<'a' | 'b'>()`.
- **RLS is on for every table, deny-by-default.** Then add policies:
  - Owner-scoped `select`/`update` (`user_id = auth.uid()` or via a join).
  - A staff-all policy using `public.is_staff()` — a `SECURITY DEFINER` function
    that reads `profiles` **bypassing RLS**, which is what avoids recursive
    policy evaluation. Reuse it; don't re-query `profiles` inside a policy.
  - `grant <privs> … to authenticated` so the policies are usable.
- **Privileged profile fields** (`role`, `status`, `hub_id`) are protected by the
  `guard_profile_privileged_fields` trigger — users can edit their own profile
  but not self-promote. Server code (Drizzle/service role) is exempt by design.
- **New accounts** get a `profiles` row automatically via the
  `handle_new_user` trigger on `auth.users` (default role `apprentice`).
- **Authoring rules** (each migration file runs as one transaction):
  - A `language sql` function is validated at creation — define it **after** any
    table it references. `language plpgsql` bodies are deferred.
  - `CREATE POLICY` / `CREATE TRIGGER` have no `IF NOT EXISTS`; don't write files
    expecting to re-run. Prefer `create table if not exists` / `on conflict do
    nothing` where natural.

---

## 6. Server actions — the standard shape

```ts
'use server'
export async function doThing(arg: string, formData: FormData): Promise<Result> {
  const me = await requireRole('hub_staff')          // 1. gate
  const value = String(formData.get('x') ?? '').trim()
  if (!value) return { ok: false, error: '…' }        // 2. validate → typed error
  await getDb().update(table).set({ … }).where(…)     // 3. mutate (Drizzle)
  revalidatePath('/dashboard/…')                      // 4. revalidate
  return { ok: true }                                 // 5. typed result
}
```

- Always return a discriminated result (`{ ok: true } | { ok: false; error }`),
  never throw to the client for expected failures.
- Client components call them inside `useTransition`, set pending UI, and surface
  `result.error` inline. See `RoleSelect`, `CreateOrgForm`, `ProjectTeam` for the
  pattern.
- `revalidatePath` the affected routes so server components re-render with fresh
  data.

---

## 7. The client/server boundary (important gotcha)

A `'use client'` component must not transitively import the Drizzle/Postgres
client — webpack will try to bundle `postgres` (Node `fs`, `perf_hooks`) into the
browser and the **build fails**.

This bites when a client component imports a value (constant/function) from a
service module that also imports `lib/db`. Avoid it by:

- Putting **pure data** a client needs (status constants, labels, enums, types)
  in a separate module with **no server imports** — e.g.
  `lib/platform/project-status.ts`, re-exported by the server service module.
- Importing **types only** with `import type { … }` (erased at build, safe).
- Passing data into client components as **props** from the server page, rather
  than having the client fetch it.

Server actions are exempt: importing an `actions.ts` into a client component is
fine — Next replaces it with an RPC reference, not the server code.

---

## 8. UI & design system

- **Modern Bureau** tokens are defined as CSS variables in `app/globals.css` and
  exposed as Tailwind classes in `tailwind.config.ts` (e.g. `bg-surface`,
  `text-on-surface`, `text-primary`, `bg-tertiary-container`). Use the tokens,
  not raw hex. Border radius is **0 everywhere** by design.
- Fonts: `font-headline` (Newsreader serif), `font-body` / `font-label` (Inter).
  The `.annotation` utility is the small uppercase eyebrow style.
- **Reusable platform pieces** in `components/platform/`:
  - `DashboardShell` — the authenticated frame (sidebar nav + sign-out).
    Role-aware via `navForRole`.
  - `PageHeader` — eyebrow + title + optional actions; use it on every page.
  - `styles.ts` — shared class strings (`inputClass`, `labelClass`,
    `primaryButtonClass`, `ghostButtonClass`) so form controls stay consistent.
  - `RoleBadge`, `DashboardNav` — supporting bits.
- New dashboard pages: lead with `PageHeader`, build forms from the shared style
  constants, follow the list/detail patterns in `people`/`organizations`/
  `projects`.

---

## 9. Auth specifics

Two sign-in methods coexist, both via `@supabase/ssr` (sessions live in cookies
the middleware reads). The UI is `components/platform/LoginForm.tsx` (client,
uses the **browser** Supabase client); `app/login` passes the validated `next`.

- **Email + password** (`signInWithPassword` / `signUp`) — the default tabs.
  After success the client does a full `window.location.assign(next)` so the
  server sees the freshly-set cookie. `signUp` returns a session immediately only
  if **"Confirm email" is OFF** in Supabase Auth settings; otherwise it emails a
  confirmation (the form handles both). Password auth sends **no email per
  login**, which is why it exists (magic-link email is rate-limited).
- **Magic link** (`signInWithOtp`) — kept as a fallback ("Use a magic link
  instead"). It round-trips through `/auth/callback`.
- **Existing magic-link-only users have no password.** They set one while
  authenticated via `components/platform/PasswordForm.tsx` →
  `auth.updateUser({ password })` on `/dashboard/profile` (no email involved).
  A failed password sign-in surfaces a hint pointing there.
- **`/auth/callback` handles both** `?code=` (PKCE, browser-initiated login) and
  `?token_hash=&type=` (admin invites and template links, via `verifyOtp`). New
  email-link flows should use the `token_hash` form so they work without a
  browser-side PKCE verifier.
- **Inviting/provisioning users** is a service-role op:
  `getSupabaseAdmin().auth.admin.inviteUserByEmail(email)` (sends an email) or
  `createUser(...)` (silent). To set/confirm a password for an existing account
  use `auth.admin.updateUserById(id, { password, email_confirm: true })`. The
  signup trigger (`handle_new_user`) creates the profile and copies `full_name`
  from `raw_user_meta_data` (pass it via `signUp` `options.data.full_name`).
- **Email templates** are branded HTML in `supabase/templates/`, pushed with
  `npm run email:templates` (Management API, needs `SUPABASE_ACCESS_TOKEN`).
- **Dashboard settings that the CLI can't push**: Auth redirect URLs, Site URL,
  SMTP, the "Confirm email" toggle. Documented in `docs/database-migrations.md`.
  Production needs custom SMTP (built-in email is rate-limited).

---

## 10. Environment & tooling

Env vars live in `.env` (gitignored, server-loaded; `.gitignore` covers `.env`
and `.env*.local`). `NEXT_PUBLIC_*` are inlined at **build** time; the rest are
read at runtime. Never commit secrets, never log keys, never put a secret in a
`NEXT_PUBLIC_` var.

| Var | Used by |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | all Supabase clients |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | browser + SSR auth clients |
| `SUPABASE_SECRET_KEY` | service-role admin client |
| `DATABASE_URL` | Drizzle (transaction pooler, port 6543; use 5432 for migrations) |
| `SUPABASE_ACCESS_TOKEN` | `npm run email:templates` (Management API) |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | public form bot-check |
| `NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN`, `NEXT_PUBLIC_POSTHOG_HOST` | PostHog (§13) |
| `STRIPE_SECRET_KEY` | Stripe server SDK (`lib/stripe.ts`) |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | embedded Checkout in the browser |
| `STRIPE_WEBHOOK_SECRET` | webhook signature verification (per-endpoint; differs local vs prod) |
| `STRIPE_PRICE_CATALYST` / `_ANCHOR` / `_KEYSTONE` | subscription Price IDs (§12) |

Commands:

| Command | What |
|---|---|
| `npm run dev` | local dev on `:8080` |
| `npm run typecheck` | `tsc --noEmit` — run after every change |
| `npm run build` | full Next build — catches client/server boundary errors |
| `supabase db push --db-url "$DBURL"` | apply migrations (DBURL = `DATABASE_URL` with port 5432) |
| `supabase migration list --db-url "$DBURL"` | verify local == remote |
| `npm run db:pull` | introspect live DB (drift check; CHECK-constraint caveat) |
| `npm run email:templates` | push auth email templates |
| `npm run stripe:setup` | create/refresh subscription Products+Prices (idempotent) |
| `npm run stripe:listen` | forward Stripe webhooks to local `/api/stripe/webhook` |

To build `$DBURL` (migrations need port 5432, not the pooler's 6543) without
printing the secret:

```bash
DBURL=$(grep -E '^DATABASE_URL=' .env | head -1 | cut -d= -f2- | sed 's/^["'\'']//; s/["'\'']$//' | sed 's/:6543/:5432/')
```

`supabase db push` emits a harmless `failed to cache migrations catalog … Docker
daemon` warning (it only needs Docker for the local catalog cache); the push
itself still succeeds — confirm with `migration list` showing Local == Remote.

**Before committing:** `npm run typecheck && npm run build` should both pass. The
build is the real check — it's the only thing that catches the client/server
import boundary (§7). The GitHub repo also runs a "Build & typecheck" status
check on push.

**Deploy:** the repo (`github.com/Innovate-Local/website`) is connected to
**Vercel**, which auto-deploys on push to `main` (`innovatelocal.ai`). There is
no local Vercel CLI link — set env vars in the Vercel dashboard (Production), and
remember `NEXT_PUBLIC_*` changes require a **redeploy** to take effect. Request
origins are derived from the request, so nothing hardcodes the domain.

**Debugging live data:** you can talk to the real services with the keys in
`.env` — a throwaway `node --env-file=.env` script using the Stripe SDK and/or
the `postgres` client (DATABASE_URL) is the fastest way to inspect prod state.
Delete such scripts after; never commit them.

---

## 11. Conventions worth keeping

- **Prefer Next server actions / route handlers over Supabase Edge Functions**
  for new backend logic — keep the codebase in one place. (The existing
  `submit-inquiry` edge function predates this.)
- **Service modules** (`lib/platform/*`) own queries + domain logic; pages and
  actions stay thin and call into them. One definition of "what can this user
  see" per entity, reused by every consumer.
- **Reuse, don't duplicate** — shared validation/storage (e.g.
  `lib/platform/resumes.ts`) is used by both public and authenticated paths.
- **Extend the data model forward**: the foundation already has `hubs`,
  `organizations`, `projects`, etc. Most features attach to these rather than
  introducing parallel structures.

---

## 12. Payments (Stripe)

- **Server SDK** is `lib/stripe.ts` (`getStripe()`, lazy, server-only). Domain
  logic lives in `lib/platform/billing.ts`; pure plan config in
  `lib/platform/billing-plans.ts` (client-safe). The webhook is a route handler
  at `app/api/stripe/webhook/route.ts` (`runtime = 'nodejs'`, reads the raw body,
  verifies the signature). Money records are the `payments` / `org_subscriptions`
  tables; credits are granted into the existing `credit_transactions` ledger.
- **Use embedded Checkout Sessions** (`checkout.sessions.create`) for both
  one-time (`mode: 'payment'`) and subscription (`mode: 'subscription'`) flows —
  not raw PaymentIntents/Elements. **Never pass `payment_method_types`** (let
  Stripe pick dynamically). The client renders `<EmbeddedCheckout>` from
  `@stripe/react-stripe-js` with the session's `client_secret`; Stripe redirects
  to the session `return_url` on completion.
- **Fulfillment is webhook-driven and idempotent.** One-time credits are granted
  when the session is paid (guarded by a conditional `pending`→`paid` update on
  `payments`); subscription credits are granted on **`invoice.paid`** (first
  period + renewals), guarded by a unique `stripe_invoice_id`. A webhook that
  no-ops still returns 200, so Stripe won't retry — missed grants need a resend
  or manual (idempotent) remediation.
- **Per-org Stripe Customer**: created on first checkout and stored on
  `organizations.stripe_customer_id`; renewals map back to the org via it. Use
  the Customer Portal (`billingPortal.sessions.create`) for self-service manage.
- **Stripe CLI** (installed via Homebrew). Local webhook secret:
  `stripe listen --api-key "$SK" --print-secret` (or `npm run stripe:listen` to
  forward). Production webhook endpoints are created with
  `scripts/stripe-webhook-setup.mjs <https url>` (prints the `whsec_` to set as
  `STRIPE_WEBHOOK_SECRET` in the host). Subscription Products/Prices are created
  by `scripts/stripe-setup.mjs` (`npm run stripe:setup`).
- **Security**: the sandbox uses an `sk_test_` secret key; for production prefer
  a **restricted key** (`rk_`). Keys stay in `.env` only.

---

## 13. Analytics (PostHog)

- Client-only, initialized in `instrumentation-client.ts` (Next.js 15.3+ runs it
  in the browser automatically — no provider wrapper). Uses the `defaults` bundle
  (autocapture, pageviews, session replay).
- **Session replay also requires a project-level toggle** in PostHog settings —
  the SDK records by default, but nothing is captured until "Record user
  sessions" is on.
- **Identity**: `components/analytics/PostHogIdentify.tsx` (mounted in the root
  layout) ties PostHog identity to the Supabase session — `identify` on sign-in
  (with email/role/name), `reset` on sign-out.
- **Privacy**: masking is currently OFF (everything captured) for testing. Before
  real users, enable input/text masking — this app handles PII (emails, resumes).

---

## 14. Gotchas worth knowing

- **Tailwind alpha on `var()`-hex tokens is broken.** The color tokens are
  `var(--color-x)` holding hex strings, so an opacity modifier like
  `text-inverse-on-surface/70` compiles to invalid `rgb(#hex / .7)` and the
  property is dropped (text falls back to near-black). Use **solid** tokens on
  colored backgrounds. Existing `/30` borders survive only because a dropped
  border color is cosmetic. A real fix would mean RGB-triplet tokens +
  `<alpha-value>` in the Tailwind config.
- **stripe-node pins a recent API version** (2026 `dahlia`), which renamed
  things vs. older docs: embedded Checkout `ui_mode` is `'embedded_page'` (not
  `'embedded'`), and the invoice→subscription ref moved to
  `invoice.parent.subscription_details.subscription` (was `invoice.subscription`).
  Trust the installed `node_modules/stripe` types over external docs.
- **Client/server boundary** (§7) is the most common build break — a `'use
  client'` file must not transitively import `lib/db`. Keep pure constants
  (statuses, labels, plan config) in their own no-server-import modules.
- **zsh quirks** when scripting: `timeout` isn't on macOS; `--include=*.ts` globs
  need quoting. Prefer the dedicated file tools over shell for searches.
