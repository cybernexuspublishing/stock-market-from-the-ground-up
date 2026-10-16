# Authentication & Sensitive-Action Architecture — Controlled Decision

| Field | Entry |
| --- | --- |
| Company / project | Cyber Nexus — The Stock Market: From the Ground Up |
| Document ID | GU-SEC-ARCH-20261015-032-R1 |
| Version | v0.14.0.32-R1 |
| Date | 2026-10-15 |
| File type | Markdown (.md) |
| Drive location | Not established; controlled working copy in `docs/` under project's GitHub repo |
| Status | Source drafted; production approval **PENDING** staging / penetration / regression tests |
| Dependencies | Supabase Auth, Cloudflare Turnstile, owner and staff roles, existing AAL2-dependent PostgreSQL functions, Cloudflare Pages Functions |
| Purpose | Define customer-requested CAPTCHA/password authentication and preserve privilege boundaries without mandatory MFA |

## Decision

- Account sign-in: username/email plus password, email verification as already configured; use Cloudflare Turnstile CAPTCHA validated server-side by Supabase Auth on the actual credential grant. **No mandatory SMS or authenticator MFA.**
- Sensitive administrative writes or private shipping retrieval: within the same logged-in session, complete a **recent password reconfirmation** with a new CAPTCHA token. A Worker asks Supabase Auth to check the account password, but never stores or returns a password or new session token. On success, service_role records the same verified user ID and original JWT `session_id` for **5 minutes** in a table with no browser write/read access.
- Password confirmation is explicitly **less resistant to stolen passwords/phishing than true MFA**; rate limit to 5 failed attempts per 15 minutes per user, require independently configured Supabase Auth CAPTCHA, recommend Cloudflare WAF rate limiting and session anomaly alerts, and keep audit records. There is no misleading assertion of equivalent security.
- Ordinary ADMIN/OWNER Communications reads and notices remain strictly role-scoped but no longer require AAL2. USERNAME directory visibility and message sending remain governed by staff role, member status, disable toggles and audits.
- All financial switches, print/digital catalog mutation, manual signed-book fulfillment and shipping-address reads use the recent-password requirement **at the SQL boundary**, not merely a frontend widget. Existing temporary file policies use role + password confirmation via the owner helper. Regular members, suspended and Showcase users remain ineligible.
- The password recheck is not a session refresh; the original staff JWT is used for authorization. A separate password grant is verified by Supabase Auth, its disposable newly minted session immediately revoked through Supabase Auth logout, new tokens discarded, and a service-role table holds only a short-lived authorization state.

## Database migration safety

`v0.14.0.32R1_CAPTCHA_PASSWORD_RECONFIRM_REVIEW_REQUIRED.sql` is intentionally **staging-only pending owner review**. It checks exactly 13 MFA-dependent SECURITY DEFINER function names found in the supplied 22-row security inventory. Dynamic definitions are derived from installed `pg_get_functiondef()` to preserve other reviewed SQL behavior and replace ONLY direct AAL2 predicates. It stops and rolls back if functions are missing, overloaded, an expected match fails, or an unexpected direct AAL2 dependency exists. It separately guards the digital-book settings save and staff shipping lookup because their previous AAL2 checks were inherited from helper functions. It does not change member RLS table grants, webhook access, Stripe/Lemon payments, or existing report moderation data.

**Known risk:** Updating function bodies dynamically from PostgreSQL catalog text is configuration-sensitive; no production database is available from this environment. A migration may fail safely if the installed definitions differ from the known source. Before production, compare the staging definitions and run the role-negative matrix, simulate concurrent password failures, ensure no stale/forged JWT can obtain access, verify current `session_id` claims, and ensure all protected settings triggers remain active.

Do not perform a blanket `REPLACE('aal2','')`, change the role to `PUBLIC`, disable RLS, grant access to `anon`, or bypass the protected-settings trigger. All such alternatives would create unacceptable privilege-escalation or data disclosure risks.

## CAPTCHA: Cloudflare + Supabase Auth

- Cloudflare Turnstile site key is public; secret key is private.
- Configure CAPTCHA under **Supabase → Authentication → Bot and Abuse Protection** before enabling `ENFORCE_AUTH_TURNSTILE_V135=true` and confirm the frontend loads `turnstile-auth.js` on signup/signin.
- Supabase Auth consumes a Turnstile token **once** during the original login/signup/password grant, via `gotrue_meta_security.captcha_token`. Do not call Siteverify separately with the same token, since tokens are one-time-use (5 minutes).
- This release adds a separate Turnstile challenge to the sensitive-action password reconfirmation dialog. It does not establish a second authentication factor.
- Test standard email login, username login, signup, password reset, blocked/expired token, CAPTCHA service outage, slow network, keyboard-only accessibility, and unsupported browser cases. Do not claim all routes are protected until each is exercised.
- The forum still needs independent bot defense: post/reply/report rate limits, spam controls and appropriate conditional CAPTCHA must be checked separately. Authentication CAPTCHA **alone** does not stop abuse from valid sessions.

## Permission matrix and acceptance conditions

| Actor / state | Read staff Communications | Send direct notice | Change protected controls | View private shipping address |
| --- | --- | --- | --- | --- |
| Active OWNER, normal session | Yes | If role toggle ON | No until recent password + CAPTCHA | No until recent password + CAPTCHA |
| Active ADMIN, normal session | Yes | If Owner enabled ADMIN notices | Cannot change OWNER-only switches | No until recent password + CAPTCHA AND Owner toggle ON |
| Active OWNER/ADMIN after password confirmation | Role-scoped | Role-scoped | OWNER only | Role and toggle-scoped |
| MEMBER / SHOWCASE / SUSPENDED / anonymous | Denied | Denied | Denied | Denied |
| Wrong password / stale or alternate-session JWT | Role-scoped reads only | Role-scoped notices only | Denied | Denied |

Additional mandatory acceptance: 5-minute expiry, 5-failure lockout, replay/reuse tests, concurrency tests, account-email-changed condition, service role credentials never in logs, CSP/CORS, signed file access unchanged, Cloudflare production SHA parity, security review and owner authorization of staged SQL. A successful installation check alone does not establish these conditions.

### Revision history

| Revision | Date | Change |
| --- | --- | --- |
| 1 | 2026-10-15 | Initial no-mandatory-MFA / CAPTCHA-plus-password architecture decision and security requirements. |
