# Stripe Sandbox product-state reconciliation — v0.14.0.40

**Owner message:** products have not been added to the sandbox. Do not assume catalog state from the Dashboard selection.

**Evidence supplied:** `sandbox_import_results.json` reports EIGHT sandbox product and EIGHT sandbox price identifiers, `sandbox_account_id=acct_1URGkDJY9FI7byHB`. In that report, all sandbox Product IDs equal the Owner's live Product IDs, but separate Stripe test Price IDs were produced. These identifiers do NOT independently prove that all eight test products are present in the sandbox currently selected in the browser. Stripe API verification is required before any new creation to prevent duplicates.

**What this release implements:** Owner/Admin-only 'Verify All 8 Sandbox Products' control in Admin > Payments & Billing. It makes read-only GET requests to Stripe `account`, `products/{id}`, and `prices/{id}` using the existing `GU39_STRIPE_TEST_SECRET_KEY` secret. It fails closed if the API key does not resolve to the Owner-reported sandbox account. It reports presence and pricing mismatches rather than creating any product. This read-only check works while `GU39_SANDBOX_SHADOW_GATE` is false.

**What this release does NOT do:** Does not claim products were imported, does not overwrite Cloudflare price mapping, and does not create duplicate Stripe records. Actual Stripe catalog additions require a verified missing-product result, with checkout remaining OFF. Existing import file is reconciled only after server verification.

**Important tax flag:** Owner's Stripe products export lists annual plan tax code `txcd_20060058` and most other products `txcd_10000000`; not approved for tax compliance by this release.

**Security:** Fixes REST service_role request authentication with `sb_secret_` via `apikey` only and with legacy service_role JWT via Bearer+apikey. Never include server secret credentials in JavaScript/browser or repository.
