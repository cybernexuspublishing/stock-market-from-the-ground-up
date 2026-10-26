# Unified Admin — Steps 1–3 Engineering and Acceptance Ledger

**Project:** The Stock Market: From the Ground Up  
**Controlling document:** SMFGU-ADMIN-MASTER-001 v1.0 (October 26, 2026)  
**Document ID:** SMFGU-ADMIN-ACCEPT-004  
**Filename:** docs/admin/SMFGU-ADMIN-STEPS-1-3-ACCEPTANCE-004-v1.0-20261026.md  
**File type:** Markdown (.md)  
**Version:** 1.0  
**Status:** Source and mocked tests partially accepted; authenticated Owner/staff and full sitewide regression **NOT YET ACCEPTED**  
**Prepared:** October 26, 2026  
**Repository / branch:** cybernexuspublishing/stock-market-from-the-ground-up / main  
**Google Drive location/document ID:** Unassigned. New repository-controlled file; no Google Drive file was created.  
**Dependencies:** Cloudflare Pages production and local Functions, Supabase project oxihglyfgzywsupnyicb, source tests, delegated staff credentials/session, GitHub Actions CI.  
**Purpose:** Definitive tracked disposition for Step 1 (CI), Step 2 (RBAC), Step 3 (Admin operational module acceptance). No LIVE payment transaction is authorized by this record.

## Step 1 — Stabilize CI: actual corrections and limits

- Updated `tests/test_v014179_store_visibility_contract.mjs` to verify current fail-closed catalog logic: only FOUNDING_30 / FOUNDING_60 and existing approved books survive offline; upcoming listings require a verified server publication overlay. No hidden standard membership is republished.
- Updated `tests/test_lab_access_rpc_resilience.mjs` to model a newly mandatory authenticated-role lookup without bypassing Showcase/restricted-account controls.
- Added `tests/test_admin_module_role_matrix_v1.mjs` to verify exact ten primary Admin panels, anonymous/Free access denial, Moderator and Support least-privilege reads, Owner/Admin reads, and immediate denial after deletion, suspension or mixed Showcase roles.
- Made the new test and the existing `tests/v01409_admin_registry_security.mjs` mandatory in `.github/workflows/deployment16-admin-shell.yml`.
- **Evidence:** GitHub Actions run 40397014402 (Deployment 16 Unified Admin Shell) passed all three jobs: source security and role contracts; local Pages Functions; production anonymous denials. This is a confirmed scoped pass, not a whole-repository pass.
- **Open:** The same revision's sitewide regression was cancelled by later commits. A stable exact-commit, uncancelled all-workflow acceptance run remains necessary. Do not count cancelled runs as passes or disable failing tests.

## Step 2 — Role-based authorization: source, tests and database findings

Production read-only role-permission inspection confirmed:
- OWNER: 44 effective role permission assignments.
- ADMIN: 42.
- MODERATOR: 9.
- Other specialist roles include COMMERCE_MANAGER, SUPPORT, LEARNING_MANAGER, CONTENT_MANAGER, COMMUNITY_MANAGER, ANALYST, and dedicated technical/security roles.
- Five member profiles were active at the audited instant; two users had active staff-role records. **Counts are not permission test identities and are not evidence of authenticated session acceptance.**
- Anonymous users and ordinary Free accounts have no permission to use privileged Admin APIs. SHOWCASE_VIEWER has a separate intentionally synthetic read-only presentation surface; its assigned control_panel.access does not confer real Owner authority.
- Verified role tests use the Cloudflare Admin handler with simulated Supabase identity, role, status, and permissions. These are **mocked runtime integration tests**, not real-browser role credentials.

**Security correction (Cloudflare):** `functions/api/admin-control-registry.js` now verifies the Owner profile's `deleted_at` field, denying deleted-Owner registry reads and writes. `tests/v01409_admin_registry_security.mjs` covers both cases.

**Security correction (production Supabase):** Applied migration `admin_nav_editor_guard_and_audit_20261026`; version-controlled SQL at `supabase/migrations/20261026_admin_navigation_editor_rbac_audit_v1.sql`:
1. Rejects deleted Owner actors at the privileged RPC itself.
2. Rejects an Owner actor with any concurrently active SHOWCASE_VIEWER role.
3. Writes every successful Admin navigation control mutation to `public.admin_audit_log` atomically, while preserving the existing `site_control_events_v1354` entry.
4. Verified database-function text contains all three controls.
5. Verified function EXECUTE remains **false** for `anon` and `authenticated` and **true** only for `service_role`.

No live account, plan grant, membership status, public price, Stripe transaction, or Server RBAC assignment was modified for this test.

**Blocked:** A real logged-in Owner test and delegated-Administrator/Moderator/Support member browser matrix at 390px, 900px, 1280px and 1440px. No verified browser session is available for the production domain in the connected browser profiles. Pending user-assisted secure sign-in for those QA identities; no passwords should enter chat.

## Step 3 — Admin module-by-module acceptance matrix

