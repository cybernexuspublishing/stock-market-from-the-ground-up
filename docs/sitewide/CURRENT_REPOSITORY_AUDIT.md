# Current Repository Baseline and Defect Register — Initial Audit

**Project:** The Stock Market: From the Ground Up  
**Product scope:** Entire website, including Owner/Administrator/Moderator/Member/Public and Grant Web Solutions tools.  
**Audit performed:** 2026-10-14  
**Source:** GitHub connector, `cybernexuspublishing/stock-market-from-the-ground-up`, branch `main`  
**Read-only commit ID:** `fd378aa221a4e352c08e797617d262127e87348a`  
**Commit timestamp:** 2026-10-14T21:22:12Z  
**Commit label:** `v0.14.0.17` / `v0.14.0.17_Rich_Text_Forum_Announcements_Complete_Files`  
**Deployment:** NOT initiated, not observed, and not certified by this audit.  
**Supabase production:** No live SQL inspection was executed for this audit.  
**Status:** Development baseline audit; not a completed production security, architecture or accessibility audit.

## Inspected repository structure

The GitHub `main` recursive tree contained 556 blob files across 581 entries (including directories): 70 HTML, 158 JavaScript, 31 CSS, and 72 SQL files; 46 Cloudflare API Function files, 34 migration files, 37 admin SQL files and 55 files matching test naming patterns. No `.github/workflows` file was present at the inspected commit. A tree inventory is not a line-by-line audit of all implementation files; several critical files were additionally read directly.

**Files directly inspected:** `PROJECT_ADVANCED_ENGINEERING_RULES.md`, `PROJECT_MANIFEST.json`, `scripts/build-pages.sh`, `assets/js/site.js`, `assets/js/forum-composer.js`, `functions/api/commons-report.js`, `admin.html`, `index.html`, `_headers`, `_redirects`, `sw.js`, and repository tree metadata. Related legacy release files supplied in earlier local ZIPs were *not* treated as up-to-date source because their Git blob hashes differ from current GitHub `main`.

## Verified findings and follow-up requirements

