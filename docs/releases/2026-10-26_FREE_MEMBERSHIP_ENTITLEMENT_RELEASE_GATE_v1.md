# Free Membership and Membership Entitlement — Controlled Release Gate
**Document ID:** SMFGU-FREE-ENTITLEMENT-GATE-20261026
**Project:** The Stock Market: From the Ground Up
**Version:** 1.2
**Date:** 2026-10-26
**Status:** Source and database entitlement hardening verified; targeted CI passed; genuine Free-member production acceptance OPEN
**Filename / Type:** docs/releases/2026-10-26_FREE_MEMBERSHIP_ENTITLEMENT_RELEASE_GATE_v1.md / Markdown
**Google Drive location / Google Drive document ID:** Not assigned; GitHub is current source of truth.
**Branch:** main
**Purpose:** Keep Free/premium access boundaries and release evidence separate from paid-commerce launch control.
**Dependencies:** Existing Supabase Auth/profile/admin flags/roles, user_has_tool_access service-only RPC, Free Academy and Watchlist migrations, existing member-tool-access, Free simulator, and dashboard.

## Owner controlling decision
A Free account receives its approved beginner education, fictional ungraded browser practice, manually maintained 20-symbol research watchlist, and 15 weekly Journal records including up to 10 saved simulator exercises. A paid account receives only the features of its verified active plan and individually owned products. Hidden catalog items and display labels confer no rights. Purchased Sparks are separate from core explanations.

## Current change
1. The central member-tool-access handler verifies one eligible, nondeleted production member profile; existing restricted/suspended flag checks; and absence of a current SHOWCASE_VIEWER role. Privileged checks fail closed on invalid data.
2. The central handler returns **freeEligible** as a positive server authorization decision, separately from **authorized** for premium tools; no UI/API can treat a premium-denial prose message as a Free grant.
3. Free Academy **free5**, Free research watchlist, and the fictional simulator use freeEligible. Other Academy programs and the connected-provider simulator remain premium-gated.
4. The handler validates that the Supabase premium RPC actually returned a boolean. This does not modify billing records or expand entitlements.
5. Add deterministic Node regression for Free/premium segregation, deleted, suspended, restricted, Showcase role and malformed backend responses. Run in existing Free QA workflow(s).

## Database facts at audit, not release certification
FREE active, includes_all_tools=false, includes_all_books=false; no FREE plan-tool rows. 419 canonical platform Labs remain. Current Free Foundations enrollment/progress and Free watchlist records are zero. Founder enrollment, billing and fulfillment remain OFF. No LIVE Stripe mutations are permitted in this release.

## Gates still open
- Verify real-account registration, confirmation, Free Dashboard, Free Foundations enrollment/saved reflection, logout/login resume and research watchlist persistence.
- Verify cross-account read/write isolation, deleted/restricted/Showcase and late-response account-switch behavior in real deployed environment.
- Independently review database public.user_has_tool_access lifecycle and grant-source parity, including plan.active, starts_at, ends_at, and paid provider refunds/cancellations. Avoid retrospective revocation of explicitly Owner-issued QA grants without review.
- Confirm successful exact-source GitHub CI, Cloudflare matching production SHA and mobile accessibility.
- Explicitly accept Free Membership only after independent browser/member evidence.


## 2026-10-26 source-hardening acceptance update (v1.1)
- Member tool authorization: explicit Free eligibility, independent premium grants, deleted/suspended/restricted and active Showcase denial. Source: functions/api/member-tool-access.js and tests/test_membership_entitlement_boundaries_v1.mjs.
- Free Foundations and Watchlist: positive Free authorization instead of comparing a premium-denial message. Fixed duplicate form-select/status-message DOM IDs. Dedicated Free Foundations and Research Watchlist Security CI PASSED at commit 750e2cef (run 40392606918), including Chromium responsive scenarios and source-backed mocked Auth/DB integration. Test fixtures are not production identities.
- Premium beta tools: a configured Free preview permits educational calculations but not private paid workspace storage, reads, exports, saves, or mutations. Source: functions/api/advanced-tool-workspace-v014110.js and functions/api/advanced-tool-access-v014110.js. Previous preview-storage behavior intentionally narrowed to enforce the Owner's Free benefit boundary. Deployment 08 CI PASSED at commit 9b1b9aec (run 40392191319).
- Book content: active Showcases, deleted accounts and restricted profiles are denied before inspecting private book purchase/plan evidence. Separate book purchase/redemption and valid paid membership benefit paths remain intact. Source test_book_entitlement_scope_v1.mjs. Dedicated Free workflow PASSED at commit 750e2cef.
- Additional exact-commit CI at 750e2cef PASSED: Deployment 08 run 40392607096, Member Learning Core run 40392606925, Market Analysis/Journal run 40392607145, and 30-Day Bootcamp run 40392607161. The sitewide Playwright/Stripe noncharging run for that commit was CANCELLED, not passed.
- Production Cloudflare SHA matched GitHub main 4db96b8d at the 2026-10-26 20:06 UTC observation, and Cloudflare reported successful deployment; concurrent commits make that a point-in-time result only.
- Supabase read-only acceptance check: ZERO Free-only (no premium/Owner grants) real-member profiles at audit; ZERO free5 enrollments, saved progress and watchlist rows. Therefore NO successful real Free-only account end-to-end session, cross-account readback, email confirmation or post-logout resume has been demonstrated. A zero-count entitlement-leak query with ZERO tested Free-only profiles is NOT a passing empirical user test.
- Existing Admin/Owner/zero-dollar QA entitlements can legitimately produce paid-tool access without a current paid customer charge. These must be separately labeled, periodically reviewed, and excluded from assertions that every premium-capable account represents a paid buyer.
- Additional unresolved release gate: review Supabase user_has_tool_access and direct book/plan grants for start dates, cancellation/refund status, retired plans, time boundaries, and source-of-grant audit. Do not revoke Owner-issued QA grants or treat a Store visibility toggle as the member authorization engine.
- The next simulator implementation remains deferred until independent real Free-member login, lessons, replay, Journal, watchlist, logout and resume acceptance is recorded.