**Interpretation:** `Implemented` means a production route/controller is present. `Automated` means relevant source/mock/local regression exists. Neither means the Owner has accepted the end-to-end module. Real role-scoped read/write + visible effect + audit verification are outstanding wherever identified.

| Operational domain | Current evidence | Unfinished acceptance work | Decision |
|---|---|---|---|
| Executive Dashboard and global navigation | Main dashboard and role-filtered operational queue; Cloudflare deployment and D16 regression pass; eight presentation navigation groups | Owner/staff rendering; mobile collapse, focus, record-specific routing, zero/unavailable source distinction | CONDITIONAL |
| Members / Accounts / Identity | `admin.html` users panel, v01353 account editor, source-bound resource grants, authorized read tests | Search, identity restrictions, manual entitlement edit/revoke, records reconciliation and privacy under real Owner/Support sessions | NOT ACCEPTED |
| Roles and Permissions | `admin_role_permissions` role matrix read; atomic Owner-only role change RPC and regression tests | Real delegated role assignment/revocation, permission propagation and audit entry cross-check | NOT ACCEPTED |
| Labs / Curriculum / Academy / Tutor | 419 canonical Labs, production teaching registry, content controls and mocked learning tests | Editorial evidence, question rubric permissions, nine-stage delivery, actual member/author flows, generated progress integrity | NOT ACCEPTED |
| Product Catalog / Books / Store | Existing product and book editors, approved hidden-offer Store tests, Admin direct all-products directory | Owner publication toggles, PDF/EPUB asset lifecycle, storefront consistency and purchase eligibility | NOT ACCEPTED |
| Orders / Payments / Memberships / Sparks | Existing commerce/Stripe shadow and entitlement controllers; signed/no-charge test contracts | Actual authorized billing state, webhook-to-entitlement chain, renew/cancel/refund consequences, ledger reconciliation; no LIVE transaction in this scope | NOT ACCEPTED |
| Community / Founders / Moderation | Forum report and Founder controls installed, moderation authorization routine guards inspected | Authenticated Moderator workflows, report transitions, notices and audit chain | NOT ACCEPTED |
| Website / Announcements / Marketing | Existing settings, forms, announcements and ad/social management controllers | Publish/revert, role-specific editing, preview, no unauthorized offers, analytics source truth | NOT ACCEPTED |
| Support / Notifications / Operations | Support API, operations center and Admin queue implemented; source tests | Real ticket create/assign/reply/close, notification delivery, role access and audit chain | NOT ACCEPTED |
| Audit / Security / System Health | Real `admin_audit_log` retained 68 records on inspection; Admin audit reader and system diagnostics source; nav RPC now central-audited | Validate per-operation before/after audit evidence, actor/date scoping, failure visibility, system and security alert drilldowns | CONDITIONAL |

**Important audit caveat:** A populated central audit table does not prove all current Admin controllers log every relevant change. For example, `functions/api/admin.js` contains a best-effort audit writer. Every sensitive operation must still be independently checked for atomic audit semantics and partial-success handling.

**Database navigation customization:** `admin_control_registry_v01409` contained zero saved rows at inspection; built-in navigation is rendered from installed controls without requiring custom rows. No successful owner customization persistence is claimed until an authorized save/load/reload is tested. Never insert arbitrary defaults merely to inflate the row count.

## Release gates / work remaining

1. Obtain a complete uncancelled `main` CI result. If normal pushes continually supersede one another, run the documented `workflow_dispatch` or isolated rerun path on a fixed SHA. Any failed job must be diagnosed without weakening its intended security or business check.
2. Secure a verified Owner browser profile, then verify real authenticated Owner and delegated Admin, Moderator, Support, ordinary member and guest behavior. Include four viewport widths, keyboard, focus, screen readers, authorized/denied mutations, and exact recorded screenshots/logs.
3. Test each module's critical lifecycle with isolated QA records: load → validate → save → persist/reload → audit → revoke/undo (where supported). Use TEST payment infrastructure only; LIVE transactions require separate Owner instruction.
4. Reconcile audit events across the central ledger and module-specific event ledgers. Ensure sensitive changes cannot report success with an unrecorded audit event, and avoid automatically retrying uncertain writes.
5. Repeat production read-only security advisor/ACL checks after any database changes, and distinguish legitimate SECURITY DEFINER wrappers from permissions defects.
6. Preserve the approved Free-vs-paid entitlement, Founding 600 rules, protected purchases, Sparks expiration and sale toggles unchanged unless separately authorized.

## Revision history

| Version | Date | Change | Status |
|---|---|---|---|
| 1.0 | 2026-10-26 | CI repairs, actual role matrix checks, authenticated-test blockers, production Owner registry guard/audit hardening and 10-module status | Partial implementation acceptance; not unrestricted production acceptance |

**Owner acceptance:** Not requested or presumed. The three steps are underway; completed source/runtime evidence is explicitly separated from unresolved authenticated production workflows.
