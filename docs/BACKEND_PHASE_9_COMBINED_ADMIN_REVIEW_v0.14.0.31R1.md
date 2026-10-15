# Combined Backend Commerce + Admin Experience — v0.14.0.31 R1

**Project:** The Stock Market: From the Ground Up  
**Document ID:** GU-WEB-BE-20261015-011-R1  
**Version:** 0.14.0.31-R1  
**Status:** Development / Owner review required; SQL and production write not executed  
**Date:** 2026-10-15  
**Google Drive location:** None created (GitHub repository paths below are authoritative)  
**Dependencies:** v0.14.0.28 through v0.14.0.30 installed; v0.14.0.31 original migration MUST precede R1 migration.  
**Purpose:** Finish v31 development package with requested communications/permissions and member identity UI changes before the Owner's FIRST v31 upload.

## Direct changes

| Area | Path | Scope | Status |
| --- | --- | --- | --- |
| ADMIN Communications | assets/js/admin-communications-v01431r1.js | New panel; member notice composer + logged sends + switches | Source created |
| Accounts identity | assets/js/admin-account-usernames-v01431r1.js | Username column first in applicable account tables + quick contact button | Source created |
| Staff shipping | assets/js/admin-staff-shipping-v01431r1.js | Staff queue with just-in-time delivery reveal | Source created |
| Member registration | assets/js/registration-visibility-v01431r1.js | Website signup visibility, not an Auth-provider shutdown | Source created |
| Browser wiring | assets/js/site.js | Loads additive modules without replacing existing forum/admin | Updated |
| Commerce source | functions/api/signed-book-owner-detail.js | DB-authorized OWNER+ADMIN shipping lookup | Updated |
| v31 original SQL | supabase/migrations/v0.14.0.31_SIGNED_BOOK_STRIPE_REVIEW_REQUIRED.sql | Adds username to existing Owner order queue; original print payments preserved | Updated |
| R1 SQL | supabase/migrations/v0.14.0.31R1_ADMIN_ACCESS_COMMS_REVIEW_REQUIRED.sql | Role-bound controls, notice delivery and shipping access | NEW—review required |
| SQL checks | supabase/admin/v0.14.0.31R1_ADMIN_COMMS_* | Read-only pre/postflight | Source created |
| QA | tests/test_v014031r1_*.py | Security source and isolated browser checks | Locally passed |

## Current system ownership

**Lemon Squeezy:** platform memberships and eligible digital books only; no physical purchases. Provider toggle plus environment switch. Never silently change it to Stripe.

**Stripe:** separate OPTIONAL signed physical paper/hardcover sales, to permit shipping-address handling and a merchant of record for physical goods. Stripe ON/OFF is per backend master plus environment. No cross-provider substitutions.

**Lulu:** optional external print checkout independent of signed KDP author-copy workflow.

**Manual KDP author copies:** owner orders after verified Stripe payment, receives, personally signs and ships. KDP does not expose an authorized author-copy ordering API; do not automate credentials/checkout. Shipping may incur two legs and must be reflected in signed edition pricing and customer terms.

## Account and communication controls

| Control | Default | Role that can change | Actual effect |
| --- | --- | --- | --- |
| OWNER direct messages | Enabled | OWNER AAL2 | Database blocks new Owner notice inserts when disabled |
| ADMIN direct messages | Disabled | OWNER AAL2 | Allows eligible ADMIN with AAL2 to send audited in-app notices |
| ADMIN shipping addresses | Disabled | OWNER AAL2 | Eligible ADMIN with AAL2 may view paid signed-book shipping details from Stripe |
| Lemon Squeezy checkout | Existing | OWNER AAL2 | Database master switch; environment guard still required |
| Stripe signed books | Existing false | OWNER AAL2 | Database master switch; environment guard still required |
| Website registration UI | Existing true | OWNER AAL2 | Website signup presentation, not a guarantee Auth server denies direct signup |

**Excluded from unsafe generic toggles:** password rules, automatic email verification and Supabase Auth MFA enforcement. Those must be changed at provider and audited as backend policy, not in an isolated HTML checkbox.

## Identity and access constraints

- Human operations use permanent usernames (`@Username`) as primary identifiers; internal writes resolve to account UUID after server validation. Full names may duplicate and must never substitute for unique account identity.
- Existing Account Management tables are wrapped rather than replaced. Related tabs gain username as a separate column, with bounded pagination and 'Unavailable' when mapping is absent. Core User Accounts table already had Username, reordered to first.
- Membership billing status remains read-only from provider records. A 'canceled' manual grant with a future end date is not automatically active: entitlement is determined by its current status, source and expiry together.
- Admin shipping access is segregated from payment records, direct database table SELECTs, and fulfillment status mutations. Staff sees a list of paid orders without postal addresses until the authorized API request.
- A protected `site_settings` BEFORE INSERT/UPDATE/DELETE trigger blocks the legacy generic Admin `setting_save` endpoint from bypassing the Owner AAL2 toggles. Owner changes must use the dedicated audited RPC; turning these flags ON in generic Site Settings is not permitted.
- Only OWNER and eligible ADMIN have communications access; SHOWCASE, test and restricted users are blocked in PostgreSQL. All sensitive staff actions require Supabase AAL2.
- Notice inserts and their audit records share one transaction. Old messages remain visible to members through existing `user_notifications` channel; the new staff UI is a notice composer, not a true two-way chat application.

## Residual risks / acceptance requirements

1. **Security:** Test SQL RPCs using actual JWTs for eligible OWNER/ADMIN and disallowed Member/Showcase/suspended/admin-disabled. Supabase SQL Editor's superuser context does not prove frontend authorization.
2. **Full-page QA:** Run account lists, expirations, support tickets, audit history, forum identities and live Supabase interactions on staging. Screenshots only prove rendering, not fetch success. No unsupported claim that 'every website table' is verified. Some other modules may need their own username contract.
3. **Payment:** Real Stripe Checkout and Lemon Squeezy signed webhooks, replay/refund/dispute handling, tax/shipping charges and product pages not yet accepted.
4. **Consumer privacy:** Stripe just-in-time address is sensitive personal data. Owner decides ADMIN access via a revocable switch; audit access on demand is recommended before production. Customer disclosures, retention/deletion schedule and U.S. state tax obligations require professional review.
5. **Registration:** `site.registration_enabled=false` disables only website signup presentation; Supabase Auth new-user creation must separately be disabled to achieve actual registration lockdown.
6. **Existing Owner Notice API:** Legacy Owner edit/delete operations remain available. New notice sends are transactionally audited; legacy edit/delete audit calls are best-effort and need a future migration to fully transactional mutation functions if comprehensive audit immutability is required.
7. **Scalability:** Admin recipient directory limited to 500 entries; add server-side username search/pagination before user population exceeds that limit.
8. **Version:** The revised R1 supersedes the unuploaded v31 release; do not apply R1 SQL before v31 migration or upload both ZIPs.

**Revision history:** R1 — combined v31 physical commerce with full admin communication/settings/identity request; original v31 package not uploaded. All rights reserved.
