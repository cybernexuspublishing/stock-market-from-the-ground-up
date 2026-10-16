# Cyber Nexus — Stripe Shadow Testing Release Control

| Document control | Value |
|---|---|
| Project | The Stock Market: From the Ground Up |
| Company | Cyber Nexus |
| Publisher | Crown & Lantern Press |
| File | `STRIPE_SHADOW_RELEASE_CONTROL_v0.14.0.39.md` |
| Type | Markdown / release specification |
| Document ID | GU-WEB-PAY-014039-20261016 |
| Version / date | 0.14.0.39 / 2026-10-16 |
| Status | **REVIEW CANDIDATE — NOT DEPLOYED OR PRODUCTION APPROVED** |
| Repository location | `docs/` in `cybernexuspublishing/stock-market-from-the-ground-up` |
| Google Drive location / ID | Not supplied; create a Drive copy only if later requested |
| Dependencies | Existing database, Owner/staff guard RPCs, Stripe sandbox credentials, actual `price_` IDs, Cloudflare Pages Worker environment |
| Purpose | Isolated Stripe sandbox checkout and shadow-fulfillment testing without a second Supabase project or customer entitlement changes |

## Previously approved decisions preserved

- One existing Supabase project, no database recreation. This **does not provide the same failure isolation as a second project**.
- Eight Stripe products and their Owner-approved prices; Product IDs `prod_` do not replace Price IDs `price_`.
- No forced MFA; one Turnstile widget, server-verified. The existing sign-in source remains unchanged in this release; live browser duplicate-widget verification is still necessary.
- Stripe Managed Payments proposed for eligible digital services. Lemon Squeezy optional. Signed physical books and Lulu Direct retain their separate toggles/flows.
- No change to KDP Select, eBook storage controls, existing member accounts, approved Lifetime benefit language, forum/moderation, or production commerce switches.

## Release contents

- New `gu39_sandbox_settings`, `gu39_sandbox_intents`, `gu39_sandbox_events`, `gu39_sandbox_access` shadow tables only. RLS enabled; client table grants revoked. Live account tables, membership grant tables, orders and subscription tables are not changed by this migration.
- New server-only event RPC, Owner-only toggle RPC (requires recent password reconfirmation), read-only Owner/Admin summary RPC.
- Owner Stripe Testing UI within existing Payments & Billing panel. Browser navigation does **not** itself convey authorization.
- Owner-only sandbox Checkout endpoint `/api/gu39-sandbox`; signed TEST-mode webhook endpoint `/api/gu39-stripe-webhook`. Secret values remain in Cloudflare Worker environment.
- Baseline older customer checkout v38 is **left disabled for the production Supabase project**. New v39 checkout is administered only from the owner console; no public checkout is opened.
- Existing source version and service worker updated to v0.14.0.39; historical failing R2 assertion is updated to test current guarded behavior instead of an obsolete placeholder phrase.

## Required environment secrets and settings (Cloudflare)

Only when ready for controlled testing:

| Key | Requirement |
|---|---|
| `GU39_SANDBOX_SHADOW_GATE` | `true` explicitly; absent/false means off |
| `GU39_STRIPE_TEST_SECRET_KEY` | Stripe **test** key `sk_test_...` stored as a secret |
| `GU39_STRIPE_TEST_WEBHOOK_SECRET` | Test webhook signing secret `whsec_...` stored as a secret |
| `GU39_STRIPE_TEST_PRICE_MAP_JSON` | JSON mapping each website SKU to the matching test `price_` ID |
| `SUPABASE_URL` | Existing project URL; no new project required |
| `SUPABASE_PUBLISHABLE_KEY` | Existing published Supabase browser key |
| `SUPABASE_SECRET_KEY` | Server-side ONLY, never in JS/browser/ZIP logs or screenshots |

The owner must also explicitly **Enable Testing** from Admin, using password reconfirmation. These are two independent controls. Enabling one does not enable live customer checkout.

## Architectural and security findings

1. The v0.14.0.38 event RPC updates **real** `user_plan_grants`, `user_tool_passes`, `site_orders`, and `site_subscriptions`. It MUST NOT be repurposed for production-database sandbox tests. v39 never calls that RPC.
2. Sandbox events are stored as new `gu39_` records and never feed the website's authorization calculation. A simulated `shadow_access=true` is strictly an expected-outcome test, NOT an actual member entitlement.
3. Owner testing must only be opened using a Stripe test-mode key and test-mode Checkout session. Full refunds and disputes are checked for the current invoice; partial refunds and older-invoice refund races require manual review.
4. Webhook signature verification, explicit test-mode checks, Stripe canonical API re-fetch, event-ID dedupe, immutable session/price/member references, and role-checked Owner management are essential. Events that cannot be reconciled should fail/retry rather than grant membership.
5. The original branch is not protected. Set required GitHub Actions checks before shipping live customer payment code. Actual account security, email confirmation, CAPTCHA, cookie flags and service-worker changes need independent live testing.

## Acceptance gates still outstanding

**P0:** Schema reviewed by a PostgreSQL specialist and applied only after backup/snapshot; preflight and postflight clean. Owner/Admin permission test confirms anon/member denial. Eight sandbox Price IDs must be obtained. Stripe Managed Payments merchant/product/recurring eligibility, product tax categories, and account billing details must be verified.

**P0:** End-to-end actual test-mode Checkout, signed webhooks, renewal, failed payment, cancellation-at-period-end, immediate cancellation, full refund, dispute, duplicate/out-of-order events. No changes to real `user_plan_grants`, `user_tool_passes`, `site_orders`, `site_subscriptions`, digital downloads. Comparison snapshots must prove no live changes.

**P0:** Replace the shadow adapter with a **separately reviewed live-payment fulfillment implementation** only after passing staged tests, covering purchase-to-account linkage, refunds, consumer billing disclosures, cancellation self-service, tax and KDP distribution requirements. This release alone cannot be used for live customer transactions.

**P1:** Duplicate Turnstile requires live DOM inspection after v38 deploy; a screenshot alone does not prove the source of the second widget. Clear remaining GitHub test failures after testing the new commit. Verify Cloudflare build hash matches approved release.

## Revision history

| Version | Date | Status | Change |
|---|---|---|---|
| 0.14.0.38 | 2026-10-16 | Existing production source | Test-only Stripe functions restricted to a separate staging DB; database objects previously installed in production |
| 0.14.0.39 | 2026-10-16 | Candidate | Shadow Stripe testing and Owner toggles for existing Supabase; no production entitlement access |

**Document footer:** Internal deployment review record — does not constitute security certification, legal opinion, tax advice, or permission to enable payment collection.
