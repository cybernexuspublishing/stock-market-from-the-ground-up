# Unified Admin Control Center — Operational Dashboard and Navigation Release Record

**Project:** The Stock Market: From the Ground Up  
**Document ID:** SMFGU-ADMIN-IMPL-002  
**Filename:** docs/admin/SMFGU-ADMIN-IMPL-002-v1.0-20261026.md  
**File type:** Markdown (.md)  
**Version:** 1.0  
**Status:** Source implemented and Cloudflare production deployed; authenticated browser acceptance **PENDING**  
**Date:** October 26, 2026  
**Controlling specification:** SMFGU-ADMIN-MASTER-001 v1.0  
**Audit prerequisite:** SMFGU-ADMIN-AUDIT-001 v1.0  
**Branch:** main  
**Production project:** https://stock-market-from-the-ground-up-d1r.pages.dev/  
**Google Drive folder / document ID:** Unassigned. New repository-controlled implementation report; no Drive document was created.  
**Dependencies:** Existing /api/admin?action=dashboard authorization and REST service boundary, Admin module registry, Supabase project oxihglyfgzywsupnyicb, Cloudflare Pages, GitHub Actions, authenticated Owner browser session.  
**Purpose:** Preserve the source changes, review results, limits, and acceptance evidence for the first Admin foundation/dashboard implementation increment.

## Change record

| Area | Original authoritative location | Implemented | Commit |
|---|---|---|---|
| Server dashboard data | functions/api/admin.js | Bounded, role-scoped work records for unreviewed instruction, draft assessments, open forum reports, unresolved support; recent audit events restricted to audit.view. Source failure is reported as unavailable, not zero. | fdc1c2c |
| Snapshot distribution | assets/js/admin.js | Existing dashboard event includes authorized queue, recent audit activity, and permission metadata. | fa509d7 |
| Work queue and timeline | assets/js/admin-dashboard-widgets.js | DOM-safe record listing, timestamps, severity/status, module drill-down, audit chronology and source-unavailable notice. No additional browser fetch. | ab23b77 |
| Sidebar composition | assets/js/admin-navigation.js | Eight functional presentation groups, existing node handlers preserved, unclassified installed controls retained, collapsible navigation with aria-controls/aria-expanded. | b4e0069, 9395be5, a7b09bd |
| Responsive styling | assets/css/admin-navigation.css; assets/css/admin-dashboard-widgets.css | Sidebar collapse and mobile-readable work record/timeline styles. | 7c48bab, 1de0fc4 |
| Existing chart action | assets/js/admin-dashboard-widgets-core.mjs | Corrected catalog action to the real Products panel. | fb5c4d7 |
| Competing preview entry | admin.html | Removed the read-only preview shortcut from production Admin navigation; existing preview route and source remain intact for reference. | b02c6ab |
| Automated coverage | tests/test_admin_operational_dashboard_v1.mjs; .github/workflows/deployment16-admin-shell.yml | Added mocked REST-provider integration exercising anonymous denial, role scoping, record integrity, source failure, sanitized audit display, and chart route; integrated into the existing Admin CI. | 27402dc, d46140a |

## Authority and data protection

- This release adds no privileged mutations, migrations, payment activations, checkout, membership edits or LIVE financial transactions.
- Queue results are only retrieved for the corresponding existing privileges (content.view / learning.manage; forum.view; users.view); audit events require audit.view.
- The server excludes raw ticket descriptions, protected questions and answers, and raw audit details from dashboard payloads.
- Owner navigation customization continues to be presentation-only and does not override backend access.
- Existing main Admin page and backend controllers are retained. The read-only unified preview is not a production management replacement.

## Release verification evidence

- Cloudflare Pages project production deployment **a6859e04-7244-4290-ad43-b0127b3f6fba**, git commit **d46140a5bf7e264103f9cdfb58d7cd32d0e6417e**, production deploy stage **success** (2026-10-26 19:38:55 UTC).
- GitHub Actions **Deployment 16 Unified Admin Shell — Stages A and B**, run **40388523844**, result **success**. Includes the added mocked operational-dashboard integration test and existing Admin gates.
- Other relevant source CI at inspection: Frontend Source Contract Gate, Sitewide Engineering Governance, Founding 600 Source & Security Gate, and Backend Contract v0.14.0.30 **success**.
- At the 2026-10-26 19:40 UTC inspection, 19/26 commit workflows passed, 7 were still in progress, and none had reported failure. This is a time-bounded observation, not a final CI declaration.

## Explicit acceptance boundaries

1. **Record action limitation:** The new queue opens the existing applicable management section; it does not yet deep-link every specific ticket, assessment, or report. Requirement for opening selected record directly is NOT ACCEPTED.
2. **Navigation verification:** Grouping and collapse are source-implemented; keyboard, focus, screen-reader, viewport (390, 900, 1280, 1440 px), and authenticated Owner/assigned-role browser acceptance remain PENDING.
3. **Dashboard completeness:** KPI counts, work records and snapshot comparisons are useful and real-source-backed; historical time-series, true conversion, acquisition traffic, verified revenue, and full system health must use separately validated data sources. Do not fabricate or label source-less measures as zero.
4. **Staff separation:** Unit/integration tests use mocked backend transport; acceptance with real delegated staff and authenticated Owner remains PENDING.
5. **Source freshness:** Dashboard shows response time and individual record time where provided, but source-level SLAs and end-to-end reconciliation are not yet verified.
6. **Other modules:** Existing member, learning, commerce, community, publishing, support, and security functionality remains governed by the original implementation matrix; this increment does not certify their completion.

## Security advisor snapshot and remediation constraints

Supabase Security Advisor on 2026-10-26 returned:
- **8** anonymous-executable SECURITY DEFINER function warnings.
- **85** authenticated-role executable SECURITY DEFINER function warnings.
- **136** RLS-enabled tables without policies (informational; many tables use service-only access).
- **1** leaked-password protection warning.

Some anonymous functions intentionally support storefront availability or account-entry checks; **email_is_available** and **username_is_available** provide account-existence signals and warrant a privacy/rate-limit review. The public book-key claim preparation endpoint warrants purpose-specific review. No broad REVOKE or function conversion was performed because it could disable existing website workflows. Apply least-privilege improvements individually after usage/dependency review and isolated tests.

References:
- https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable
- https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable
- https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection

## Next implementation and acceptance gates

1. Complete authenticated Owner, delegated staff, and guest browser verification at 390, 900, 1280, 1440 px; include keyboard, menu collapse, permissions, forms and failure states.
2. Add record-specific deep links or selected-record inspectors only after the target modules support stable, verified IDs and backend permission enforcement.
3. Complete executive header/global authorized search, operational source health checks, live notification queue, trustworthy time-series, and meaningful release/CI drill-down.
4. Resolve any remaining GitHub CI failures by root cause, not by deleting assertions.
5. Review privileged database functions individually, including actual callers, RLS, rate limiting, and regression paths; document decisions.
6. Audit and accept each management module against the 12-condition definition of done. No LIVE Stripe test transactions without new Owner authorization.

## Revision history

| Version | Date | Description | Acceptance |
|---|---|---|---|
| 1.0 | 2026-10-26 | First production-deployed operational dashboard and navigation consolidation release record | Source and automated checks confirmed; authenticated acceptance pending |