| ID | Severity | Observation supported by current repository | Required resolution / acceptance test | Status |
| --- | --- | --- | --- | --- |
| V-001 | P0 release integrity | GitHub `main` HEAD identifies itself as v0.14.0.17 while `PROJECT_MANIFEST.json` still reports `version: 0.14.0.16`, and `admin.html` application meta tag also says v0.14.0.16. | Reconcile the version with the actual deploy history; update manifest and document release commit. Preserve current branch rather than overlaying an earlier archive. | Open; no write |
| V-002 | P0 security / release | Current `scripts/build-pages.sh` explicitly blocks private `data/interactive-labs.json`, builds a public output allowlist, and public private-data file was absent from Git tree. | Preserve block; assert it in every GitHub build, verify public output is free of private SQL/source. | Existing control verified in source; proposed CI added |
| V-003 | P0 community moderation | Current `functions/api/commons-report.js` returns one generic failure for duplicate reports, exhausted quota and other RPC failures. The current API validates account kind, signed session, visibility and backend RPC, but error-specific diagnostics are inadequate. | Review installed RPC, implement stable safe error codes, test duplicate/quota/unknown failure and enforce quota configuration in database. | Open |
| V-004 | P0 governance | Current GitHub tree has no automated GitHub workflow. Existing tests exist, but running and gate coverage cannot be inferred from filenames. | Add read-only governance CI and authenticated integration/release gates, validate Cloudflare build. | Governance CI supplied by this add-only package; deployment untested |
| V-005 | P0 admin permissions | Current repo has Owner/Moderator/Admin components, but this audit does not certify end-to-end account privileges, SQL grants or live session access; Owner quota overrides are not confirmed as implemented. | Verify permission matrix, backend enforcement, DB policies and audited settings; ensure generic Admin settings writes cannot bypass Owner-only controls. | Blocked by live schema verification |
| V-006 | P0 learning | The approved lab identifier count is 419 according to the current manifest, but this audit did not independently load authenticated answer keys or verify end-to-end no-lookahead sessions. | Compare indexed catalog IDs, verify server-owned reasoning/answer keys, prevent entitlement bypass and historical future leakage. | Requires integration testing |
| V-007 | P0 user content | Current `assets/js/forum-composer.js` supplies rich formatting and safe rendering logic, but safe client-only rendering does not certify server-side sanitization or user mention identity resolution/notification lifecycle. | Threat-model XSS, validate server-side content boundaries, test mentions with real identities, opt-out, privacy, abuse limits. | Open |
| V-008 | P1 site design | The existing public, Member, Owner, Market Commons and course styles vary; no full viewport/accessibility visual regression was executed. | Establish shared design tokens, component contracts and actual browser/keyboard tests without removing approved features. | Not tested |
| V-009 | P1 educational integrity | Book, skills, teaching rubrics and trading-simulator features are represented in source, but financial data provenance, actual historical correctness and reviewer-approved scoring cannot be certified from repository paths alone. | Validate content source, timestamps, answer keys, replay honesty, paid/free entitlements and realistic paper trading expectations. | Requires subject-matter and backend review |
| V-010 | P1 business compliance | `assets/js/site.js` preserves `kdpSelectExclusive` digital-sales locking. Payment state, webhook lifecycle, live prices and subscriptions were not tested. | Keep KDP switches; verify payment provider callbacks, plan disable/visibility controls and existing entitlements before paid launch. | Not tested |
| V-011 | P1 release reconciliation | The uploaded older `v0.14.0.4_COMPLETE_REPOSITORY(1).zip` and `stock-market-from-the-ground-up-main.zip` do not match current blob SHAs for key source files. | Do not issue a "complete updated repository" fabricated from those archives. Obtain the exact current revision or create an add-only/rebaseable overlay until it is available. | Enforced for this package |
| V-012 | P2 future readiness | Several advanced requirements are feature candidates; PostgreSQL/Cloudflare architecture remains the approved low-cost foundation. | Measure pain points and reject novelty-only microservices, new DB engines, AI/ML or paid services unless justified. | Policy added; individual evaluations pending |

## Initial decisions made

**D-001 — Apply Owner rule specifications as current development policy.** Preserve the two source texts without abridgment, add clear agent entry points, trace every requirement, and add automated integrity checks. This initial implementation does **not** grant new live admin privileges or change prices, memberships, user data, SQL permissions, or deployed software.

**D-002 — Do not silently resolve live version mismatch.** The latest directly inspected GitHub source is v0.14.0.17, despite the older project manifest. The User has described v0.14.0.17 as not yet deployed. Verify the deployment before editing current version labels; do not confuse GitHub commit state with Cloudflare production deployment.

**D-003 — One secure implementation per domain.** Existing identity/entitlement, forum, notifications, teaching tools and administration services should be inspected and extended rather than blindly copied, replaced or duplicated.

**D-004 — No broad live write without contract verification.** No SQL migration, GitHub push, Cloudflare deployment, member data write or payment change was performed in this stage.

## Engineering workstream order

**P0:** Establish rules + immutable baseline; scan real source and public output; audit sensitive data and RLS grants; reconcile release; fix report quota/duplicate diagnostics; install actual policy-backed Owner settings with audited role guards; restore critical community and account workflows; run live read-only preflight and staging acceptance; verify payment/entitlement safety.

**P1:** Consolidate design system without regression; complete accessible editor and mentions; server-side uploads with quarantine; polls/thanks/notifications/revisions; educational labs with verified answers and no-lookahead; adaptive teaching and member learning workflows; staff content operations; validated source data and analytics.

**P2:** Optimize search, safe personalization, automation, observability, DR drills, accessibility audits and advanced UX; prioritize proven low-cost solutions and measurable outcomes.

This is a sequencing/verification control, not an authorization to disable approved functionality or defer mandatory deliverables silently.
