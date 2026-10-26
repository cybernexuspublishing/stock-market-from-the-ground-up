# LIVE Commerce Expansion — Control and Readiness Record
Document ID: GU-COMMERCE-LIVE-EXPANSION-20261026
Project: The Stock Market: From the Ground Up
Filename: docs/commerce/2026-10-26_LIVE_CATALOG_EXPANSION_v1.md
File type: Markdown
Google Drive location and document ID: Not assigned
Version: 1.0
Prepared: 2026-10-26
Status: PARTIALLY IMPLEMENTED; NOT DEPLOYMENT-ACCEPTED
Purpose: Record canonical SKU payment authorization, visibility separation and remaining integration gates.

## Verified actions
- LIVE Stripe catalog: 55 products, all active after 44 product activations. Active product is not active payment.
- Stripe Founding Extended description and discount metadata corrected from 20% to 15%; $2,124.15 Lifetime discounted value. Founding Standard obsolete Extended 20% reference corrected.
- Stripe LIVE Price registry: 14 prices; 11 active, 3 inactive. No prices, taxes or billing intervals changed.
- Supabase Store registry: 60 display records; 0 sale_ready at audit. Six included capability records are not standalone paid SKU products.
- Existing GU58 has eight standard payment mappings, and Founding600 has two separate mapped recurring prices.
- GU58 LIVE checkout code and Owner/admin payment catalog report now distinguish public Store visibility from product checkout authorization.
- A standalone zero-dollar LIVE Checkout Session was created with no PaymentIntent or subscription. Its final hosted completion remains unverified.

## Product-class integration requirements
| Class | Existing integration | Remaining production authorization |
| --- | --- | --- |
| Four standard paid memberships | GU58 | Approved checkout switch, price and cadence, member grants, signed lifecycle verification |
| Four standalone paid tools | GU58 | Independent tool checkout switch, live status, verified price, signed tool entitlement |
| Two Founding plans | F600 | 600-seat limit, verified terms, 10%/15% benefit correctness and signed cycles |
| Three Crownlight Sparks tiers | Wallet ledger and Stripe products | Price activation, purchased/included bucket accounting, idempotent credit and refund reconciliation |
| Digital books and bundles | Book rights ledger, private asset storage | Edition price, KDP authorization, delivered secure PDF/EPUB file, per-order entitlement |
| Fifteen Boot Camps and clinics | Academy progression | Approved price, released course content, course entitlement, member enrollment fulfillment |
| Other planned tools and included features | Site entitlement catalog | Published delivery and price or included-access contract |
| Sponsorship custom quotes | Quote-request records | Contract and invoice workflow, not general instant Checkout |

## Non-negotiable controls
Store visibility controls discovery and not purchase eligibility. Price and checkout must be Owner-enabled separately from Stripe Product active. Hidden paid SKUs may be sold through authorized direct links when all fulfillment controls are complete. Unpriced, not-yet-deliverable and KDP-restricted items fail closed. Use one authenticated server-side checkout, signed event-idempotent entitlement ledger, cancellation/refund/dispute reconciliation, and audit log. Do not publish unreviewed preorder terms or invent release dates. Include explicit account, product, price, ownership and source validation.

## Unfinished acceptance
General 55-product paid checkout is NOT IMPLEMENTED: 41 Stripe products have no Price records; three existing Sparks Prices remain inactive; most new product categories lack verified paid webhook fulfillment. Production LIVE approval flags and Store sale_ready remain disabled. Build prelaunch guard must be intentionally replaced by a reviewed release gate. No LIVE customer charges were created. Exact-head CI, deployed Cloudflare parity, member journey, digital distribution rights and refund handling remain open.

## Revision history
| Version | Date | Status |
| --- | --- | --- |
| 1.0 | 2026-10-26 | Partial implementation, release acceptance open |
