# Crownlight Sparks Pricing — Owner Control Center
Document ID: SMFGU-SPARKS-PRICING-ADMIN-20261028-002
Project: The Stock Market: From the Ground Up
Version: 1.0
Status: Implementation committed; production and signed-in Owner acceptance to be verified
Created: 2026-10-28
Updated: 2026-10-28
Filename: docs/admin/SMFGU-SPARKS-PRICING-ADMIN-20261028-002.md
File type: Markdown
Google Drive location: Not created; canonical source is GitHub main.
Purpose: Admin configuration of active and future Crownlight Sparks prices.
Dependencies: Supabase gu_sparks_price_catalog_v1, Admin OWNER RBAC, historical Spark ledger, server-side quote-protected redemptions, Cloudflare Pages.

## Canonical Chart Studio passes
- Advanced 24 hours — 6 Sparks
- Advanced 7 days — 24 Sparks
- Advanced 30 days — 75 Sparks
- Professional 24 hours — 12 Sparks
- Professional 7 days — 45 Sparks
- Professional 30 days — 125 Sparks

## Previously approved rates preserved
- Ad-free: 24h 5, 7d 18, 30d 50 Sparks
- Ungraded eligible Reveal: 4; Skip: 4 Sparks
- Early protected assessment retake: 5 Sparks, PLANNED only until protected redemption and grading constraints are complete

## Owner access
Admin Control Center: /admin.html#sparks
Only OWNER accounts with settings.view/settings.manage can inspect/change pricing.
The catalog tracks category, label, description, integer Spark cost, optional duration, fulfillment contract, status and version.
Existing redeemed prices and pass durations are immutable; changing the price updates only a new server-validated quote.
New products may be added under an appropriate category as PLANNED. An unintegrated SKU cannot be activated from this form.

## Security and acceptance
Never accept amount solely from a browser. Validate SKU, quoted price and sufficient balance in a single authorized, idempotent debit transaction.
Audit every Owner price edit. Use optimistic version check to block concurrent overwrites.
No chart pass constitutes a market-data license, paid membership, trading authorization or Founder 600 seat.
Actual authenticated Owner browser acceptance, current exact commit CI and production deployment need independent acceptance.

## Revision history
- v1.0 2026-10-28 — Catalog category/duration extension for planned SKUs, summary, protected early-retake draft
