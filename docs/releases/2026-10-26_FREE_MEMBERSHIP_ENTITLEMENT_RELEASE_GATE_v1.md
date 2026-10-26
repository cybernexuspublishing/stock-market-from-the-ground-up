# Free Membership and Membership Entitlement — Controlled Release Gate
**Document ID:** SMFGU-FREE-ENTITLEMENT-GATE-20261026
**Project:** The Stock Market: From the Ground Up
**Version:** 1.0
**Date:** 2026-10-26
**Status:** Source authorization hardening implemented; exact-head CI, production and genuine member acceptance pending independent evidence
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

## Commerce release blocker — tracked separately
LIVE Stripe products or Prices being active do not authorize website checkout. Current production launch switches remain false. Unresolved: correct signed webhook endpoint and delivery, provider-paid lifecycle, entitlements/refunds/renewals, 0/55 all-category fulfillment readiness, private PDF/EPUB book assets and legal policy approval. Do not enable LIVE charges based on this Free release.

## Rollback
Restore the prior versions of the central member access handler and three Free clients only after investigating any failed production rollout. Revoke no individual grants and run no database migration as part of this source change. Preserve legacy return fields for authorized premium clients.

**Revision history:** 1.0 | 2026-10-26 | Positive Free authorization, role boundary, QA gate and separate commerce register.
**Footer:** SMFGU-FREE-ENTITLEMENT-GATE-20261026 • Version 1.0 • Source implementation; independent production acceptance OPEN.
