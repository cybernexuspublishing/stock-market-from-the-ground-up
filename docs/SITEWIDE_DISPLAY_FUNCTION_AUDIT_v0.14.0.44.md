# v0.14.0.44 — Sitewide Display, Functional Contract, and Owner Roadmap Audit

| Document control | Value |
| --- | --- |
| Company / product | Cyber Nexus / The Stock Market: From the Ground Up |
| Project | Companion Learning Platform website |
| Document ID | GU-WEB-AUDIT-014044-20261017 |
| File type and location | Markdown; `docs/SITEWIDE_DISPLAY_FUNCTION_AUDIT_v0.14.0.44.md` |
| Google Drive location / ID | Not created; no Drive copy claimed |
| Date / version | 2026-10-17 / v0.14.0.44 |
| Status | Source review and automated-test candidate; NOT production-certified |
| Source baseline | Current GitHub `main` v0.14.0.43 `d9fef34fcf5d12a7c49b6cd37b8220ba393c2c46` plus Owner feature branch |
| Production deployment SHA | Not authenticated or independently verified |
| Dependencies | Cloudflare Pages build / live deployment, Supabase Auth and RLS, Stripe sandbox, existing migrations, actual role-based browser testing |
| Purpose | Identify why the Owner menu item is absent, correct manual CAPTCHA initiation, trace functionality and remaining production acceptance without falsely declaring all website features operational. |

## 1. Confirmed source/screenshot defect: missing Owner dropdown destination

