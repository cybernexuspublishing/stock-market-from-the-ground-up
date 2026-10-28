# Founding 600 — LIVE and Sandbox Catalog and Starter Checkout Gate Audit

**Document ID:** SMFGU-F600-CATALOG-QA-20261028  
**Project:** The Stock Market: From the Ground Up  
**Version:** 1.1  
**Status:** Stripe Product activation and TEST webhook signed-event route verified; Starter LIVE $0 Owner diagnostic and paid entitlement acceptance **pending**  
**Date:** October 28, 2026  
**Source location:** GitHub `cybernexuspublishing/stock-market-from-the-ground-up/docs/qa/`  
**Google Drive location:** Not established; no Google Drive file or identifier has been created.  
**File name / type:** `SMFGU-F600-CATALOG-LIVE-SANDBOX-AUDIT-20261028.md` / Markdown  
**Purpose:** Record production/sandbox provider pricing, Cloudflare mappings, database contract and remaining noncharging acceptance gates.  
**Dependencies:** Production GitHub main; Yahoo Cloudflare Pages project `stock-market-from-the-ground-up`; Supabase `oxihglyfgzywsupnyicb`; Stock Market LIVE and TEST Stripe accounts.  
**Document control:** Operational evidence only; not payment authorization, a legal opinion, or a license to make recurring charges.

## Verified canonical beta membership catalog

| Plan | LIVE Stripe product / price | TEST Stripe product / price | Amount | Billing | Founder discount | Included Sparks | Chart |
| --- | --- | --- | ---: | --- | ---: | ---: | --- |
| Free | No paid Stripe price | No paid Stripe price | $0 | No charge | N/A | By Free policy | Standard |
| Founding Starter (`FOUNDING_14`) | `prod_VWc8uqYtWhCqFi` / `price_1UVYuCJL0O4GGVBHetKgTrYq` | `prod_VWFwFoggxZfcx3` / `price_1UVDQoJY9FI7byHBuiYDnHrX` | $22.99 | 14 days, recurring | 5% | 10 | Standard |
| Founding Standard (`FOUNDING_30`) | `prod_VVF9poZ15hcsIm` / `price_1UUEgWJL0O4GGVBHWVsQfwvg` | `prod_VVCnll7D6GUMYR` / `price_1UUCNbJY9FI7byHBCX2VWdLi` | $49.99 | 30 days, recurring | 10% | 15 | Advanced |
| Founding Extended (`FOUNDING_60`) | `prod_VVF9SaeXxAv1QL` / `price_1UUEgYJL0O4GGVBHE7pmnWKz` | `prod_VVCna7iF60IFyK` / `price_1UUCNkJY9FI7byHBuh6pT4xd` | $59.99 | 60 days, recurring | 15% | 20 | Professional |

**Separately verified future/general-public map:** In BOTH Stripe LIVE and TEST, all eight `GU58_STRIPE_LIVE_CATALOG_JSON` / `GU39_STRIPE_TEST_PRICE_MAP_JSON` prices are active and exactly match: Full Monthly $69.99/month, Full Annual $699/year, Lifetime $2,499 once, Historical Replay $19.99/month, and Interactive Learning / Journal / Simulator / Tutor each $29.99/month. These are not authorized for general-public launch.

**Cloudflare configuration:** Production project has `GU_F600_LIVE_CATALOG_JSON` and `GU_F600_TEST_CATALOG_JSON` containing all three Founding plans, plus the existing eight-price LIVE and TEST general catalogs. Separate Preview environment bindings have not been provisioned; the TEST credentials and catalog configuration are server-side production bindings guarded by sandbox-specific endpoints. No encrypted secrets were copied into public source or a separate account. LIVE and TEST Stripe are distinct accounts.

## Corrective work completed (not a paid test)

