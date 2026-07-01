# Community Innovation Partner (CIP) Portal — build plan

> **Status: COMPLETE (2026-07-01).** All phases built; typecheck + build green; migration applied (Local==Remote); aggregation SQL verified against the live DB. See the CIP section in the platform-foundation memory for specifics. Follow-ups: set a Resend-verified `EMAIL_FROM` domain; consider the deferred approval queue + automated expiry reminders.

Turns `Kish_Innovation_Credits_Portal.html` into a functional, integrated portal in
the InnovateLocal platform. A **Partner** (e.g. Kish Bank) gets an annual credit
allocation for a cycle, assigns credits **internally** to its departments and
**transfers** them **externally** to regional orgs (business / nonprofit /
municipality / chamber). External recipients get an **emailed redemption code**
and redeem via a public landing page. Every movement is logged to a partner
ledger; redemptions are tracked against engagements/projects; Settings holds
partner details, authorized users, and policy (limits + expiration window).

## Decisions (confirmed with user)
- **Recipients:** free-form records; auto-link to a platform `organizations` row when name/email matches.
- **Email:** real send via **Resend** (`RESEND_API_KEY` in env — currently misspelled `RESENED_API_KEY`, to be fixed). Reusable send utility + branded templates; safe no-op in dev if key missing.
- **Governance:** store roles (admin/approver/drafter) + policy limits + expiration window as real editable settings; enforce **simple per-role transfer limits**; defer the full drafter→approver→dual-signoff approval queue.
- **Architecture:** new integrated CIP module (new tables + `/dashboard/partner`), reusing existing patterns/components; link to platform orgs where possible.

## Data model (new migration `*_community_innovation_partners.sql`)
- `partners` — org_id (FK, unique), tier, annual_allocation, cycle_start/end, footprint, redemption_window_days, drafter_limit, approver_limit, dual_signoff_threshold, status.
- `partner_members` — partner_id, user_id, partner_role (admin|approver|drafter). unique(partner_id,user_id).
- `partner_recipients` — partner_id, kind (business|nonprofit|municipality|chamber|internal), name, contact_name, contact_email, relationship_manager, linked_org_id (FK nullable).
- `partner_credit_events` (ledger) — partner_id, recipient_id (nullable), event_type (allocation|assign|transfer|redeem|reclaim), amount (+), engagement_key, redemption_type, project_id (nullable), project_label, status, code_id (nullable), authorized_by, authorized_by_name, note, event_date.
- `partner_redemption_codes` — partner_id, recipient_id, code (unique), amount, remaining, engagement_suggestion, message, relationship_manager, expires_at, status (issued|partially_redeemed|redeemed|expired|reclaimed).
- RLS: partner members read their partner's rows; `is_staff()` all. Writes via server code.
- Derived: recipient.assigned = Σ(assign+transfer) − Σ(reclaim); redeemed = Σ(redeem); partner available = annual_allocation − committed.

## Tasks
### Phase 1 — Data + service layer
- [ ] 1.1 Migration: 5 tables + indexes + RLS; apply via `supabase db push`.
- [ ] 1.2 Mirror tables in `lib/db/schema.ts` (+ inferred types).
- [ ] 1.3 Pure constants `lib/platform/partner-constants.ts`.
- [ ] 1.4 Service `lib/platform/partners.ts` — reads (partner-for-user, overview/metrics, recipients, ledger, redemptions, members) + mutations + code gen/lookup.

### Phase 2 — Email (Resend)
- [ ] 2.1 Fix env key `RESENED_API_KEY`→`RESEND_API_KEY`; add `EMAIL_FROM`; doc it.
- [ ] 2.2 `lib/email.ts` — lazy Resend client + `sendEmail`; no-op+log when unconfigured.
- [ ] 2.3 Branded templates `lib/emails/partner.ts` — external transfer, internal assignment, (stub) expiration reminder.

### Phase 3 — Server actions
- [ ] 3.1 `app/dashboard/partner/actions.ts` — assignInternal, transferExternal, adjustAllocation, invite/setPartnerMemberRole, updatePartnerPolicies, updatePartnerDetails.
- [ ] 3.2 `app/dashboard/partners/actions.ts` (staff) — createPartner, updatePartner.
- [ ] 3.3 `app/redeem/[code]/actions.ts` — redeemCode.

### Phase 4 — Member console UI (`/dashboard/partner`)
- [ ] 4.1 Server page: load partner + tab data, gate, pass to client console.
- [ ] 4.2 `PartnerConsole` client: tabs + toasts.
- [ ] 4.3 Overview: metrics, action tiles, allocation chart, recent activity.
- [ ] 4.4 Recipients: filters + search + table + Add/Reclaim.
- [ ] 4.5 Ledger: filters + search + CSV export.
- [ ] 4.6 Redemptions: summary + table.
- [ ] 4.7 Settings: details, users (invite/role), policies (editable).
- [ ] 4.8 Modals: Assign Internal, Transfer External (live preview), Adjust/Reclaim.

### Phase 5 — Staff management (`/dashboard/partners`)
- [ ] 5.1 List + create-partner form.
- [ ] 5.2 `[id]` detail: allocation/cycle edit, metrics, members.

### Phase 6 — Public redemption (`/redeem/[code]`)
- [ ] 6.1 Public page + redeem form.

### Phase 7 — Integration + polish
- [ ] 7.1 Nav: "Partner Console" (partner members) + "Partners" (staff), conditional in shell.
- [ ] 7.2 Home quick-links.
- [ ] 7.3 `npm run typecheck && npm run build` green.
- [ ] 7.4 Update memory + docs.
</content>
