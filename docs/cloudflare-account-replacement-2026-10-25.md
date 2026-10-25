# Cloudflare Production Account Replacement — Migration Control v1.2
**Project:** The Stock Market: From the Ground Up  
**Status:** REPLACEMENT DEPLOYED / BACKEND CUTOVER PENDING — original account must remain active  
**Date:** 2026-10-25  
**Document owner:** Cyber Nexus / Crown & Lantern Press  
**Repository / location:** `cybernexuspublishing/stock-market-from-the-ground-up`, `docs/cloudflare-account-replacement-2026-10-25.md`  
**Google Drive location:** Not applicable; GitHub is the controlled source for this migration record.  
**Purpose:** Retain the source-to-destination inventory, secret-reentry requirements, deployment path, and cutover gates before deleting the original Cloudflare account.

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
| Pages production variables | 46 environment-variable names in source | 40 in destination, including replacement `GU_PUBLIC_SITE_ORIGIN`; 7 source names remain absent | **Backend secrets pending** |
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
- `GU72_QA_ALLOWED_USER_ID` (carry forward only if still appropriate)
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
| 1.0 | 2026-10-25 | Initial verified source/destination inventory and retirement gates | Superseded |\n| 1.1 | 2026-10-25 | Verified replacement Pages deployment, non-sensitive HTTP checks and 503 backend blocker | Superseded |\n| 1.2 | 2026-10-25 | Production replacement-origin fixes, verified SEO and Pages Functions, remaining credential and cutover gates | Active migration record |
