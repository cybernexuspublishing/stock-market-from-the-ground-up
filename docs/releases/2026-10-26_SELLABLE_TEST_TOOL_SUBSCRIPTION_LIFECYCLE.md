# Sellable beta products — Stripe TEST subscription lifecycle, four first-party tools

**Owner authorization:** full technical/editorial release work, Stripe TEST only. No LIVE Stripe payments, config changes, chargebacks, refunds or customer charges. Financial controls remain Owner-only; beta member functionality continues to be released incrementally. Branch: `main`.

**Applied roles:** acting product Owner, Stripe subscription engineer, checkout/webhook security reviewer, PostgreSQL and RLS architect, tester, member billing UX engineer, release/CI owner, privacy reviewer, legal/tax liaison.

## Verified providers, not manufactured transactions

At audit, production project `oxihglyfgzywsupnyicb` exposed all four existing `platform_tools` SKUs below as `active=true`, `public_visible=true`, `status=live`, but **`checkout_enabled=false` for all four**. Owner-managed LIVE shutdowns were not changed. No production purchase, plan, member entitlement, test clock, refund or customer transaction was created.

Read-only Stripe TEST on connected stock-market account `acct_1URGkDJY9FI7byHB` independently verified each distinct ACTIVE, `livemode=false` USD monthly Price; all are 2999 cents:
 
| Approved SKU | TEST Product | TEST Price |
|---|---|---|
| INTERACTIVE_LEARNING | prod_VRwmmu4zATdHAb | price_1URGlBJY9FI7byHBmr7wkVoI |
| JOURNAL_ANALYTICS | prod_VRwoX4hTg8fRCm | price_1URGlAJY9FI7byHBfsRHyUke |
| MARKET_SIMULATOR | prod_VRwrsEpvfw60Xh | price_1URGl6JY9FI7byHBnQMqiUVg |
| MARKET_TUTOR | prod_VRwuiqDt8qHayI | price_1URGlAJY9FI7byHBKfqXyyDC |

## Critical defect fixed

`functions/api/stripe-staging-member-checkout-v01461.js` had an incorrect comment and implementation asserting `platform_tools` lacked `checkout_enabled`, although the production schema contains that Owner-controlled field. Its `product()` check would have permitted a test sale for any live, visible individual tool if sitewide staging switches were open, **even if this specific SKU was disabled**. The code now checks `checkout_enabled===true` for **both plans and individual tools**, before generating a Stripe session. Mocked route regression proves a disabled tool cannot contact Stripe; existing separate staging controls remain enforced. Do not use this defect as a rationale for changing production checkout switches.

## Real SQL lifecycle acceptance (disposable only)

The unchanged historic stage-only `supabase/migrations/v0.14.0.61_STAGING_MEMBER_FULFILLMENT_REVIEW_REQUIRED.sql` is applied **inside isolated GitHub Actions PostgreSQL 16**, with temporary users and a staging-only event ledger.

New fixture `tests/fixtures/v014061_four_tool_billing_lifecycle.sql` tests all four tool codes through **the real transactional `gu61_staging_stripe_apply_event` PL/pgSQL function**, not a mock of the function:
- Unpaid Checkout intent grants nothing.
- Verified subscription purchase grants only the exact purchased tool, never the other three.
- Replayed Stripe event ID does not duplicate the entitlement.
- Next paid invoice advances the period.
- Out-of-order previous cancellation cannot undo a newer paid cycle.
- Scheduled cancellation retains the paid term; actual canceled subscription revokes access.
- Failed invoice puts a paid tool pass in `paused` and denies access; subsequent verified new invoice restores it.
- Expired paid period denies; a different new invoice restores.
- Fully refunded latest invoice suspends only the affected tool, and replaying the same refunded invoice cannot reactivate it.
- Separately paid next invoice can restore a refunded account legitimately.
- Disputed latest invoice suspends only the affected tool.
- Authenticated/anon cannot directly EXECUTE the service-only fulfillment RPC.

