# Cloudflare Production Account Replacement — Migration Control v1.5
**Project:** The Stock Market: From the Ground Up  
**Status:** NEW MASTER ACCOUNT ACCESS UNVERIFIED — original and interim Live accounts must remain intact  
**Date:** 2026-10-25  
**Document owner:** Cyber Nexus / Crown & Lantern Press  
**Repository / location:** `cybernexuspublishing/stock-market-from-the-ground-up`, `docs/cloudflare-account-replacement-2026-10-25.md`  
**Google Drive location:** Not applicable; GitHub is the controlled source for this migration record.  
**Purpose:** Retain the source-to-destination inventory, secret-reentry requirements, deployment path, and cutover gates before deleting the original Cloudflare account.

## Destination change — new business master Cloudflare account (2026-10-25)
The Owner created a **third**, separate Cloudflare account under a new business Yahoo login and designated it as the eventual permanent production master. The previously deployed account, `9a43bc08e9db72e7187bc8c0a31710c2` (Live Pages hostname ending `-lives.pages.dev`), is now an **interim account**, not the final destination. Earlier successful smoke and deployment tests relate to that interim account only. They **do not establish acceptance** of the new Yahoo master account.

**New master account ID:** UNVERIFIED. **New master Pages project:** NOT VERIFIED/NOT CREATED BY THIS MIGRATION. **New master deployment:** NONE PERFORMED. Account access must be confirmed before any migration or live traffic changes.

Owner supplied a token permission summary indicating a broad, no-expiration account-scoped key with Pages/Workers, billing and account-token management access. This is a permission declaration, **not** proof the ChatGPT Cloudflare connector has access. The connected Cloudflare tool currently returns an ineligible-account-link error.

The GitHub repository secret `SMFGU_LIVES_PAGES_DEPLOY` was validated through a **read-only** GitHub Actions job:
- https://github.com/cybernexuspublishing/stock-market-from-the-ground-up/actions/runs/40237391848 — token verification succeeded HTTP 200, and account enumeration succeeded HTTP 200, but listed **only the original Gmail and interim Live Cloudflare accounts**, not the new Yahoo master.
- Therefore, **master account access from the GitHub secret is NOT VERIFIED**, even if the token itself is valid. Do not use this secret for deployment to the intended master.
- The hardcoded interim-Live fallback workflow `.github/workflows/replacement-cloudflare-pages.yml` was **paused** (`if: false`) to prevent accidental deployments to the wrong Cloudflare account.
- Added `.github/workflows/verify-master-cloudflare-access.yml` to verify account access without exposing credentials, performing writes, or initiating payments. The master account matcher must pass before reconfiguring the deployment target.
- For GitHub Actions deployment, use a **separate master-account-specific Pages Write/Edit token**, not a broad no-expiration API token granting billing, token administration, DNS and account takeover capabilities.
- Restore the ChatGPT Cloudflare plugin connection to the new business Yahoo login before infrastructure changes. A connected GitHub application alone is not proof that Pages resources were created or that ChatGPT has authenticated Cloudflare access.

**Migration order:** verify new account ID and connections; create or validate the new production Pages project using the allowlisted build from GitHub `main`; configure safe non-secret settings; generate master-only Turnstile and billing Worker bindings; enter provider secrets securely; run noncharging public checks plus authenticated Supabase/Stripe TEST acceptance; coordinate cutover; obtain separate account-retirement approval. Do **not** migrate LIVE webhook delivery, run LIVE payment tests or activate a second billing scheduler before corresponding safety gates.

## Control
- **Original account:** `5cc474054a0869a2fc0c4d0bd1c5373b` (retain until explicit deletion approval).
- **Replacement account:** `9a43bc08e9db72e7187bc8c0a31710c2`, display name *THE STOCK MARKET: FROM THE GROUND UP Live*.
- Preserve original production website, database, Stripe billing, and scheduler until replacement passes authentication, authorization, payments, webhooks, scheduler, and security acceptance.
- Retain GitHub `main` as source of truth; do not copy operational customer data to a separate Supabase instance.
- Never include actual API keys, webhook signing values, secrets, passwords, customer information, or payment data in this document.

