# START HERE — CURRENT REPOSITORY GUIDANCE

**This repository's authoritative release source is the current `main` branch, not the historical v0.14.0.40 overlay described below.** The older instructions are retained only for provenance and must **not** be used as a deployment baseline, migration order, payment-activation checklist or current product-status report.

Before changing or deploying the site, read `AGENTS.md`, `PROJECT_SITEWIDE_RULES.md`, `PROJECT_ADVANCED_ENGINEERING_RULES.md`, `PROJECT_INSTRUCTIONS_FOR_CHATGPT.txt` and the complete source requirements under `docs/sitewide/`. Verify the latest `main` commit against Yahoo Cloudflare production and inspect the corresponding GitHub Actions runs. For learning releases, consult `docs/releases/2026-10-25_TRUTH5_AND_LAB_BATCH01_GATE.md` and current Supabase readiness evidence rather than assuming a version prefix proves acceptance.

**Payment exclusion:** LIVE Stripe transactions, billing configuration changes, charges and refunds remain outside the authorized pre-beta work. Historical examples are fictional unless their licensing and source provenance are independently verified. Production Member Tested and Beta Ready must not be claimed without Founding 600 member evidence.

---

## Archived v0.14.0.40 overlay instructions (historical; do not deploy as current)

# v0.14.0.40 — Stripe secret-key compatibility and live sandbox catalog verification

**REVIEW CANDIDATE — NOT APPLIED TO GITHUB OR CLOUDFLARE BY THIS PACKAGE.**

Repository baseline: `cybernexuspublishing/stock-market-from-the-ground-up` `main` at `b6efd36cb23a4434b2623ed08f41bdb4a4be0016` (v0.14.0.39).

**One consolidated path-preserving overlay ZIP**, not a complete replacement website. Preserve unrelated files. Install on top of that baseline without renaming paths. Build/deploy in Cloudflare after reviewing GitHub CI. No new Supabase migrations in this release. No new environment variables. Reuse existing Stripe TEST secret and Price map already saved in Cloudflare. Do not paste or upload any keys.

**What changed:**
- New Supabase `sb_secret_` server credential support in `/api/gu39-sandbox` and `/api/gu39-stripe-webhook`; legacy service_role JWT continues to work.
- Server-side read-only Stripe test account verification, hard-pinned to owner-reported `acct_1URGkDJY9FI7byHB`; checkout additionally rejects a mismatched account.
- Admin > Payments & Billing > Stripe Payment Testing > **Verify All 8 Sandbox Products**: real-time Stripe test API lookup of EIGHT product IDs and matching test prices. Works without enabling checkout. Results distinguish existing/absent/mismatched products and prices.
- Added mock automated test of sandbox product verification, no-live-write safety, and both Supabase credential formats.
- Incremented release/site cache to v0.14.0.40.
- Read-only Supabase security SQL provided for review; does not alter real data.

**Do not add duplicate products yet:** earlier `sandbox_import_results.json` asserts 8 test prices and products. There is no evidence yet that Stripe API corroborates their presence in the sandbox being viewed. Verify catalog through Admin FIRST. If 8/8 passes, they're already present. If not, save status rows to plan idempotent missing-only repair; creating duplicate products before verifying would be unsafe.

**Required gates before live payment:** signed Stripe webhook test, user access isolation, subscriptions and refunds, merchant readiness and tax review, production customer payment backend independently approved. Keep `GU39_SANDBOX_SHADOW_GATE` OFF until controlled test readiness review; keep live checkout OFF.

**Run tests on merged repository:** `node tests/test_v014040_catalog_and_auth.mjs`; `node tests/test_v01439_cloudflare_mock.mjs`; `python tests/test_v01439_source.py`. These are mock/source tests, not real Stripe charges.
