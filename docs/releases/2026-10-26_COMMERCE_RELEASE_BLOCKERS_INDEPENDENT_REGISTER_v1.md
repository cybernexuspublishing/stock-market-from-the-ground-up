# Independent Commerce Release Blocker Register — Paid Launch Remains Held
**Document ID:** SMFGU-COMMERCE-BLOCKERS-20261026
**Project:** The Stock Market: From the Ground Up
**Version:** 1.1
**Date:** 2026-10-26
**Status:** OPEN — no general LIVE paid launch acceptance
**Filename / Type:** docs/releases/2026-10-26_COMMERCE_RELEASE_BLOCKERS_INDEPENDENT_REGISTER_v1.md / Markdown
**Google Drive location / Document ID:** Not assigned; this GitHub Markdown record is authoritative until a controlled Drive copy is created.
**Dependencies:** Existing 2026-10-26 LIVE_CATALOG_EXPANSION, LIVE_STRIPE_ZERO_AND_CATEGORY_QA_EVIDENCE, PUBLIC_SALES_LEGAL_RELEASE_CONTROL; Cloudflare d1r production; Supabase; Stripe LIVE and TEST; signed webhook handlers; Free acceptance status.
**Purpose:** Keep payment/fulfillment/legal acceptance gates independent of Free Membership feature testing.

## No-launch controlling decision
No production Stripe price, product, general checkout, founder billing, payment webhook activation, grant issuance or paid-public launch is authorized merely because Free Membership CI succeeds. Source, merchant-provider completion, signature validation, accounting/entitlement mutation and member-facing delivery must each be verified. Preserve the current Owner-controlled payment kill switches.

## Open blockers (source record, not a new LIVE merchant re-audit)
| ID | Blocker | Evidence from existing release controls | Independent acceptance condition |
| --- | --- | --- | --- |
| COM-01 | Correct production signed webhook destination | As recorded in GU-COMMERCE-ZERO-LIVE-EVIDENCE, d1r GU58 and Founder LIVE destinations were disabled; one legacy destination remained enabled | Correct authoritative destination, signing secrets, required events, actual provider delivery and deduplicated DB readback |
| COM-02 | All-category sellability and delivery | Existing LIVE catalog audit: 55 active products; 14 active prices; Store faces 60, none sale_ready at recorded snapshot. Prices and deliverables are not complete for 55 SKUs | Per-category verified amount/tax/cadence, tested entitlement and delivery; no misleading active checkout for undeliverable SKUs |
| COM-03 | Member subscription, renewal, cancellation, refund | Existing TEST evidence supports isolated contracts but not one complete independently verified provider-to-member journey | Signed TEST purchase/renewal/failure/recovery/cancel/refund, portal, notices, member permissions and financial reconciliation |
| COM-04 | Founding 600 caps, cycles, discounts and Sparks | Founding enrollment/billing/fulfillment DB switches remain false; approved 30/60-day prices and 10%/15% benefit separate from fixed renewal prices | 600-seat concurrency, exact cadence, eligibility, signed paid cycles, founder benefits, audit and purchased/included Sparks handling |
| COM-05 | Digital books, PDF/EPUB and licensing | Installed private-version schema has zero version rows in latest verified database; KDP Select and private file delivery remain distinct gates | Licensed/current private PDF and EPUB, per-format ownership, secure download, replacements, fulfillment and consumer remedy tests |
| COM-06 | Source/grant reconciliation for zero-dollar LIVE diagnostic | Existing evidence recorded three completed GU72 diagnostic sessions but only two corresponding narrow grant records and one newer open $0 session | Explain the unmatched record and prove actual site handler signature, authority and member entitlement behavior |
| COM-07 | Consumer, subscription, refund, privacy, advertising, educational and tax controls | Fourteen legal policy drafts recorded as drafts, not approved or deployed | Counsel and jurisdiction-specific review, published approved text, material checkout consent, cancellation and legitimate dispute/refund exceptions |
| COM-08 | Full authenticated regression and operational readiness | Some workflows passed and some cancelled/pending while main changed; deployment success is not end-to-end acceptance | Pinned commit with passing relevant CI plus verified Cloudflare, Supabase, Stripe TEST/Owner LIVE authorization, email/support and audit evidence |

## October 26, 2026 — Separation confirmation
The Free-only production entitlement migration (`20261026_membership_entitlement_period_boundaries_v1.sql`) changed one authorization function and wrote a single Admin audit record; it did not activate commercial checkout, issue a member paid grant, change a Stripe Price, or initiate a LIVE transaction. Founder billing was false at the database verification. This is not evidence that COM-01 through COM-08 have been closed. Retain every commerce blocker until its own signed provider-to-fulfillment journey is accepted.

## Release evidence distinctions
- **Product active** is not **Price available**, **Store visible**, **checkout authorized**, **payment settled**, **entitlement issued**, or **item delivered**.
- **Owner/Admin/zero-dollar QA grant** is not proof of customer payment; maintain separate source, scope, dates and revocation audit.
- **Free deployment accepted in code** is not proof of live subscription charging or rights to unpublished licensed data.
- Continue noncharging and Stripe TEST verification where already authorized; actual LIVE payments and final activation remain Owner-controlled.
- Keep the known successful production revision available for rollback; do not disable webhooks processing already-settled obligations without a reconciliation plan.

## Next independently verifiable work
1. Close Free Membership real-user acceptance and premium authorization regressions without LIVE payment changes.
2. Audit active grants, individual passes, book rights, Showcase/restriction transitions, renewals/cancellations and admin-originated QA grants against policy.
3. Establish one controlled checkout/fulfillment TEST evidence chain for each paid product class.
4. Prove correct signed webhook destinations and release controls before the Owner's separate explicit LIVE acceptance gate.

**Revision history:** 1.1 | 2026-10-26 | Confirmed commerce remains independent of Free-entitlement SQL and Store accessibility changes; unchanged LIVE payment hold.
**Revision history:** 1.0 | 2026-10-26 | Separated eight commerce blocker groups from Free Member release and added provider-to-delivery acceptance conditions.
**Footer:** SMFGU-COMMERCE-BLOCKERS-20261026 • 1.1 • OPEN / general LIVE paid launch NOT ACCEPTED.