## Verified source inventory
| Resource | Source | Replacement | Status |
|---|---|---|---|
| Cloudflare Pages | `stock-market-from-the-ground-up`, `stock-market-from-the-ground-up.pages.dev` | `stock-market-from-the-ground-up-lives`, `stock-market-from-the-ground-up-lives.pages.dev` | **Production Pages deployment succeeded 2026-10-25** |
| Pages build | `bash scripts/build-pages.sh` → `public`; root `/`; branch `main` | Same build settings | Configured |
| Pages Functions | Repository `functions/` | Deployed via Wrangler Pages; `/api/auth-guard-v0135` confirmed HTTP 200 | Basic check passed; backend acceptance pending |
| Pages production variables | 46 environment-variable names in source | 41 in destination, including replacement `GU_PUBLIC_SITE_ORIGIN` and approved QA user ID; 6 source secret names remain absent | **Backend secrets pending** |
| Billing Worker | `ground-up-billing-scheduler` | Same name, code from `workers/billing-reconcile-stripe-only-v014129.js` on `main` | Code deployed; no cron enabled |
| Billing Cron triggers | `0 12 * * *` and `*/25 * * * *` | None; deliberate until cutover | Pending activation |
| Billing Worker compatibility | `2026-10-20` and `global_fetch_strictly_public` | Same | Verified |
| Billing shared secret | Original secret hidden | Fresh separate secret generated and bound to replacement Pages and Worker | Configured for new account |
| Turnstile | Original managed widget | New managed widget for new Pages hostname | Created; Supabase Auth CAPTCHA coordination pending |
| DNS zones/custom Pages domains | None found | None | No Cloudflare DNS transfer required at present |
| KV / D1 / Durable Objects | No resources found | None | No transfer required |
| R2 | API indicates not enabled on original | Not created | No transfer required, subject to final billing review |
| Stripe | Existing LIVE and TEST contexts | Same accounts retained | Endpoint transfer pending |
| Supabase | Existing production project `oxihglyfgzywsupnyicb` | Reuse existing project | Public bindings copied; server secret pending |

### Pages variables not yet reproduced (names only)
- `GU39_STRIPE_TEST_SECRET_KEY`
- `GU39_STRIPE_TEST_WEBHOOK_SECRET`
- `GU58_STRIPE_LIVE_SECRET_KEY`
- `GU58_STRIPE_LIVE_WEBHOOK_SECRET` (original is classified as plaintext; rotate and store as encrypted secret)
- `GU72_QA_ALLOWED_USER_ID` was copied as a QA identifier only; both zero-monthly QA and fulfillment switches remain `false`.
- `GU_F600_LIVE_WEBHOOK_SECRET`
- `SUPABASE_SECRET_KEY`

Destination-specific differences are deliberate: `GU_BILLING_SITE_ORIGIN`, `PUBLIC_SITE_URL`, and `TURNSTILE_SITE_KEY` use the replacement account/hostname. LIVE checkout, fulfillment, webhook, and launch-approval flags remain `false`.

## Build and deployment
- Cloudflare initially rejected Git-repository reuse across accounts; **subsequently the replacement project acquired a GitHub integration**. API now confirms GitHub `cybernexuspublishing/stock-market-from-the-ground-up` / `main`, with replacement production deployment enabled and preview deployments disabled. Verify this integration stays functional before retiring the original account.
- Replacement has a manual fallback GitHub Action `.github/workflows/replacement-cloudflare-pages.yml` on `main`, using securely stored GitHub secret `SMFGU_LIVES_PAGES_DEPLOY` (no secret material recorded here). It is `workflow_dispatch` only.
- Replacement Pages production build environment defines `GU_PUBLIC_SITE_ORIGIN=https://stock-market-from-the-ground-up-lives.pages.dev`; the build script rewrites `sitemap.xml`, `robots.txt`, and generated canonical URL metadata for the new hostname.
- Only the allowlisted `public` tree is deployed. The `functions/` directory is built into Pages Functions and is never served as static assets.
- Incorrect initial Worker that publicly deployed repository-root files was deleted. Its `workers.dev` and preview routes were disabled beforehand. Do not re-create that root-assets deployment.