`tests/fixtures/v014061_production_access_parity_20261026.sql` adds the **read-only captured production definition** of `user_has_tool_access(uuid,text)` and necessary minimal schema columns to this disposable fixture. This extends the negative cases to restricted profiles and Showcase roles using production-style authorization decisions. It is not a migration, must not be deployed to Supabase, and changes no production member records.

The existing `tests/test_v014062_staging_provider_lifecycle.mjs` exercises the real HTTP Checkout and webhook handlers with simulated Stripe REST and PostgREST responses; it now includes the Owner's per-tool false-checkout test. This portion is **mocked HTTP**, not real provider delivery.

Relevant CI: `.github/workflows/stripe-staging-member-v01461.yml`, including both disposable PostgreSQL scripts, staging security tests and member billing source tests. A completed run is required before reporting TESTED; passing test source alone is IMPLEMENTED.

## Member-facing repair

`assets/js/my-purchases.js` now differentiates scheduled cancellation, confirmed billing period end, failed/paused payment, ended term and absent paid-through date. Individual Tool Pass cards render the existing account warnings, link to private Support when the live billing portal is unavailable, and allowlist safe same-site HTML hrefs from editable catalog data (rather than trusting an escaped but dangerous URL scheme). Only the established signed LIVE portal path is shown for genuinely LIVE-owned `gu58_live_signed_stripe` records; TEST subscriber records must never be sent to a LIVE portal. `tests/test_tool_billing_member_status_v1.mjs` executes the actual billing helper source with simulated statuses and potentially malicious links.

## Deliberately separate acceptance claims

**PROVEN:** actual stock-market Supabase read-only catalog/tool-switch/access-RPC checks; read-only Stripe TEST Product, recurring Price and account-environment checks.

**TESTED (when CI succeeds):** signed-webhook routing under mocks; real isolated PostgreSQL service-only RPC + subscription lifecycle, field restrictions and expiry; member billing helper contract.

**NOT YET PROVEN:** an authentic user signing into an **independent staging** Supabase account, real Stripe TEST card/Checkout payment, actual Stripe-signed webhook delivery over staging Cloudflare, and real staging PostgREST mutations/reconciliation under a full lifecycle. Existing project list showed only the production stock-market Supabase project. The GU61 staging endpoints intentionally reject its project ref and real production Pages hostname. This is a security property, not a reason to disable the guard or apply staging DDL to production. No fake test customer or synthetic invoice was misrepresented as an actual transaction.

To perform that final provider-to-database proof, an independent **$0-cost verified** Supabase staging project and isolated Pages preview are required, with their own secret keys configured in platform secret stores, migration review/rollback, test QA identity and approved GU61 staging flags. Do not create paid infrastructure under the $0 spending policy. Never use the MommaBees project for this stock-market test. Do not paste keys into chat. The operator must verify one real TEST Checkout Session/payment, signed webhook event, entitlement before/after, next invoice, failed payment, cancellation, expiry, full refund and dispute (if the provider supports the scenario), with unique IDs and no PII in the report.

**Refund/cancellation nuance:** Stripe-issued TEST event `invoice.payment_failed` and subscription updates have independent semantics. Store credentials never flow through browser billing pages. Access is granted and revoked solely by the verified webhook and service-only SQL, never success redirects. Preserve legitimate access through paid term when cancel-at-period-end is true.

## Risk, rollback and safety

No production schema/rows changed. Roll back site-source changes by reverting their specific `main` commits after reviewing their dependencies; the disposable CI database is discarded and requires no production SQL rollback. The GU61 migration was not applied to production. Preserve the existing 419 canonical Labs, all attempt history, KDP Select exclusivity, existing $29.99 pricing, and LIVE payment shutdowns.

**Additional launch review:** recurring digital products require a validated tax and automatic-renewal review by qualified professionals. Stripe Tax calculation must not be switched on without verifying actual registrations; no tax settings changed in this test increment.

**Status:** The testing architecture and real disposable-database lifecycle are engineering-accepted when completed CI evidence supports them; production/member financial acceptance is separate and remains unclaimed. Unfinished guided beta features should remain discoverable for eligible members with truthful labels.
