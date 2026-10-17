# Cyber Nexus — Stripe Catalog Unification v0.14.0.41

| Control | Value |
|---|---|
| Company / project | Cyber Nexus / The Stock Market: From the Ground Up |
| File / type | STRIPE_CATALOG_UNIFICATION_v0.14.0.41.md / Markdown |
| Document ID | GU-WEB-PAY-014041-20261017 |
| Version / date | v0.14.0.41 / 2026-10-17 |
| Status | GitHub release candidate; authenticated Stripe API acceptance outstanding |
| GitHub location | docs/ |
| Google Drive location / ID | Unassigned; no Drive file created |
| Dependencies | Owner/Admin Supabase authentication; Cloudflare runtime variables; Stripe TEST account; eight test prices |
| Purpose | Single source of catalog truth; clear administrator verification and fail-closed test checkout |

## Scope and protections
1. The canonical GET-only Stripe sandbox product-and-price verifier is /api/gu39-sandbox?view=catalog.
2. The older /api/stripe-product-readiness-v01437 endpoint is only a backwards-compatibility adapter; it delegates authentication, Stripe account pinning, lookup and validation to GU39. There is no longer a second Stripe secret-key or price-map configuration path.
3. Payments & Billing uses one visible **Verify All 8 Sandbox Products** action. The old independent catalog check and redundant card are not loaded.
4. The authoritative expected catalog retains all eight approved SKUs and prices. Test Price IDs belong in the Cloudflare server-side variable GU39_STRIPE_TEST_PRICE_MAP_JSON; test credentials belong in GU39_STRIPE_TEST_SECRET_KEY. Never commit sk_test keys, test webhook secrets, service role keys, or browser tokens.
5. Read-only verification works when GU39_SANDBOX_SHADOW_GATE=false. The UI distinguishes 8/8 product verification from 8/8 Stripe test Price verification. Missing configuration, duplicate IDs, inactive/missing products, incorrect currency, amount, billing cycle, account or livemode do not pass.
6. The Admin test checkout control remains disabled until all eight prices are configured, a same-session 8/8 catalog check passes and Owner mode is authorized; the server checks all eight mappings and re-verifies each selected test Price before creating a test session.
7. No products, prices, real member grants, orders, subscriptions, physical sales, eBook rights, or live checkout settings are changed by this release.

## External acceptance outstanding
- Confirm the actual Cloudflare deployment serves the release commit and manifest (CI success is not deployment acceptance).
- In Cloudflare add or verify GU39_STRIPE_TEST_SECRET_KEY and GU39_STRIPE_TEST_PRICE_MAP_JSON as server environment values. Do not activate testing or live checkout yet.
- After deployment, sign in as authorized Owner/Admin and execute the read-only check; capture 8/8 Stripe products **and** 8/8 prices against the expected sandbox account.
- Verify annual and monthly sales-tax product codes, Stripe Managed Payments eligibility, cancellations, payment receipts, merchant-of-record suitability, and any jurisdiction-specific tax duties with professionals.
- Later, separately authorize signed webhook, sandbox purchase, renewal, failed payment, cancellation, refund, duplicate/out-of-order delivery and entitlement-isolation tests. Real customer payment activation remains blocked.

## Revision history
| Version | Date | Change |
|---|---|---|
| v0.14.0.41 | 2026-10-17 | Unify Stripe catalog lookup, retire overlapping admin verification, improve diagnostics and checkout gating. |

**Footer:** Engineering release candidate, not a certification of live payment security, tax compliance, or readiness.
