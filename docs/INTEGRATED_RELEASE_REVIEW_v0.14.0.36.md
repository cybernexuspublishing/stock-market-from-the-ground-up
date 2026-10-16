# v0.14.0.36 — Coordinated Website Source Corrections (Review Candidate)

**Organization:** Cyber Nexus  
**Imprint:** Crown & Lantern Press  
**Project:** The Stock Market: From the Ground Up  
**Version:** v0.14.0.36 (candidate, NOT deployed)  
**Baseline:** GitHub `main`, v0.14.0.35 / `9b244670b26d09a67b9f26257de06c7475b0ec50`  
**Date:** 2026-10-15, local  
**Status:** Prepared code changes / integration and staging required  
**Purpose:** Resolve ambiguous Admin navigation and inconsistent static website release versions while preserving billing safeguards.  
**Repository:** `cybernexuspublishing/stock-market-from-the-ground-up`  
**Google Drive folder, file ID:** Not provided. A new Drive file is not required to run this source-overlay candidate; archive an approved release artifact later.

## Delivered corrections

1. **Version consistency:** `config.js`, `sw.js`, route policy, `data/commerce-config.json`, and `release-manifest.json` identify v0.14.0.36. Dynamic commerce metadata now treats database `site.version` as a **legacy setting** instead of overriding the actual frontend release version.
2. **Freshness:** `_headers` requests revalidation for scripts/configuration and no-store for service worker and release manifest. The service worker uses a release-specific cache; the build script no longer publishes archival `sw-v*.js` workers in freshly generated output.
3. **Version check:** A no-store manifest comparison surfaces mismatches in Admin. When Cloudflare Pages runs `scripts/build-pages.sh`, the resulting manifest records the git SHA and build timestamp. **Direct uploads of loose root files cannot independently prove actual Cloudflare deployment parity**; the Admin indicator says so.
4. **Admin navigation:** A clear ten-section directory and a search input appear above the previous sidebar. Original controls with Owner-customized labels, click handlers, and permissions remain accessible under “All admin controls.” The existing Ctrl+K search and Payments & Billing interface are preserved.
5. **Payment clarity:** The older Lemon Squeezy settings remain labeled as such. Stripe mapping remains by server-side `STRIPE_MANAGED_PRICE_MAP_JSON`; Stripe `price_` IDs must NOT go into Lemon Squeezy `variant ID` inputs. No payment activation or entitlement changes.
6. **Regression tests:** Historic version-pin tests updated for v0.14.0.36; current release contract tests added.

## Critical payment blockers — not represented as fixed

- **Stripe Managed Payments provider eligibility:** Verify the seller, recurring memberships, AI-assisted educational services, and eBook products are approved. Merchant-of-record terms and tax classification need professional review.
- **Missing verified Stripe subscription fulfillment:** v0.14.0.32-R2 test webhooks store sandbox receipts; they intentionally DO NOT grant paid platform access, digital books, or change live orders. A separate audited, idempotent event-to-entitlement implementation, subscription status lifecycle reconciliation, disputes/refunds, and end-to-end payment tests are required before live checkout.
- **Price IDs:** Neither test nor live `price_` IDs have been provided for the eight starting prices. No invented values are inserted. The signed printed-book flow and optional Lulu Direct have independent toggles and need acceptance testing.
- **Digital rights:** The five designated Lifetime eBooks must remain unavailable until legal distribution restrictions end and files/rights are verified. v0.14.0.35 database benefits require postflight and member-level tests; do not rerun migrations based on this overlay.
- **Turnstile:** External Cloudflare/Supabase site keys and enforcement must be configured and tested server-side. CAPTCHA is not an equivalent replacement for MFA. Password reconfirmation and role restrictions must be tested.
- **Safety, UX, and governance:** Forum moderation, owner/admin messages, full responsive/accessibility testing, partner payment refunds, PII access, and branch protection remain separate production release gates.

## Release verification requirements

- Run local lint / Node syntax and all GitHub Actions, then verify **the new commit**; the baseline's 19/19 passing CI proves only the baseline.
- Build with `scripts/build-pages.sh` and validate `public/release-manifest.json`, routing, caches, and one active service worker.
- In deployed Admin, compare version from no-store manifest, `config.js`, and `GroundUpRoutePolicy`; mismatch must show a warning. Do not infer an actual deployment simply from GitHub main.
- Test Owner and Admin permitted navigation, restricted staff denial, saved custom navigation settings, browser reload, empty session, and keyboard navigation.
- Test all payment providers in sandbox, including out-of-order and repeated webhooks, cancellations, retry, refunds, chargebacks, access revocation, and legal restrictions before enabling any real transaction.
- Get v0.14.0.35 membership migration postflight and actual authenticated entitlement tests, not merely preflight.

## Revision history
| Version | Date | Change | Status |
|---|---|---|---|
| v0.14.0.35 | 2026-10-15 | Membership / eBook rights source and catalog prep | Existing baseline |
| v0.14.0.36 | 2026-10-15 | Consolidated Admin navigation and release/version safety source | Candidate, not deployed |
