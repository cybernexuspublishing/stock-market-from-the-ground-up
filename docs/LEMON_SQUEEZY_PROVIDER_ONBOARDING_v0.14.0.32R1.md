> **ARCHIVED ALTERNATIVE-PROVIDER INSTRUCTIONS (R1):** Stripe Managed Payments is the preferred digital provider in v0.14.0.32-R2. Lemon Squeezy is retained as an optional alternative; do not treat this document as current primary onboarding. See `STRIPE_MANAGED_PROVIDER_SETUP_v0.14.0.32R2.md`.

# Lemon Squeezy — Primary Commerce Provider Onboarding

| Control | Value |
| --- | --- |
| Project | The Stock Market: From the Ground Up |
| Publisher/imprint | Cyber Nexus / Crown & Lantern Press |
| Document | GU-WEB-OPS-20261015-032-R1-B |
| Version | v0.14.0.32-R1 |
| Date | October 15, 2026 |
| File type | Markdown (.md) |
| Drive location | Not established; project repository `docs/` is controlling working copy until Owner assigns Google Drive folder |
| Document ID | Not assigned in Google Drive |
| Status | Operational configuration pending; merchant account NOT created by ChatGPT |
| Dependencies | Lemon Squeezy merchant account, store approval, domain, production-verified signed webhooks, Supabase ledger, Cloudflare secrets |
| Purpose | Connect and validate the digital/subscription merchant account before paid checkout activation |

## Important distinction

The site's source has a **Lemon Squeezy checkout and webhook integration**. It does **NOT** establish an approved Lemon Squeezy merchant account, a live store, verified payouts, or successful real signed webhook delivery. This release introduces an OWNER/ADMIN **configuration-readiness report** under Admin → Commerce. It exposes only boolean config flags, never passwords, merchant IDs or API keys.

## OWNER account setup (must be performed inside the provider)

1. Register at https://app.lemonsqueezy.com/register. Provide real legal seller identity, tax and payout details as requested. Public publishing brand is not a substitute for your legal entity classification.
2. Create store and complete **Activate your store** business questionnaire and identity verification. Account approval is decided by Lemon Squeezy, not the website or ChatGPT.
3. Keep Test mode ON. Note your Store ID privately. Create test products and variants for membership tiers, Flex tools, and eligible *non-KDP-Select* digital books. Confirm variant IDs, currency, billing cycle, fees, tax settings and support/refund policy. Do not invent product prices.
4. Generate a **Test mode API key** and a random independent **webhook signing secret**; save them as **Cloudflare Pages / Workers encrypted server secrets**, never in the repository or client `config.js`. The published Supabase anon/publishable key is not a server secret.
5. Under **Settings → Webhooks**, set callback URL to `https://stock-market-from-the-ground-up.pages.dev/api/lemon-webhook` (or verified custom domain equivalent), choose the required events: `order_created`, `order_refunded`, `subscription_created`, `subscription_updated`, `subscription_cancelled`, `subscription_resumed`, `subscription_expired`, `subscription_paused`, `subscription_unpaused`, `subscription_payment_success`, `subscription_payment_failed`, and `subscription_payment_recovered`. Configure the matching signing secret in Cloudflare.
6. Server-only environment values:
   - `LEMON_SQUEEZY_API_KEY`: private API key **from Test mode**.
   - `LEMON_SQUEEZY_STORE_ID`: target test-store ID; never guess or copy a different store's value.
   - `LEMON_SQUEEZY_WEBHOOK_SECRET`: private secret matching that specific webhook.
   - `LEMON_SQUEEZY_TEST_MODE=true`.
   - `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY` per preexisting backend setup.
   - `ENABLE_PAID_CHECKOUT=false` **until acceptance**.
7. From Admin → Commerce, select **Check Provider Configuration**. A checkmark means an environment value exists, **not** that it is correct or that payment processing has been verified.
8. Execute provider-generated Test mode checkout for each active product, capture the signed webhooks and verify: order amount/currency/variant, account identity, subscriber expiry, duplicate webhooks, declined card, failed payment, refund and dispute behavior, canceled subscriptions, and digital-book purchase/download eligibility. Authoritative data must come from Lemon Squeezy server events, not customer redirects. The existing webhook validates `X-Signature`, expected Store ID and test/live environment.
9. Enable website `commerce.checkout_enabled` through the protected OWNER control **only after recent password confirmation**, provider tests and policy approvals. Keep `ENABLE_PAID_CHECKOUT=false` until staging and production acceptance are signed off. For launch, switch it intentionally after credentials and product IDs are configured.
10. After merchant approval, create **separate Live API key, live variants/products, live webhook and secret**. Test/live values are not automatically shared. Repeat a controlled live verification before accepting customers.

**Lemon Squeezy is intended for permitted digital products and subscriptions.** It must not be used to charge for physical signed author copies. Stripe remains an independent OPTIONAL payment path for signed print orders; Lulu Direct remains optional print fulfillment. Digital KDP Select titles must not be sold or delivered outside Amazon during their actual exclusivity periods, regardless of local website toggles.

## Verification status

- Provider account verified: **NOT VERIFIED**.
- Test merchant configuration: **NOT VERIFIED**.
- Authentic payment and webhook tests: **NOT EXECUTED**.
- Live payment activation: **DISABLED pending Owner action and tests**.

## Provider documentation

- Activation: https://docs.lemonsqueezy.com/help/getting-started/activate-your-store
- Test/Live separation: https://docs.lemonsqueezy.com/guides/developer-guide/testing-going-live
- Webhooks: https://docs.lemonsqueezy.com/help/webhooks
- Signature checking: https://docs.lemonsqueezy.com/help/webhooks/signing-requests

### Revision history

| Revision | Date | Summary |
| --- | --- | --- |
| 1 | 2026-10-15 | Test-mode merchant onboarding, webhook event contract and release gating. |
