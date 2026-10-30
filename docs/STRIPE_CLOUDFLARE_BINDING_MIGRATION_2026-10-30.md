# Stripe Cloudflare Environment Binding Migration

**Project:** The Stock Market: From the Ground Up  
**Document ID:** SMFGU-COMMERCE-ENV-RENAME-20261030  
**Version:** 1.0  
**Status:** Partially implemented; secret migration pending verification  
**Date:** October 30, 2026  
**Location:** GitHub repository /docs; Google Drive location not assigned  
**Purpose:** Normalize Cloudflare Production Stripe binding names without interrupting signed checkout/webhook processing.  
**Dependencies:** Cloudflare Pages Production, Primary Stripe LIVE and TEST accounts, secure secret transfer, verified signed webhook deliveries.

## Canonical / legacy binding map

| Canonical name | Legacy fallback | Status |
|---|---|---|
| STRIPE_LIVE_SECRET_KEY | GU58_STRIPE_LIVE_SECRET_KEY | Code ready; copy secret securely |
| STRIPE_LIVE_WEBHOOK_SECRET | GU58_STRIPE_LIVE_WEBHOOK_SECRET | Code ready; copy secret securely |
| LIVE_WEBHOOK_SECRET | GU_F600_LIVE_WEBHOOK_SECRET | Code ready; copy Founder webhook secret securely |
| STRIPE_LIVE_ACCOUNT_ID | GU58_STRIPE_LIVE_ACCOUNT_ID | New plain-text Production binding created and verified |
| GU39_STRIPE_TEST_SECRET_KEY | unchanged | No rename requested; existing binding retained |
| STRIPE_TEST_WEBHOOK_SECRET | GU39_STRIPE_TEST_WEBHOOK_SECRET | Code ready; copy GU39 signing secret securely |
| STRIPE_TEST_SECRET_KEY | GU_BOOK_STRIPE_TEST_SECRET_KEY | Code ready; copy Book TEST API secret securely |
| STRIPE_BOOK_TEST_WEBHOOK_SECRET | GU_BOOK_STRIPE_TEST_WEBHOOK_SECRET | Code ready; separate Book signing secret securely |

**Conflict resolution:** The request used `STRIPE_TEST_WEBHOOK_SECRET` for two distinct Stripe webhook destinations. Webhook signatures are endpoint-specific, so the Book TEST webhook uses `STRIPE_BOOK_TEST_WEBHOOK_SECRET`. Do not overwrite GU39's signing secret with the Book endpoint's signing secret or vice versa.

**Security:** Cloudflare GET returns only the names and types for encrypted secret variables. It does not return their underlying secret values. It is not possible to duplicate these bindings safely by reading Cloudflare API metadata. Never create an empty replacement secret or remove the legacy bindings until actual signed-provider tests pass.

**Rollout:** (1) Source reads new bindings first and falls back to old; (2) populate new encrypted Production bindings securely from Stripe credentials; (3) compare account and price mapping and exercise signed webhooks; (4) remove legacy bindings individually after observed successful fulfillment/reversal. No LIVE charge or refund is performed by this migration. Avoid customer-impacting toggles or changing Stripe endpoints.

## Revision history

| Version | Date | Change |
|---|---|---|
| 1.0 | 2026-10-30 | Canonical bindings and compatibility migration established. |
