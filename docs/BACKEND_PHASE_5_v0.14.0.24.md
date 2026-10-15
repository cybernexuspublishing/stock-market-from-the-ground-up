# Backend Phase 5 — v0.14.0.24 — Audited Market Commons report-case workflow

| Document field | Value |
| --- | --- |
| Project | The Stock Market: From the Ground Up |
| Company | Cyber Nexus |
| Source baseline | GitHub `main` at `e4e6ddb8d41f9378ecf0471715ab713497c2e370` (v0.14.0.23) |
| Release | v0.14.0.24, direct-upload source overlay |
| Document control | GU-WEB-BE-20261015-005, rev. 1 |
| Date | October 15, 2026 |
| Migration | Optional, additive, **OWNER REVIEW REQUIRED** |
| SQL execution | NOT performed in preparation |
| Production approval | **NOT RECORDED**; source only, not live-role acceptance |
| Google Drive | Not uploaded; no Drive ID assigned |

## Findings and concrete implementation

**BE24-001 (P0, incomplete report workflow).** The standard Admin Community reports display only a **Resolve** button next to the more capable, separate topic moderation editor. `functions/api/admin.js` offers several report statuses but performs report PATCH then independent audit, so audit failures may occur after an irreversible status change. The v0.14.0.24 **separate** moderated case manager supports Start review, Resolve, Dismiss and Owner-only Reopen with mandatory 10–500-character reasons. It does not silently replace or change the legacy report route. New case actions are implemented through a **single PostgreSQL transaction**, with row-level `FOR UPDATE`, expected-status precondition and mandatory `admin_audit_log` insertion. An audit failure rolls back the action. The interface shows live server state and reloads after successful actions.

**BE24-002 (P0, browser vs server authorization).** `functions/api/admin-report-cases-v01424.js` forwards the requester's **real Supabase JWT** to purpose-built RPCs. It does not hold a service-role credential or accept an actor/user ID. SQL independently checks `auth.uid()`, production member account kind, suspended/restricted flags, active OWNER role or active role with explicit `forum.moderate` permission, and SHOWCASE_VIEWER prohibition. Private authorizer function is not executable by `authenticated` or `anon`; public case functions are executable by `authenticated` only. Those grants alone are not authorization; the SQL permission gate is mandatory.

**BE24-003 (P1, race/duplicate decisions).** Report state transition locks the report row and verifies an `expectedStatus`; any stale writer gets an explicit conflict. Browser failures do not auto-retry POST. Reviewer must reload before submitting another action. Reopening a closed case is Owner-only. No direct report table privilege changes occur.

**BE24-004 (P1, accurate UX).** Admin > Market Commons gains an additive case-management card, retaining all pre-existing report views and moderation controls. Uses `textContent` for untrusted details, keyboard focus indicators, paginated 25-record list, no private reports loaded before the Community panel is opened, and fail-closed error text if SQL is not installed.

## Engineering and security limits

- **IMPORTANT: Existing legacy moderation APIs are NOT automatically made transactionally auditable.** `functions/api/admin.js`, `functions/api/admin-v0133.js`, and `functions/api/admin-forum-actions.js` still contain independent database-update + audit calls; some paths swallow audit errors. Do not claim global moderation audit integrity. Migrate these calls carefully in a later release following role and concurrency tests.
- The new case manager changes the report's review **status only**. Hide, edit, delete, lock, restore or pin are distinct existing content-moderation operations. Case dismissal does not delete a forum post.
- The installed v0.14.0.17 reporting quota policy was **not independently verified** by the owner screenshots and is not installed by this release. Quotas remain a separate backend release gate.
- The new SQL takes no market trading action and does not access premium learning answers, financial accounts, checkout, or external services.
- Authenticated SQL RPC privileges and roles **must be tested in staging** with OWNER, ADMIN/MODERATOR with/without `forum.moderate`, normal member, SHOWCASE/TEST, restricted/suspended, expired staff, anonymous; verify editor visibility is irrelevant to server authorization.
- Server-side administrative MFA AAL2 rollout may be separately enforced by existing Cloudflare endpoints, but this new direct JWT-bound SQL RPC does not use `REQUIRE_STAFF_AAL2_V135`. If MFA is mandatory for report review, add a database-verifiable AAL2 requirement before approving the migration (and stage test it). Do not assume frontend/Cloudflare-only MFA gate controls direct RPC access.
- Live Cloudflare deployment SHA parity, staff penetration/E2E, report-retention and appeal rules, and historical moderation-audit repair remain open.
- This is not full-site backend completion: billing/refunds, reports quota, user blocks/harassment protection, advanced polls/uploads, KDP/entitlements, Market Simulator, Journal, AI Tutor, GWS, all 419 lab content and dataset rights require separate backend evidence.

## Release and verification sequence

1. Upload the direct source overlay to the EXISTING GitHub repo. Do not delete or replace unrelated source. No SQL runs automatically and the SQL file must not be deployed into `public/`.
2. Confirm `Backend Contract v0.14.0.24`, `Backend Contract v0.14.0.23`, Sitewide Governance and Frontend Contract Gate pass. Fix failures; do not bypass required checks.
3. On an isolated staging Supabase DB, run `supabase/admin/v0.14.0.24_MODERATION_PREFLIGHT_READ_ONLY.sql`. Verify table/column prerequisites and known report statuses; stop if anything differs.
4. Owner reviews migration, authorizer, grants, MFA requirement, audit semantics and organizational moderation process. Stage migration and run `supabase/admin/v0.14.0.24_MODERATION_POSTFLIGHT_READ_ONLY.sql`.
5. Verify anonymous cannot EXECUTE (FALSE/FALSE), authenticated SQL EXECUTE exists (TRUE/TRUE), helper isn't directly callable, SQL authorizer disallows nonstaff users, and existing privileges/records are preserved. Confirm required audit entry appears whenever case transition commits, no entry/row change on stale/conflicting attempt, and no entry on unsupported status.
6. In staging, test Admin/Market Commons case UI using two valid staff sessions, status transitions, duplicate tabs, required note, Owner-only reopen, report linked content inspection, and no data exposed to ordinary members. Confirm older moderation flows still operate as before.
7. Request explicit production migration authorization only after evidence; run read-only postflight again. Do NOT rerun v0.14.0.20, v0.14.0.21 or v0.14.0.23 migrations.

**Source test scope:** Node syntax, mock JWT/proxy role/error cases, static SQL source assertions and previous release regression suites. These do NOT compile or run PostgreSQL functions on production, prove actual Cloudflare routing, authorize the migration, or certify full backend security.