1. Created previously missing 14-Day LIVE product and recurring price with exact 14-day cadence, marked `qa_pending` and `site_checkout_enabled=false`; preserved approved regular $22.99 price.
2. Corrected TEST founder 30/60 Sparks and 60-day discount metadata; corrected LIVE 30/60 misleading prelaunch price metadata.
3. Extended the Cloudflare LIVE founder price map and added a separate 14/30/60 TEST founder price map. Existing deployment bindings and encrypted secrets retained.
4. Extended Founding Checkout source to recognize the 14-Day SKU and independently verify each plan's database checkout gate, price, cadence, and LIVE product authorization **before** reserving a seat or creating Stripe checkout.
5. Extended the dedicated signed founding webhook to validate all three recurring terms and invoice amounts. Updated atomic Founder reservation and provider subscription lifecycle database functions to recognize 14-Day, preserving 600-seat locking and per-plan checkout controls.
6. Repaired stale database paid-cycle constraints to accept 14/30/60 prices and 10/15/20 included Sparks; confirmed no existing paid cycles before migration. Existing real production memberships were not modified.
7. Updated storefront and Founding enrollment to display 14-Day as available only after the **individual** server-side gate opens.
8. Added mocked noncharging regression tests of the disabled 14-Day plan, provider preflight and Sparks/seat invariants. Mocked tests do not count as authenticated LIVE acceptance.

## Distinguish the two payment test modes

- **OWNER LIVE $0.00 diagnostic:** Existing `/api/owner-zero-live-checkout`, using separate `prod_VSxZRZ8jlX5pW7` and `price_1US1eWJL0O4GGVBH7f78HcMo`. Exactly $0, one-time, no recurring payment, subscription, Founder seat or member entitlement. Only allowed while `FOUNDING_14.checkout_enabled=false`, with an authenticated Owner and recent password step-up. It cannot establish paid subscription entitlement acceptance.
- **14-Day member paid checkout:** Dedicated `/api/founding600-checkout` uses $22.99 recurring LIVE price and requires the database plan gate and Stripe product metadata both to approve payment. During the diagnostic, these remain FALSE, so no paying customer may enter this flow.

## Outstanding acceptance and release blockers

- Actual Owner-authenticated LIVE $0.00 checkout session and its completed `no_payment_required` verification have not been performed here. No Owner browser session or password-step-up token was available in the connector; do not invent a result.
- GitHub `docs/qa/SMFGU-MEMBERSHIP-TEST-ACCOUNTS-20261027.md` lists a proposed QA account batch, but fresh production `auth.users` count was zero for those identities. Account passwords are never stored in GitHub; a test identity cannot be obtained by reading source files.
- Production Founder number count and verified active paid-cycle count were both zero when audited. A separate authenticated paid Founder lifecycle acceptance remains open and cannot be satisfied by an unrelated $0 one-time diagnostic.
- The 14-Day individual database checkout gate and LIVE Stripe product metadata remain FALSE. Preserve this intentional blocking state until Owner $0 QA, provider webhook verification, renewal/cancel/refund checks and genuine entitlement acceptance have been evidenced.
- `public_launch_open=false`: general-public plans must remain hidden. Once 600 seats are issued or public launch opens, new founding enrollment closes while earned member benefits remain intact.
- Not all repository workflows necessarily complete simultaneously after every `main` push. Record matching accepted head commit and final CI results before release signoff.

## October 28 follow-up — catalog activation and signed TEST webhook acceptance

**Control scope:** Activate catalog Products in Stripe without turning unfinished SKUs into purchasable customer offers; preserve existing approved prices and no charge in LIVE.

