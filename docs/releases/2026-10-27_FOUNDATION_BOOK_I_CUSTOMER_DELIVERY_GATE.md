# Foundations Book I — Customer-Delivery Release Gate
Date: October 27, 2026 | Product: FOUNDATION_BOOK_1
Status: NOT YET ACCEPTED FOR CUSTOMER DELIVERY; LIVE SALES OFF

## Verified production evidence
- Private EPUB current v2 (4,393,701 bytes) and archived v1 present in Supabase Storage and edition registry.
- Owner downloaded and opened EPUB v2; signed-preview audit entry October 27 2026 07:54:06 UTC, 60-second link, no customer access change.
- Production read-only authenticated Free QA database simulation denied generic and EPUB format downloads. Not an authenticated HTTP/browser test.
- Digital website list price 1099 cents; checkout variant missing.
- Book remains coming_soon; direct digital sales and website checkout disabled.
- No digital publishing-control record, primary customer-delivery file, rights attestation, or customer download enablement.
- Zero site_orders and site_order_items at inspection.


## Current architecture discrepancy: digital Stripe purchases
- `gu_digital_paid_owned_v01430(text,uuid)` currently requires a matching verified order with provider `LEMON_SQUEEZY`, paid checkout intent and digital order item. Signed Stripe orders are not recognized.
- `gu_signed_book_orders_v01431` and `gu_signed_book_offers_v01431` are exclusively `paperback` or `hardcover` by enforced CHECK constraints, not digital-book receipts.
- `gu58_live_checkout_intents` handles paid plans/tools (GU58). Do not repurpose GU58 membership events as digital-book entitlement proof.
- Separate Stripe digital book Checkout Session, catalog pricing/format, strictly bound account/order/price, idempotent signed webhooks and refund/reversal ledger must be engineered and individually accepted before enabling Book I digital Stripe purchase.
- TEST purchases through other products, arbitrary mock RPC responses, and OWNER private preview are NOT accepted substitutes for a signed Stripe digital-book purchase-to-library chain.

## New protected Owner action
- Book Edit now includes `Assign Current EPUB as Primary (Sales OFF)`. It performs Owner step-up, checks the current registered EPUB/version/file existence and invokes the existing optimistic-version guarded `gu_owner_digital_books_save_v01430` with `p_sales=false`, `p_downloads=false`; the Owner's rights-attestation checkbox is not silently changed.
- **Action still requires an authenticated Owner click**; code deployment does not mean primary path was assigned. Verify resulting private control row before marking accepted.

## Outstanding customer-delivery release gates
1. OWNER CONFIRMATION RECEIVED (October 27, 2026): Owner states Amazon KDP Select exclusivity terms have ended for ALL books. This is an Owner declaration, not an independent Amazon contract-system verification. Do not invent an individual expiration date; retain contract evidence/attestation through the existing Owner-controlled publishing UI. Official source: https://kdp.amazon.com/en_US/help/topic/GD9PMU58BV24QFZ7
2. Owner selects current EPUB v2 as primary delivery in Book Edit and saves through authenticated, password-step-up publishing controls. Keep sales/downloads OFF until actual distribution rights are attested. Do not bypass the guarded publishing procedure with SQL.
3. Configure and TEST-verify an actual digital checkout variant and provider Price ID, without inventing a provider mapping or enabling LIVE transactions.
4. Acceptance with authenticated noncharging test data: signed paid order and digital item; My Books; 60-second signed file; Free/anon/cross-account denial; refund/chargeback revocation; replay/idempotency; stale/restricted account; missing file; KDP exclusivity denial.
5. Verify consumer disclosures, refund and tax handling, and separately approve LIVE activation after genuine fulfillment acceptance.

Preserve both EPUB versions, private Storage, and existing customer-access and payment safety switches. No LIVE charges or production entitlement grants are authorized by this release-gate record.
Source: production read-only Supabase queries, Owner-confirmed EPUB opening, and GitHub download-service contracts.

## October 27 implementation and TEST catalog update
- Added Owner Book Edit action: "Assign Current EPUB as Primary (Sales OFF)". It uses Owner password step-up, verifies the current private version in the protected history ledger, and saves through existing optimistic-version and audit RPC. Customer sales/downloads remain OFF. **Code deployed; Owner must click to create the publishing record**.
- Owner Store CI accepted the primary-file guard checks (GitHub Actions run 40475478039). This is a source regression, not member paid-fulfillment acceptance.
- Correct Stripe TEST account: stock-market-from-the-ground-up-Test Mode, `acct_1URGkDJY9FI7byHB`, **not** the unrelated MommaBees account.
- Existing Foundations Book I TEST product `prod_VVF9MJLGagIs8Q`; created verified TEST price `price_1UV603JY9FI7byHBAcdpKMKb` for a one-time USD $10.99 EPUB. This Price is active in TEST but product `active=false`, `site_checkout_enabled=false`, and no checkout is configured or purchased. The provider product's default_price now references this TEST Price.
- LIVE Stripe book product remains independent; no LIVE price, checkout or payment activation occurred.
- All digital customer grants remain blocked until a separate verified Stripe one-time book event -> account-bound order -> access ledger -> refund/reversal integration is accepted. Existing Lemon Squeezy-only predicate is not valid evidence for Stripe books.
- Latest read-only production audit at time of this note: primary file still unassigned; customer downloads and sales OFF; site_orders and checkout_intents empty.