## Initial replacement deployment evidence — 2026-10-25
- GitHub Actions run: https://github.com/cybernexuspublishing/stock-market-from-the-ground-up/actions/runs/40231552527 — **SUCCESS**. Allowlisted Pages build step and deployment step both passed.
- Cloudflare Pages deployment ID: `cd361c25-c0a8-4abf-a858-c70d7cbe6256`. Production URL: https://stock-market-from-the-ground-up-lives.pages.dev/.
- HTTP GET tests: homepage, Store, Boot Camp Academy, Historical Lab Registry, and member Dashboard **rendered**. Rendering is not proof of authenticated workflow acceptance.
- Pages Function `/api/auth-guard-v0135` returned `ok:true`, `enabled:true`, and the new account Turnstile site key.
- Private paths `/.git/config`, `/.mcp.json`, and a `/supabase/migrations/` SQL file returned 404.
- `/api/ad-sales` returned HTTP **503**. The replacement still lacks the production server-side `SUPABASE_SECRET_KEY`; this remains a failed backend acceptance gate, and dependent flows may not work.
- One-time workflow-file push trigger was removed after successful initial deployment; normal operation is manual `workflow_dispatch`, and GitHub secret name is `SMFGU_LIVES_PAGES_DEPLOY`. Secret value cannot be read or displayed through the GitHub connector.
- Original billing Worker schedules are **unchanged**; replacement billing Worker has zero active cron schedules.
- No live payment authorization, owner account deletion, or Stripe webhook switch was performed.

## Owner-authorized migration gate v1.2 — 2026-10-25
- Replacement Cloudflare Pages production origin is now `https://stock-market-from-the-ground-up-lives.pages.dev`; fresh HTTP checks verified the new **canonical URL**, **sitemap URLs**, and **robots.txt Sitemap reference** all use this hostname.
- Replacement deployment `dc6c779d-e1db-4328-8d71-d28d86b41a84` succeeded after setting replacement `GU_PUBLIC_SITE_ORIGIN`. Existing `/api/runtime-health-v014259`, `/api/edge-probe-v014266` and `/api/auth-guard-v0135` returned successful read-only responses.
- GitHub main source fixes now use configured site origin in **advertising Sandbox** (`functions/api/ad-sales.js`), **Founding 600 provider-readiness** (`functions/_lib/founder-catalog-readiness-v014264.js`), and **Admin Sandbox webhook check** (`functions/api/admin-prelive-v014247.js`); original account retains old-domain fallback. On-page human-verification setup text now uses the running hostname.
- Existing Supabase production (reused without duplication) returned aggregate read-only counts: **419 canonical Labs**, **30 competencies**, **60 storefront items**, **3 ad packages**. At this check, neither global Sandbox mode nor advertising LIVE payment mode was enabled. No SQL changes or purchase operations were performed.
- Stripe LIVE endpoints remain at the original hostname (one enabled standard LIVE webhook and one disabled Founding 600 webhook); Stripe TEST has one enabled original-host webhook. **No Stripe endpoint changes or live payment tests** were performed.
- Replacement `/api/ad-sales` still returned HTTP 503 before server secret setup. Finish `SUPABASE_SECRET_KEY`, Turnstile/Supabase Auth secret alignment, Stripe TEST and LIVE signing secrets, and authenticated browser acceptance before cutover.
- Supabase security advisor reported informational `rls_enabled_no_policy` findings. These may represent intentionally service-only tables; verify authorization paths rather than indiscriminately adding anonymous RLS policies.
- The original website and its **two** billing cron triggers are unchanged. Replacement billing Worker remains deliberately **unscheduled**.
- **Security correction:** Previous user-issued Cloudflare API token was pasted into a conversation. Owner reports token was rolled and GitHub secret updated. Do not record the credential value; independently review token permission scope because rolling does not reduce broad account/zone access.

