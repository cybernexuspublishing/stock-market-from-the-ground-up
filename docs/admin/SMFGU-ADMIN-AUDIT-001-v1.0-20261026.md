# Unified Admin Control Center — Current-State Audit and First Dashboard Correction

**Project:** The Stock Market: From the Ground Up  
**Document ID:** SMFGU-ADMIN-AUDIT-001  
**Filename:** docs/admin/SMFGU-ADMIN-AUDIT-001-v1.0-20261026.md  
**File type:** Markdown (.md)  
**Version:** 1.0  
**Status:** Initial source and infrastructure audit; functional acceptance pending  
**Audit date:** 2026-10-26  
**Controlling specification:** SMFGU-ADMIN-MASTER-001 v1.0, 2026-10-26  
**Repository:** cybernexuspublishing/stock-market-from-the-ground-up  
**Required branch:** main  
**Production:** https://stock-market-from-the-ground-up-d1r.pages.dev/  
**Google Drive location / ID:** Not assigned; this is a new repository document.  
**Dependencies:** Cloudflare Pages project; Supabase project oxihglyfgzywsupnyicb; existing Admin RBAC/API; GitHub Actions; authorized Stripe TEST; authenticated browser acceptance.  
**Purpose:** Identify authoritative existing systems and acceptance gaps before further Admin consolidation.

## Audit methodology and limitations
Read-only inspection of the GitHub main tree and selected high-risk source modules; GitHub Actions workflow jobs and failure logs; Cloudflare production Pages configuration and deployments; Supabase public table inventory, migration ledger, selected aggregate records, and Security Advisor. The 2,129-entry tree was inventoried; this audit did **not** review every file line-by-line or establish authenticated Owner and delegated-user browser acceptance. No LIVE Stripe financial action was performed.

## Authoritative foundations found
- Primary Admin application: admin.html, assets/js/admin.js, assets/js/admin-navigation.js, functions/api/admin.js.
- Read-only alternate Admin prototype: admin-unified-preview.html, assets/js/admin-unified-core-v014156.mjs; **do not** replace live Admin prematurely.
- Legacy operations page: admin-operations.html, functions/api/admin-operations-center-v0135.js.
- Additive dashboard charts: assets/js/admin-dashboard-widgets.js and -core.mjs. Charts are snapshot record bars, not historical trends.
- Database: public profiles, RBAC tables, admin_audit_log, platform_labs, lab_instruction_v014, lab_training_sets_v014, support_tickets, site_orders, site_subscriptions, founder ledgers, digital-book edition records, academy progress, Sparks buckets and spends.
- Cloudflare production Pages project uses GitHub main and scripts/build-pages.sh. LIVE payment-approval flags were disabled during inspection.

## Production data observations (2026-10-26)
| Measure | Observed | Interpretation |
|---|---:|---|
| Lab registry records | 419 | Registry count, not approved readiness |
| Lab instruction records pending review | 177 | reviewed_at IS NULL |
| Assessment-set records in draft | 439 | review_state = draft |
| Active Academy enrollment records | 1 | Enrollment records, not unique completed learners |
| Profile rows | 5 | Accounts, not verified paying members |
| Founder occupied places | 0 | Nonrevoked founder records; shared limit 600 |
| Founder reservations | 0 | Snapshot of nonterminal reservations in inspected database |
| Active support tickets | 0 | Checked actionable statuses |
| Current registered digital editions | 0 | No PDF/EPUB edition evidence |
| Free watchlist records | 0 | Could reflect zero usage |
Approved founder plan data confirmed: FOUNDING_30 $49.99/30 days and 10% purchase benefit; FOUNDING_60 $59.99/60 days and 15% purchase benefit. Database founder checkout, enrollment, and fulfillment were disabled.