**Finding P0-O01 — Not deployed:** the Owner screenshot shows the role badge and the canonical account menu but no Website Development Roadmap link. The cause is that the previous roadmap implementation was left in an **open DRAFT pull request (#4)** and was not merged into the production branch. Absence is expected until the branch is merged and Cloudflare actually deploys that commit. Signing in again or clearing the cache cannot add a link that is not deployed.

**Corrective source change:** `assets/js/navigation.js` appends an Owner-only `/owner-roadmap.html` item to the canonical desktop username dropdown and mobile menu; `assets/js/route-policy.js` classifies it as staff-protected. The Owner API verifies the actual authenticated Supabase account, active OWNER role, eligible account kind and account status. Profile menu scrolling is constrained to viewport height to prevent hiding the new destination and Sign Out on short screens.

**Acceptance:** In the exact deployed release, one Owner sees exactly one Roadmap destination; ordinary ADMIN, MODERATOR, MEMBER, TEST/SHOWCASE accounts see zero; a direct API request by a non-Owner is rejected, and Owner status updates persist across reloads.

## 2. Confirmed source defect: automatically executed human verification

**Finding P0-A01:** `assets/js/turnstile-auth.js` previously called `turnstile.render()` on page initialization with `appearance:'interaction-only'` and the default automatic execution behavior. A legitimate visitor could be verified without clicking a visible control, contrary to the owner's updated preference. Cloudflare Managed Turnstile may still complete its *risk check* without showing an additional visual puzzle after the user deliberately starts it. That behavior is a provider decision, not proof of a text-entry CAPTCHA.

**Corrective source change:** Sign In and Create Account display an accessible, initially unchecked **Start human verification** checkbox. No widget is rendered or executed until the visitor activates the checkbox. `execution:'execute'` and explicit `turnstile.execute()` defer token generation; `appearance:'always'` makes the challenge visible after initiation. The Continue/Sign In/Create Account button is disabled while verified token is absent, and tokens are reset after use, expiry or rejection. The checkbox **never replaces** Cloudflare/Supabase server-side validation. Duplicate CAPTCHA integrations remain blocked. Password reset and username-login routes retain server verification.

**Acceptance:** Mock-browser test verifies zero challenge renders/executes on load, one widget when clicked, valid token delivery to Supabase Auth, single use, expiry/retry behavior and no duplicate widgets. Also test actual Cloudflare site key + Supabase secret integration with human users before production sign-off. Cloudflare provider configuration cannot be inferred solely from source.

## 3. Scope and source inventory

The source-side verification includes the sitewide `scripts/audit_frontend.py` inventory of **every source HTML page**, JavaScript parse checks, CSS inventory, static resource references, missing local pages, duplicate element IDs, missing labels, and manual-review inline handlers. The exact counts and individual issues are exported as the `owner-roadmap-v01444-static-audit` CI artifact; counts must not be invented before the CI run is complete. The automated tests also run the existing 77-step release register's selected source contracts.

The Owner registry preserves **281 primary tasks** and **1,815 master/advanced source-line entries**, 2,096 records total. It preserves historical wording while allowing Owners to record actual progress and evidence; source-level or Owner-checked completion is not automatic production certification.

## 4. Sitewide application readiness assessment (not a live pass)

| Workstream | Repository evidence | Live acceptance status |
| --- | --- | --- |
| Public homepage, navigation, responsive header | HTML/CSS/JS and shared navigation owners exist | Owner screenshot shows previous release, not new menu. Real multi-device audit incomplete |
| Sign-in, registration, username login and Book Keys | Client and Cloudflare/Supabase functions exist; manual challenge candidate implemented | Real provider settings and login/recovery/signup tests required |
| Member Dashboard, profile, settings, role badges and notifications | Routes/modules present | Multi-role profile data, state, keyboard and notification delivery pending |
| Owner Admin Control Center and pages/editors | Admin controllers, account editor, CMS, branding and policies in source | Each actionable button must be exercised with real Owner permissions and persistence |
| Owner Website Roadmap | 2,096-row private server catalog; API/UI/workflow on feature branch | Not yet merged, deployed, or authenticated in production |
| Market Commons | Topics, replies, quote/rich edit, follows, mentions, reports and admin moderation modules exist | Role/RLS/concurrent abuse, post lifecycle and actual delivery pending |
| Guided Labs, assessments, skills, AI Tutor | 419 Lab catalog metadata, 94 source-authored Foundations labs and learning modules | Remaining editorial rubrics, secure scores, historical evidence licenses and access tests pending |
| Simulator, replay and journal | Existing replay/market-data/journal UI/APIs | Historical provenance, no-lookahead, entitlement bypass, filling model, external licensing not accepted |
| eBook/print Store, My Library, signed books | Channel and rights controls exist | KDP Select state, private downloads, orders, tax/fulfillment and refund cases not completed |
| Stripe Payments & Billing | GU39 sandbox verifier, 8 reported products, backend candidate, newer v0.14.0.43 diagnostic/backup improvements preserved | Eight actual prices, full lifecycle webhook/provider checks and live checkout approval still outstanding; customer checkout remains OFF |
| Security, MFA, Showcase, RLS | Middleware guards, role checks and test candidates exist | Real Supabase RLS, Owner/ADMIN/MODERATOR/SHOWCASE restrictions, secret/exposure and staff-MFA rollout not certified |
| CMS visual builder, automation, monitoring, backup | Some controlled interfaces/drafts exist | Full drag/drop media builder, durable automation runner, 24/7 monitoring, tested database restore not complete |
| Accessibility, SEO, performance and legal disclosures | Styles, metadata, sitemap and public policies exist | WCAG 2.2 AA real devices, indexing, load, privacy/tax/KDP counsel review outstanding |

## 5. Mandatory acceptance evidence before calling everything functional

1. Repository Actions on current SHA must pass; capture static audit artifact and reconcile any missing assets, page destinations, invalid markup and JavaScript errors.
2. Preview deployment must show a new version and a unique Account Roadmap link; test desktop/mobile, short viewport, 200% zoom and keyboard navigation.
3. Test all public, Member, Moderator, Administrator, Owner, SHOWCASE, TEST, blocked and expired scenarios against real Supabase roles and row-level security.
4. Check real signup, human-initiated Turnstile, sign-in using email **and** username, password reset, Book Key application and account-created verification in controlled test profiles.
5. Exercise each Admin action from interface through API, database and audit log. Buttons are not complete merely because they are displayed or clickable.
6. Execute selected forum topic, report, notification, modal, learning, simulator, journal, billing and refunds with provider/staging data, not mock success screens.
7. Verify 8/8 Stripe sandbox Product IDs and 8/8 matching Price IDs against the correct Stripe account; keep live sales blocked.
8. Confirm Cloudflare deployed SHA equals the reviewed GitHub commit and the browser `release-manifest.json`; perform rollback rehearsal. Avoid changing production database schema during this display audit.

## 6. Decisions preserved

Existing Stripe v0.14.0.43 diagnostics, source-backup workflow, eight SKU definition, Owner role policies, 30-minute default session, KDP exclusivity, five canonical books, disabled live checkout, synthetic-only Showcase, review-required Supabase migrations, and approved curriculum remain controlling. No privileged role, paid entitlement, migration, live checkout, book-rights or price switch is altered for this audit.

## Revision history

| Version | Date | Summary |
| --- | --- | --- |
| v0.14.0.44 | 2026-10-17 | Corrected missing Owner menu release gap and manual CAPTCHA initiation; established comprehensive source CI and documented production verification blockers. |
