# Foundations Book I — Digital Customer Delivery Pre-LIVE Acceptance
**Project:** The Stock Market: From the Ground Up  
**Product:** `FOUNDATION_BOOK_1`  
**Date:** October 27, 2026  
**Classification:** Controlled Owner acceptance; no authorization of website sales or customer downloads.

## Verified production baseline
- Private Supabase Storage bucket `gu-digital-ebooks` exists and is nonpublic.
- Current EPUB: Version 2, 4,393,701 bytes, existing private object; Version 1 remains archived and intact.
- Owner confirmed in ChatGPT that the Version 2 EPUB downloaded and opened successfully.
- The database recorded an Owner-authorized, password-step-up signed private preview on October 27, 2026.
- **No customer primary-delivery record exists** in `gu_digital_books_v01430`. `catalog_products` flags: `sales_status=coming_soon`, `website_checkout_enabled=false`, `direct_digital_enabled=false`.
- Production `site_orders`, `checkout_intents`, and `site_order_items` were all empty at preflight.
- The catalog sets `kdp_select=false`, but Amazon enrollment status, expiration date, and digital distribution rights are **not independently verified**.
- Website catalog `metadata.website_price_by_format_cents_v135.digital=1099` ($10.99). This is **not** a verified active provider price.

## Completed safety checks
- Read-only SQL with anonymous database role: no EXECUTE on download or format-path RPC.
- Read-only SQL simulating an authenticated Free QA user: no digital entitlement, no eligible format, empty My Books.
- Existing Owner-only preview: actual user-confirmed working EPUB download.
- Noncharging GitHub CI [Digital Editions Private Download Acceptance](https://github.com/cybernexuspublishing/stock-market-from-the-ground-up/actions/runs/40471272164): success at commit `0d8ecb583f033c0cc1290fef0473970020002a9c`.
- New regression `tests/test_foundations_book_customer_delivery_prelive_v1.mjs` simulates provider-authorized customer download, unauthenticated/other-user/no-purchase/refunded/cancelled/print-only/restricted/missing-file/invalid-path denial, no provider charges or ledger writes.
- All customer-download simulations are **mock RPC responses**, not paid order or signed provider webhook acceptance.

## Blocking release gates
1. **Owner primary-file selection:** From Admin → Products → Books → Edit → View PDF/EPUB history → choose current EPUB Version 2 → Save eBook Rights & Controls. Keep sales/download checkboxes OFF; do not attest KDP termination without documentation. Existing DB RPC requires Owner + recent password confirmation and checks private file and optimistic concurrency. Do not bypass this RPC with service_role writes.
2. **Amazon actual KDP Select:** Owner must verify enrollment status, auto-renew and any exclusivity end in the KDP Bookshelf. KDP Select is a 90-day exclusive digital distribution commitment; internal `kdp_select=false` is not proof of rights. Source: https://kdp.amazon.com/en_US/help/topic/GD9PMU58BV24QFZ7
3. **Stripe mismatch:** Production `gu_digital_paid_owned_v01430` only recognizes a **LEMON_SQUEEZY** paid order tied to a corresponding `checkout_intents` entry and `site_order_items`; it does NOT recognize Stripe book purchases. The GU58 Stripe LIVE checkout handler allows only plan/tool SKUs, not book purchases. The format-aware `checkout-v0135` uses a legacy Lemon Squeezy variant. There is no approved signed Stripe BOOK payment-to-entitlement webhook path. **Do not enable Stripe book checkout or weaken entitlement to accept unverified payments.**
4. **Provider TEST proof:** When a supported signed book payment integration exists, exercise purchase→verified receipt→book library→60-second signed link→download, and refund/cancellation/chargeback→denied. Confirm replay protection, owner-binding, format entitlement, duplicate customer intent denial, and partial refund policy.
5. **Public publishing/compliance:** Verify actual digital rights, final title/edition approval, disclosure and taxes, and separate LIVE launch authorization before activating digital sales/download or `ENABLE_PAID_CHECKOUT`.

## Deliberate nonchanges
No LIVE Stripe charge, customer order, temporary grant, digital-rights attestation, KDP toggle, ebook entitlement, public asset access, signed customer download, release approval or sale activation was performed. Retain both uploaded versions privately.

## Gate outcome
**Owner EPUB access:** Accepted.  
**Customer download API negative cases:** Tested with production read-only role/RPC simulation and noncharging CI fixture.  
**Customer purchase/fulfillment/refund end-to-end:** Not yet accepted; held until matching signed Stripe book fulfillment (or approved independent existing provider) and rights verification.