## Integration and acceptance matrix
| Workstream | Authoritative source | Classification | Next acceptance requirement |
|---|---|---|---|
| Canonical Admin shell/navigation | admin.html; admin-navigation.js; Admin registry | Implemented; consolidation incomplete | Remove duplication without losing original handlers; authenticated responsive QA |
| Dashboard KPI and attention queue | /api/admin?action=dashboard; admin.js; widgets | Partial; additive correction in this commit | Verify counts and unavailable/error states as Owner |
| Members and delegated roles | /api/admin; profiles; admin roles and permissions | Implemented but unverified end-to-end | Search/paginate; cross-role denial, audit, concurrency |
| Labs, lessons, grading | platform_labs; lab_instruction_v014; lab_training_sets_v014 | Large editorial backlog; not accepted | Individual quality review, 336-Lab initial readiness and 83 Upcoming |
| Talia instructional operations | Tutor modules, editorial tables | Partially implemented/unverified | Reviewed responses, privacy, authenticated teaching flow |
| Founding 600 | Founder tables and receipt logic | Backend exists; release not enabled | Reservation concurrency, payments TEST, member benefits; LIVE owner-only |
| Store, products, memberships | Catalog, overrides, Stripe mappings | Partial; not fully accepted | End-to-end publication-to-fulfillment and hidden SKU protection |
| Crownlight Sparks | Bucket, spend, adjustment ledger and Admin APIs | Implemented; integration acceptance pending | Entitlement/source isolation and adjustment audit |
| Digital books | gu_digital_versions_v014303, upload routes | Format/version schema exists; no current assets | Authorized PDF/EPUB uploads and entitled download testing |
| Community and Founders Commons | forum_* and commons_* | Multiple storage systems; admin consolidation incomplete | Report->action->audit; founder voting policy |
| Support and announcements | support_tickets; site_announcements | Implemented; authenticated workflows unverified | Staff assignment, state changes, member notices |
| Security and observability | Supabase advisor, GitHub CI, Cloudflare deployment | Unresolved warnings and failed gates | Risk-ranked reviews, CI fixes, operations health truth |
| Advertising and marketing | Ad/Social tables and admin modules | Present; operational acceptance unverified | Ownership, privacy, TEST campaign and invoices |
| Free membership | Free Foundations and watchlist tables; preferences | Existing implementation; no measured usage | Member real-session acceptance |
| Compliance/privacy | Legal content, audit and privacy tables | Not legally verified | Jurisdiction-specific counsel review; deletion/retention |

## Known CI and security blockers
- Recent Boot Camp/Lab gates assert the literal phrase “No mastery was awarded.” but production wording differs. Verify educational meaning rather than bypassing intended protection.
- Store browser gate expects a membership tab that newer approved visibility rules may intentionally remove. Reconcile tests with controlling release policy, not by re-exposing hidden offers.
- Admin payment acceptance observed HTTP 503 where 200 was expected; investigate configuration and test harness before marking passed.
- Supabase advisor: 11 anon-executable privileged-function warnings, 88 authenticated-role warnings, leaked-password protection warning, and 136 RLS-enabled tables without user-facing policies. Many service-only tables may deliberately have no user policies; inspect before changes.
- Successful Cloudflare deployment is not proof of authenticated member-flow acceptance.

## First operational improvement in accompanying source commit
The existing authorized dashboard endpoint now exposes additional **source-derived** counts for founder occupancy, Lab editorial review, assessment drafts, active Academy enrollments, support queue, and current digital editions. The existing dashboard presents these as record counts, not revenue, completed learning or confirmed checkout. Priority checks separate positive work items from genuinely unavailable data; missing metrics can no longer silently yield “no alerts.” Existing role checks and navigation remain authoritative. No database migration or LIVE payment change.

## Next release gates
1. Run JavaScript/build/source tests and confirm this commit's Cloudflare production deployment.
2. Perform authenticated Owner/Admin/browser verification at 390, 900, 1280, and 1440 px.
3. Verify the added dashboard sources and drill-down actions with backend authorization and unavailable-service simulation.
4. Resolve the known Lab, Boot Camp, Store and payment CI failures by root cause.
5. Extend dashboard detail filters and real-time work queues, then consolidate duplicated Admin screens module-by-module.
6. Complete editorial, fulfillment, support, security, and commerce acceptance without initiating LIVE transactions.

## Revision history
| Version | Date | Change | Acceptance |
|---|---|---|---|
| 1.0 | 2026-10-26 | Initial current-state audit, data-source matrix and additive dashboard correction | Source-only, pending CI and authenticated QA |

**Acceptance:** This audit document is evidence of inspection, not full Admin acceptance. Do not claim the entire master specification has been completed.