**Revision history:** 1.1 | 2026-10-26 | Test evidence, preview storage entitlement segregation, book right restrictions, and remaining production QA blockers.

## October 26, 2026 — v1.2 database and paid-feature separation acceptance
**Implemented source commit:** f63a460ccdb8d314035b86cc90d4796749f33a7f (GitHub `main`).  
**Database migration:** `supabase/migrations/20261026_membership_entitlement_period_boundaries_v1.sql`.  
**Database postflight:** applied to `oxihglyfgzywsupnyicb`; private RPC checksum `feebd462adcf038256ccf0ee8192fa43`; scoped Admin audit record count 1; permission flags anon=false, authenticated=false, service_role=true. The FREE plan had zero paid-tool mappings after migration. The migration's transaction checked and preserved currently valid member tool-access decisions; no grants, Stripe records, or LIVE checkout switches were modified.
**Entitlement logic:** an eligible, undeleted production member with no suspension/restriction/active Showcase role; tools limited to known currently released codes; each active plan must be valid and explicitly map the tool or include all tools. Individual passes must have reached their starts and respect both expiration boundaries; provider-managed tool passes must carry a period end or effective end. Recurring provider subscriptions require a valid period end. Owner-granted QA records remain administratively authorized but are not counted as paid customer invoices.
**Books:** `functions/api/lab-content.js` now checks `platform_plans.active` and billing-period validity for membership-derived book access, while maintaining independent purchased and redeemed book rights. Test `tests/test_book_entitlement_scope_v1.mjs` includes inactive-plan denial.
**Targeted CI:** the dedicated Free Foundations/Watchlist workflow, Deployment 08, Member Learning Core and Market Analysis regressions passed on source revision `f63a460c`. The encompassing sitewide suite on that source revision reported a Store `aria-required-children` failure (39/40 checks passed); source `store.html` was corrected at `9b128e46` by moving the external Crownlight Sparks link outside the ARIA tablist. Exact-head rerun is required for that change.
**Production real-member gate:** still open. At inspection, Free5 enrollments=0, Free5 saved progress=0, Free watchlist rows=0 and no genuine Free-only member profile existed without premium or administrative grants. Therefore no valid cross-account, persistence, email-confirmation, logout/resume or real-user access-denial acceptance can be claimed.
**Simulator advancement:** the next stage remains blocked until an authenticated real Free member completes the seven-step practice/lesson/Journal/watchlist/account persistence journey without gaining paid replay or premium workspace access.

**Revision history:** 1.2 | 2026-10-26 | Installed and verified production entitlement-period rule, inactive-plan book exclusion, sitewide accessibility remediation, retained real-user acceptance hold.

## Commerce release blocker — tracked separately
LIVE Stripe products or Prices being active do not authorize website checkout. Current production launch switches remain false. Unresolved: correct signed webhook endpoint and delivery, provider-paid lifecycle, entitlements/refunds/renewals, 0/55 all-category fulfillment readiness, private PDF/EPUB book assets and legal policy approval. Do not enable LIVE charges based on this Free release.

## Rollback
Restore an earlier source release only after reviewing user rights. The new database entitlement migration is applied and must be reverted only through a reviewed, compatibility-tested function restore. No individual grants were revoked. Reverting to the previous function would reopen inactive-plan and indefinite-provider-term access and is therefore not a routine rollback.

**Revision history:** 1.0 | 2026-10-26 | Positive Free authorization, role boundary, QA gate and separate commerce register.
**Footer:** SMFGU-FREE-ENTITLEMENT-GATE-20261026 • Version 1.2 • Source and DB boundaries verified; authenticated Free-member acceptance OPEN.