**Executed and verified:**
- Stripe LIVE product activation: **56/56 active** (already active; no LIVE Product mutations required).
- Stripe TEST product activation: **58/58 active** after activation of 43 previously inactive TEST Products. No TEST Product was assigned an invented price, default Price or buyer-facing checkout permission.
- Production Supabase `gu_storefront_items_v014174`: **49 entries with `sale_ready=false` hidden**; `plan:FREE` intentionally remains visible despite not being a paid sale. Six `visible=true,sale_ready=true` items remain; other sale-ready entries retain their existing Owner visibility choices. The public storefront endpoint filters on `visible=true`, and no unready paid catalog item remains visible through that registry.
- Verified Stripe TEST card ending **4242**, authorized paid invoice **`in_1UVZY5JY9FI7byHByRzCzfKm`** for **$22.99** on exact 14-day TEST subscription **`sub_1UVZY4JY9FI7byHBS2oX9pkH`**. This is Stripe TEST ONLY, not a LIVE charge or website/member checkout. Subscription is set to cancel at period end, with no real membership entitlement; the provider-only subscription's sandbox enrollment tag was removed to prevent mistaken full-lifecycle QA handling.
- Enabled current-domain Stripe TEST webhook **`we_1UUf6eJY9FI7byHB0FuUEutL`** to `https://stock-market-from-the-ground-up-d1r.pages.dev/api/gu39-stripe-webhook`; disabled obsolete enabled TEST route **`we_1URIRZJY9FI7byHBWfVaGJym`**.
- With the legacy endpoint disabled, temporarily enabled the Owner-controlled isolated GU39 sandbox gate and caused a genuine signed **`customer.subscription.updated`** for an existing 30-day QA subscription. Stripe event **`evt_1UVZaFJY9FI7byHBGKojO0id`** reached **zero pending webhook deliveries** and appeared **exactly once** in Supabase `gu_f600_sandbox_events_v014215`. Restored `gu39_sandbox_settings.enabled=false` immediately after verification. This acceptance covers correct-domain signed webhook ingestion and idempotent event recording for that event type, not full 14-day member fulfillment.
- No production Founding paid cycles, founder memberships, or real customer payment tests were created.

**Still gated / do not misrepresent as passed:**
- The Owner's previously issued **LIVE one-time $0.00 diagnostic** remains open, not completed. It cannot be completed by Stripe TEST card 4242. Owner-authenticated hosted checkout and post-checkout verification are still required.
- The **14-day $22.99 recurring LIVE checkout** remains disabled by both the individual Supabase plan flag and Stripe LIVE Product checkout/fulfillment metadata. Activation is **not** implied by `Product.active=true`; avoid modifying these gates before authentic member and signed paid-lifecycle acceptance.
- Production QA test-identity roster is not provisioned. A GitHub QA account *definition* is not a usable Supabase login; no passwords or sessions are stored in source.
- Historical TEST 30/60 purchase acceptance is separate from new 14-day TEST provider-only invoice. 14-day signed membership fulfillment, cancellation/refund/renewal and member RLS/browser acceptance remain open.
- All unpriced and unreleased Products remain registered and active **without invented Prices or sale authorization**. Legacy Sparks packages are not the approved Sparks V2 catalog; correct pricing and entitlement implementation remain a separate gate.
- Cloudflare version/production deployment matching and all-triggered CI must be reverified for the final documentation commit; a successful deployment alone does not constitute payment acceptance.

**Operational separation:** Stripe Product `active` is catalog availability; Supabase `visible` governs site display; `sale_ready` and the payment controller's per-plan/metadata/authorization gates govern checkout. None of these alone proves shipped fulfillment.

## Revision history

| Version | Date | Change | Status |
| --- | --- | --- | --- |
| 1.0 | 2026-10-28 | Cross-platform verification, price reconciliation, critical paid-cycle constraint correction, safe Starter release staging | Pending real Owner and authenticated member acceptance |
| 1.1 | 2026-10-28 | 58/58 TEST Product activation, Supabase hidden-product control, 14-day TEST Visa paid invoice, new-domain signed webhook delivery | Catalog state accepted; LIVE $0 and member lifecycle acceptance pending |

**Footer — SMFGU-F600-CATALOG-QA-20261028 | v1.1 | Internal owner-controlled QA record | Not authorization for LIVE charges.**