## Acting Owner continuation — October 25, 2026 (migration record v1.3)
- **Turnstile hardening:** Replacement widget `SMFGU Lives Production Turnstile` accepts **only** `stock-market-from-the-ground-up-lives.pages.dev`. Removed `localhost` and `127.0.0.1`; widget secret stayed unchanged. Supabase Auth CAPTCHA must still be aligned to the new widget secret through a supported Auth settings pathway before login acceptance.
- **QA identity:** Copied the original preapproved QA user identifier directly from source Pages configuration to replacement without displaying the UUID. `GU72_ZERO_MONTHLY_QA_ENABLED=false` and `GU72_ZERO_MONTHLY_FULFILLMENT_ENABLED=false` were reconfirmed; no LIVE billing test was enabled.
- **Stripe TEST webhook:** Created endpoint `we_1UUYUiJY9FI7byHBSrTYQfkm` at `https://stock-market-from-the-ground-up-lives.pages.dev/api/gu39-stripe-webhook`. It has the 10 required lifecycle-event subscriptions and was verified **DISABLED**. Original TEST webhook remains enabled at original hostname. The new endpoint's signing secret was generated, but automatic provider-to-provider installation was blocked by the connector safety layer; it is NOT present as `GU39_STRIPE_TEST_WEBHOOK_SECRET` in replacement Pages. This needs secure configuration from Stripe's signing-secret display and encrypted Pages settings. Never place secrets in GitHub or chat.
- **Stripe TEST price identities independently reconciled:** All three advertising one-time TEST prices are active, amount USD 100 cents, and carry the correct `ad_sandbox=true` and `site_sku` metadata. Founding 600 TEST prices are active and equal USD 4999 cents every 30 days and USD 5999 cents every 60 days. No checkout or charge was initiated. Existing global Sandbox switch remains off.
- **New independent no-charge smoke gate:** `tests/cloudflare-replacement-smoke.mjs` and `.github/workflows/cloudflare-replacement-smoke.yml` were committed on `main`. Checks public pages, canonical and sitemap, Pages Functions, Turnstile public config, private-file 404, webhook-method rejection, and safe public config. Advertising API 503 is reported as a **blocked dependency**, not a pass. Its first run exposed HTTP 308 canonical redirects for legacy `.html` paths; the test was corrected to validate redirects and canonical routes.
- **Manual fallback hardening:** GitHub Actions `.github/workflows/replacement-cloudflare-pages.yml` is restricted to `workflow_dispatch` on `main`, requiring explicit `DEPLOY_REPLACEMENT` confirmation. Native Cloudflare GitHub integration remains the production deployment source.
- **Supabase security inventory:** Advisor warns about 9 anonymous-executable and 77 authenticated-executable `SECURITY DEFINER` functions plus missing leaked-password protection; do not blindly revoke RPC access because this is the same existing production database. Review grants and internal authorization per function in separate non-disruptive security acceptance.
- **Nonpayment route evidence:** Replacement `GET /api/gu39-stripe-webhook` and `GET /api/stripe-live-webhook` return HTTP 405; the read-only `/api/runtime-health-v014259` and `/api/auth-guard-v0135` return success. `/api/ad-sales` still returns HTTP 503 pending `SUPABASE_SECRET_KEY`.
- **Source account unchanged:** Its billing Worker retains exactly `0 12 * * *` and `*/25 * * * *`; replacement Worker remains unscheduled; Stripe LIVE webhook endpoints and launch switches are unchanged. Account deletion is forbidden before complete cutover acceptance.

