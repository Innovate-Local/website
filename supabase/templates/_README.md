# Supabase auth email templates

Branded HTML for the six GoTrue auth emails, matching the site's Modern Bureau
look (bone surfaces, ochre primary, serif headlines, 0px corners). Email-safe:
table layout, inline styles, web fonts with Georgia/Helvetica fallbacks.

## Link strategy

All link-based templates point at our own app with a `token_hash`, which
`app/auth/callback` verifies via `supabase.auth.verifyOtp`:

```
{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=<type>
```

This is the Supabase-recommended pattern for server-side (SSR) auth and works
even when the link is opened on a different device than it was requested from
(no PKCE verifier needed). `reauthentication` is the exception — it shows the
`{{ .Token }}` code for the user to type.

| File | GoTrue type | `type=` param |
|------|-------------|---------------|
| `confirmation.html` | Confirm sign up | `signup` |
| `invite.html` | Invite user | `invite` |
| `magic-link.html` | Magic Link / OTP | `magiclink` |
| `email-change.html` | Change email | `email_change` |
| `recovery.html` | Reset password | `recovery` |
| `reauthentication.html` | Reauthentication | (code, no link) |

> `recovery` logs the user in and lands them on `/dashboard`. If you add
> password auth later, point `next` at a password-reset page instead.

## Applying them

**Programmatic (recommended):** `npm run email:templates` — pushes all six to the
linked project via the Supabase Management API. Needs a personal access token in
`SUPABASE_ACCESS_TOKEN` (create at https://supabase.com/dashboard/account/tokens).
The script does a partial update of only the mailer fields, so it won't touch
other auth settings.

**Manual:** copy each file's contents into Supabase → Authentication → Email
Templates, and set the subjects from `scripts/push-email-templates.mjs`.