### Owner action required for encrypted credentials
The following original source bindings are encrypted/write-only and cannot be retrieved through the connected Cloudflare management API. Install them securely in replacement Pages from the appropriate original provider/dashboard, using `secret_text`: `SUPABASE_SECRET_KEY`, `GU39_STRIPE_TEST_SECRET_KEY`, `GU39_STRIPE_TEST_WEBHOOK_SECRET` (the **new** TEST webhook's secret, not the old one), `GU58_STRIPE_LIVE_SECRET_KEY`, `GU58_STRIPE_LIVE_WEBHOOK_SECRET` (verify valid value; rotate plaintext source credential), and `GU_F600_LIVE_WEBHOOK_SECRET`. Never turn on the LIVE activation gates merely to copy these values.

## Read-only migration acceptance gate v1.4 — October 25, 2026
- **GitHub Actions smoke run 40233818699: SUCCESS**: https://github.com/cybernexuspublishing/stock-market-from-the-ground-up/actions/runs/40233818699
- **23 noncharging checks passed, zero test failures.** These cover homepage, Store, Labs, Boot Camp Academy, HTTPS canonical/redirect origin, sitemap/robots, two Pages Functions health probes, public Turnstile sitekey, forbidden repository/static source paths, webhook GET rejection, public configuration secret-leak checks, and guest rejection by Owner-only endpoints.
- Replacement GET `/api/admin-prelive-v014247` and GET `/api/owner-zero-live-checkout` correctly reject unauthenticated guests (401). GET `/api/store-zero-monthly-qa` confirms `available:false`, `canReset:false`, and `offerClosed:true`.
- **One explicitly unresolved blocker:** `/api/ad-sales` responds 503 because the server-only `SUPABASE_SECRET_KEY` is not configured. This is not a passed advertising backend or member acceptance gate.
- Native Cloudflare GitHub integration deploys `main` automatically; manual fallback GitHub workflow separately requires `DEPLOY_REPLACEMENT` and remains nonautomatic. New Turnstile widget is scoped to production hostname only.
- No LIVE payments were tested, enabled, or initiated. The Stripe TEST destination webhook remains disabled; its signing secret must be obtained from Stripe and installed in Cloudflare encrypted settings before enabling test deliveries.
- Original Cloudflare project remains operational and its billing schedules are unchanged; the replacement billing scheduler remains inactive.

## Production cutover and deletion gates (not yet satisfied)
1. Replacement Pages deployment, Pages Functions, navigation, Admin, Store, Labs and Academy pass browser acceptance and security checks.
2. Production Supabase service credential is securely bound in replacement Pages; database and Row Level Security remain unchanged. Coordinate the Turnstile secret with Supabase Auth CAPTCHA (separate widgets cannot be assumed interoperable).
3. Configure Stripe TEST and LIVE secrets, carefully configure new webhook destinations for replacement hostname, run signed-webhook and sandbox lifecycle tests, and get explicit owner authorization for a genuine live payment test.
4. Test owner/admin operations, QA subscriptions, book keys, 419 Labs, entitlements, learning flows, advertising and external service permissions.
5. Migrate scheduler triggers to replacement exactly once; verify new Cron results and suspend the original triggers before enabling the new schedule.
6. Update public URLs, legal links, redirects, platform emails, Amazon/KDP and marketing destinations referencing the original `pages.dev` hostname. The old `pages.dev` hostname will not survive account retirement without a separately verified transfer/redirect arrangement.
7. Confirm rollback process, freeze changes, record successful CI and external acceptance evidence.
8. Obtain a **separate explicit owner approval** for deleting the original Cloudflare account, only after cutover and sustained successful operations.

## Revision history
| Version | Date | Change | Status |
|---|---|---|---|
| 1.0 | 2026-10-25 | Initial verified source/destination inventory and retirement gates | Superseded |\n| 1.1 | 2026-10-25 | Verified replacement Pages deployment, non-sensitive HTTP checks and 503 backend blocker | Superseded |\n| 1.2 | 2026-10-25 | Production replacement-origin fixes, verified SEO and Pages Functions | Superseded |\n| 1.3 | 2026-10-25 | Turnstile hardening, TEST webhook disabled, Sandbox price reconciliation, QA ID copy, noncharging smoke gate | Superseded |\n| 1.4 | 2026-10-25 | 23 verified noncharging smoke checks on interim Live account | Superseded |\n| 1.5 | 2026-10-25 | Third Cloudflare account designated master, connection and saved token mismatch verified, interim fallback paused | Active migration record |
