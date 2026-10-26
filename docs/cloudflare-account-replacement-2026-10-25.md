# Cloudflare Production Account Replacement — Migration Control v1.13
**Project:** The Stock Market: From the Ground Up  
**Status:** MASTER PRODUCTION GUEST BROWSER, TEST SIGNATURE REJECTION AND LIVE WEBHOOK HOLD VERIFIED; INVALID MEMBER TOKEN ERROR CONTRACT REMEDIATED; REAL AUTHENTICATED AND SIGNED STRIPE TEST LIFECYCLE GATES OPEN  
**Date:** 2026-10-25  
**Document owner:** Cyber Nexus / Crown & Lantern Press  
**Repository / location:** `cybernexuspublishing/stock-market-from-the-ground-up`, `docs/cloudflare-account-replacement-2026-10-25.md`  
**Google Drive location:** Not applicable; GitHub is the controlled source for this migration record.  
**Purpose:** Retain the source-to-destination inventory, secret-reentry requirements, deployment path, and cutover gates before deleting the original Cloudflare account.

## v1.13 — Production browser and LIVE webhook safety hold acceptance (2026-10-25)

**Verified guest browser acceptance:** [Premium Release — Live Browser QA run 40254490964](https://github.com/cybernexuspublishing/stock-market-from-the-ground-up/actions/runs/40254490964) completed **SUCCESS** against the Yahoo master public Pages site. Checks include Functions health, website design, public layouts, viewport containment, desktop/tablet/mobile (1440/900/390px), and **21 protected-route guest sign-in + exact intended return-destination checks** across Labs, Academy, Dashboard, Commons, Simulator, Journal and Admin. This is not authenticated Owner/member role acceptance.

**LIVE Stripe safety incident:** Direct Stripe LIVE API read unexpectedly found Yahoo master webhook destinations `we_1UUZvAJL0O4GGVBH5Tp77DVM` and `we_1UUZvEJL0O4GGVBHa1CTpKMO`, plus interim Founding 600 destination `we_1UUUNaJL0O4GGVBHGeGK0yvQ`, showing `status=enabled` although earlier migration acceptance recorded these as disabled. The cause/actor has **not** been established; do not infer who activated them. As an Acting Owner non-LIVE safety containment action, disabled these three staged LIVE destinations using Stripe's `disabled:true` endpoint update, and independently re-read status:
- Master primary LIVE: disabled.
- Master Founding 600 LIVE: disabled.
- Interim Founding 600 LIVE: disabled.
- **Existing original LIVE primary `we_1US06iJL0O4GGVBHevXbYV8B`: enabled and untouched** to preserve the current original site.
- Master Stripe TEST `we_1UUZqGJY9FI7byHB8Ool1VaR`: disabled pending signed Sandbox acceptance.

No LIVE charge, refund, test event, or test transaction was executed, and Cloudflare LIVE checkout/fulfillment/webhook feature flags remain false with zero master billing cron triggers. The newly staged LIVE endpoints must not be re-enabled without an authorized, reconciled cutover plan. Investigate any undelivered events before future LIVE activation.

**Forged member authentication negative test:** Expanded `tests/cloudflare-master-source-exposure.mjs` to probe Admin context, private Academy and non-sample Lab with a deliberately invalid Bearer token. Initial CI [40254838738](https://github.com/cybernexuspublishing/stock-market-from-the-ground-up/actions/runs/40254838738) found **21 passed / 1 failed**: Academy returned HTTP 503 for forged token rather than appropriate auth denial. Reviewed common `member-tool-access.js`: a GoTrue HTTP 403 was mislabeled as infrastructure outage 503. Corrected `memberIdentity()` so GoTrue 401/403 map to HTTP 401, while genuine backend failures retain HTTP 503. Added isolated `tests/test_member_tool_access_error_contract.mjs` and wired it into `.github/workflows/master-source-exposure.yml`. **CI 40255159772 is pending or queued at record creation**; do not claim this new remediation accepted until it completes successfully.

**Protected Lab architectural follow-up:** Route classification currently describes `lab-player` as a public preview and middleware has an embedded-player exception. The private Lab API enforces entitlement and authored exercise permissions, and the lab-player HTML initializes with content hidden; however direct Lab player HTML gating requires distinct browser acceptance and a coordinated change that preserves public demo samples and existing authenticated iframe behavior. Do not infer full protection of all canonical direct deep links from Registry guest redirect PASS alone.

**Control boundaries retained:** $0 external spend; owner-locked Cloudflare build-token scope/name/permissions/expiry/IP settings not changed; GitHub main only; original source accounts not deleted; no LIVE payment testing.

## v1.12 — Owner-controlled authentication and Stripe TEST negative-signature gates (2026-10-25)

**Authorization and spending:** Acting Owner may complete non-LIVE code, Cloudflare, GitHub, Supabase and Stripe TEST tasks, but cannot test/activate LIVE payments; no paid services or metered billable workflows without prior Owner approval. The Owner independently locked Cloudflare build-token name, permissions, scope, expiration, IP filters and lifecycle: **no changes to any of those token settings without a separate explicit Owner approval**.

**Current production environment verification:** Yahoo account `4fe9e562905cf607b6f004d2374299fc`; master Pages is GitHub-connected with `bash scripts/build-pages.sh`, output `public`, six out of six required encrypted Production secrets. All inspected LIVE checkout, webhook, launch approval, fulfillment and temporary $0 QA gates remain disabled, and `ground-up-billing-scheduler` has zero schedules. No account switch, LIVE payment operation, webhook LIVE test event or source account retirement was made.

**Stripe TEST negative-signature acceptance:** Added two actual HTTP POST attempts containing **intentionally invalid** TEST-only event signatures to `tests/cloudflare-master-source-exposure.mjs`. Both must return HTTP 401 with `BAD_SIGNATURE` before reading the owner test-mode switch or any shadow ledger. [19/19 tests passed, 0 failures, 0 payment operations; CI 40254098810](https://github.com/cybernexuspublishing/stock-market-from-the-ground-up/actions/runs/40254098810). This does not verify the test `whsec` matches Stripe's destination, nor does it count as provider-signed webhook or real TEST subscription lifecycle acceptance.

**Sandbox protection:** Database `public.gu39_sandbox_settings` currently contains zero enabled rows, while the Yahoo Stripe TEST webhook destination `we_1UUZqGJY9FI7byHB8Ool1VaR` remains disabled and the original TEST delivery destination remains active. The handler requires correct configured TEST key prefixes, genuine raw-body HMAC, `livemode:false`, expected Stripe TEST account, a separate Owner-controlled DB mode switch and intent-bound shadow-only mutations. Creating arbitrary Stripe TEST subscriptions without prepared shadow intents could generate unrelated webhook failures on the original destination; do not blindly enable or create new events.

**Protected learning routes:** Source review found an outdated `assets/js/navigation.js` guest Registry redirect to public `lab-samples.html`; another boundary already redirected to Sign In. Updated Registry guest navigation to `/signin.html?next=` plus the URL-encoded original pathname, query and fragment. Updated `tests/test_premium_browser_live.py` to recognize protected member/staff sign-in redirects and require exact same-origin preserved destinations, rather than reporting missing premium layout hooks on the Sign In page. This is a **source fix**; full production-browser acceptance is pending the latest completed noncancelled GitHub run.

**Additional security review:** Read-only Supabase audit confirms 9 `SECURITY DEFINER` functions callable by `anon`, including intentional-looking public catalog/availability functions and authentication-dependent `my_platform_access`/`my_market_data_connections`. Public reachability does not by itself establish an exploitable defect; privilege and function-body review remains required. No production RLS or grants were weakened or changed.

**Still required before cutover:** Confirm shared Supabase Auth CAPTCHA provider/secret and URL callback allowlist accommodate Yahoo master and original rollback domains without creating sign-in regressions. The available Supabase plugin does **not** expose Auth Site URL or private CAPTCHA provider settings, and public key visibility is not proof of correct server-side matching. Execute real signed-in Owner and two-member browser tests (role isolation, deep Lab links, email verification/reset); complete carefully isolated provider-delivered Stripe TEST event, renewal, failure, refund and idempotency with independent evidence; then proceed to separately authorized LIVE billing cutover planning.

## v1.11 — Production security containment and non-LIVE acceptance (2026-10-25)

**Acting Owner scope:** Yahoo Cloudflare master account `4fe9e562905cf607b6f004d2374299fc`; Pages project `stock-market-from-the-ground-up`; GitHub repository `cybernexuspublishing/stock-market-from-the-ground-up`, branch `main`. **No LIVE payment testing, webhook activation, scheduled billing activation, or source-account deletion.**

### Deployment incident identified and contained
- Owner-supplied Cloudflare build log showed an unintended additional `npx wrangler deploy` after the proper `bash scripts/build-pages.sh` Pages build, with Wrangler automatically selecting repository root (`assets.directory='.'`) and uploading repository metadata and project-source paths to a Worker.
- Verified a **separate Workers Builds GitHub integration** in the Yahoo account targeting `stock-market-from-the-ground-up`, with `deploy_command='npx wrangler deploy'`, root `/`, and worker public/preview URLs enabled. This is distinct from the intended GitHub-connected Cloudflare Pages project.
- **Containment completed:** Disabled that Worker's `workers.dev` and Preview URLs and verified both false. Deleted its unsafe Workers Builds configuration and verified the configuration no longer exists. Deleted the redundant Worker after confirming no Worker custom domains, no Worker bindings, no Worker script routes and disabled public Worker URLs. Reverified the intended Pages project survived and the unrelated `ground-up-billing-scheduler` Worker remains intact and unscheduled.
- Repository is publicly visible on GitHub. The root-asset upload still represents an unauthorized deployment of project internals; historical access/downloads cannot be ruled out from configuration evidence alone. Assess logs and credential exposure separately, and replace the broad nonexpiring deployment token with least-privilege credentials at an appropriate controlled point.
- Regression test in `tests/cloudflare-master-source-exposure.mjs` and `.github/workflows/master-source-exposure.yml` passed **17 checks / 0 failures**. [Run 40246987048](https://github.com/cybernexuspublishing/stock-market-from-the-ground-up/actions/runs/40246987048). It verifies forbidden file paths return 403/404 from Pages, both former Worker hostnames deny access to repository metadata, protected APIs deny anonymous guests, and GET does not invoke the webhook POST handlers. The dedicated Founding 600 route has an `onRequestPost` handler only; GET correctly falls through to HTTP 404 rather than the custom 405 of other webhook routes.
- Intended Pages deployment was independently verified to use the current GitHub `main` commit `aebac3432bbaf60c8351222ef91eb0c7943a300e`, with six of six encrypted provider bindings present, all ten LIVE payment/QA switches false, and zero billing Worker cron triggers.

### Public and integration acceptance
- Current public HTTP checks passed: Home, Store, Labs, Boot Camp Academy, Sign In, Create Account, guest Dashboard document, Market Commons, Help, Privacy and Accessibility pages; correct master canonical URL; Pages Functions health 200; advertising catalog three packages and online checkout disabled; master Turnstile public key configured; guest Sandbox and Owner/Admin routes 401; protected source files 404.
- Supabase project `oxihglyfgzywsupnyicb` is `ACTIVE_HEALTHY`. Read-only counts: **419 Labs, 30 competencies, 60 storefront products, 3 advertising packages**, with global Sandbox mode and LIVE ad payments both disabled.
- Supabase Security Advisor still reports: 123 information-level RLS-with-no-policy findings (may include deliberately server-only tables), 9 anonymous-executable SECURITY DEFINER functions, 77 authenticated-executable SECURITY DEFINER functions, and leaked-password protection warning. Requires targeted privilege review; no uncontrolled permission/schema changes performed.
- Stripe TEST master webhook remains disabled; original TEST webhook remains active. Yahoo master primary and Founding 600 LIVE webhooks remain disabled; original LIVE primary webhook remains active.
- Website Playwright/mobile/accessibility and mocked Stripe signed-lifecycle CI **both passed** after correcting one five-day Academy day-3 `selfCheck` to include required decision-time evidence question. [Run 40247086344](https://github.com/cybernexuspublishing/stock-market-from-the-ground-up/actions/runs/40247086344).
- Real interactive browser acceptance was **not** completed: connected browser automation could not start due to provider wallet insufficient balance. GitHub Playwright passing is stronger source/browser automation evidence but **not a substitute for real signed-in Owner/member production sessions**.
- No real Stripe TEST provider-signed event delivery or TEST renewal/failure/refund lifecycle was executed in this batch; the existing signed-lifecycle tests were **mocked**. Do not claim webhook credential correctness or customer entitlement end-to-end acceptance.

### Remaining launch/retirement gates
1. Supabase Auth CAPTCHA and redirect/email callback compatibility for the new master widget and hostname, plus authenticated Owner/Admin and two-user isolation tests.
2. Controlled signed Stripe TEST-only webhook delivery, idempotency, lifecycle failure/renewal/refund evidence without duplicate processing.
3. Audit prior unwanted Worker publication for access/credential implications; reduce overly broad API-token scopes. Do not publish incident-specific secrets.
4. Prior to retirement, reconcile any undelivered Stripe TEST/LIVE webhook events, prove only one active billing scheduler, confirm rollback, and obtain explicit irreversible source-account deletion approval.
5. No LIVE payment tests or checkout/webhook activation are authorized by this gate.

## v1.10 — Master Production encrypted-secret audit and no-payment runtime acceptance (October 25, 2026)

**Production master:** Cloudflare Yahoo account `4fe9e562905cf607b6f004d2374299fc`, Pages project `stock-market-from-the-ground-up`, public origin `https://stock-market-from-the-ground-up-d1r.pages.dev`.

**Encrypted binding readback:** Direct authenticated Cloudflare GET through the Yahoo linked connection returned **45** Production environment entries. The following five are present with type `secret_text`: `SUPABASE_SECRET_KEY`, `GU39_STRIPE_TEST_SECRET_KEY`, `GU39_STRIPE_TEST_WEBHOOK_SECRET`, `GU58_STRIPE_LIVE_SECRET_KEY`, `GU58_STRIPE_LIVE_WEBHOOK_SECRET`. The sixth, **`GU_F600_LIVE_WEBHOOK_SECRET`, remains absent** and must be entered as an encrypted Production binding for the Yahoo master Founding 600 LIVE webhook destination `we_1UUZvEJL0O4GGVBHa1CTpKMO`. No secret values were requested, logged, displayed or copied.

**Operational switches:** All ten recorded LIVE checkout, LIVE webhook, fulfillment, launch-approval and temporary $0 QA flags are `false`. The Yahoo master Worker `ground-up-billing-scheduler` remains unscheduled (**zero cron triggers**) with `workers.dev` and Worker preview URLs disabled. The original billing scheduler remains untouched.

**Production deployment:** With all inspected LIVE payment flags verified disabled, the previously successful master GitHub Pages deployment was retried through the Cloudflare API to reapply current Production bindings. New deployment `c9072f37-c522-4466-a302-71d421e58b52` completed **SUCCESS**; no payment or webhook event was issued.

**Confirmed backend recovery:** Prior to this redeployment the public `GET /api/ad-sales` returned HTTP 503, and unauthenticated `GET /api/gu39-sandbox` returned HTTP 503. After deployment, the advertising endpoint returned **HTTP 200** containing precisely the three canonical sponsorship packages with `onlineCheckoutEnabled:false`, and `GET /api/gu39-sandbox` returned **HTTP 401** for unauthenticated users. This supports **read-only public Supabase service connectivity and guest authorization** only; no authenticated staff flow, signed webhook delivery or commerce fulfillment is implied.

**Actions acceptance:**
- [Yahoo master public/security check run 40245646828](https://github.com/cybernexuspublishing/stock-market-from-the-ground-up/actions/runs/40245646828): **22 passed, 0 failed, no blocked public checks, 0 LIVE payment operations**. Stronger acceptance now requires exactly three advertising packages, master Turnstile site key, public checkout off, and guest Sandbox/Owner route rejection.
- [Yahoo master nonpayment backend run 40245700851](https://github.com/cybernexuspublishing/stock-market-from-the-ground-up/actions/runs/40245700851): **PASS**, five encrypted provider bindings present, first three required Supabase/Sandbox bindings present, `GU_F600_LIVE_WEBHOOK_SECRET` identified explicitly as **pending LIVE-only**, guest access denied on three guarded endpoints, public advertising API 200 with online checkout disabled, 0 payment operations. This workflow is now **manual-only** to avoid repeated automatic runs.

**Independent provider routing audit:** Stripe TEST master endpoint `we_1UUZqGJY9FI7byHB8Ool1VaR` remains **disabled**; the original TEST endpoint remains **enabled**. Stripe LIVE primary Yahoo endpoint `we_1UUZvAJL0O4GGVBH5Tp77DVM` and LIVE Founding 600 Yahoo endpoint `we_1UUZvEJL0O4GGVBHa1CTpKMO` remain **disabled**; the original LIVE primary endpoint remains **enabled**. Connected Supabase project `oxihglyfgzywsupnyicb` reports `ACTIVE_HEALTHY`. No LIVE payment testing was attempted.

**Next gates:** Securely add the one missing Founding 600 master signing secret; confirm its presence only; coordinate Supabase Auth Turnstile and redirect destinations without breaking original sign-ins; execute authenticated member A/B and Owner/Admin acceptance; perform actual signed TEST-only webhook acceptance when separately enabled/approved; then plan LIVE webhook/scheduler cutover and independently authorized source-account deletion. Do not call this a fully accepted member or commerce production migration until all gates close.

## v1.9 — Canonical Yahoo master routing and GitHub Actions credential verification (October 25, 2026)

**Controlling deployment identity:** Yahoo master account `4fe9e562905cf607b6f004d2374299fc`, Cloudflare Pages project `stock-market-from-the-ground-up`, public origin `https://stock-market-from-the-ground-up-d1r.pages.dev`, GitHub repo `cybernexuspublishing/stock-market-from-the-ground-up`, branch `main`. This **supersedes** the earlier interim site `stock-market-from-the-ground-up-lives.pages.dev` for all new deployment decisions. Historical interim/original documents and sites are retained only for rollback/audit; do not mistake them for the current master.

**The existing GitHub Actions secret name remains `SMFGU_LIVES_PAGES_DEPLOY`.** The name is a historical label, **not** authorization to target the interim Live account. GitHub Actions verified that the stored secret can read the exact Yahoo master account and the correct GitHub-linked Pages project without reading, logging, or exposing token material. The owner reported a no-expiration, all-account/all-zone permission policy; this is broader than routine deployment requires. Schedule a separately approved credential rotation to a master-account-scoped, least-privilege, time-bounded deployment token. No credential was changed during this audit.

**Repository correction, commit `ec3dc49000745c429962c9ceea3b59efad191f01`:**
- `.github/workflows/replacement-cloudflare-pages.yml` fallback target changed from interim account/project/URL to **Yahoo master**. Deliberate `if: false` is **retained**: fallback deployment cannot execute; native GitHub `main` → master Pages deployment remains authoritative.
- `.github/workflows/lives-beta-guest-acceptance-v014270.yml` and its GET-only browser/API smoke source now validate the **Yahoo master**, not the interim site.
- Interim Cloudflare smoke is manual-only for historical rollback; it is not a push-triggered production gate.
- New `.github/workflows/cloudflare-master-target-guard-v014274.yml` checks source routing **and** performs GET-only Cloudflare API authorization/identity checks using `SMFGU_LIVES_PAGES_DEPLOY`. It fails if the project/account/hostname/GitHub main source differ or any checked LIVE launch flag is enabled.
- Source guard tests `tests/test_cloudflare_master_target_v014274.mjs` protect against accidental return to interim/old deployments, and confirm the inactive master Worker still has zero cron triggers.

**Current newly run verification:**
- [Canonical master source + Cloudflare account-token guard — PASS](https://github.com/cybernexuspublishing/stock-market-from-the-ground-up/actions/runs/40242420716): both jobs succeeded, including the account/project GET checks using the masked GitHub Actions secret.
- [Yahoo master guest + Free-unit/noncharging API acceptance — PASS](https://github.com/cybernexuspublishing/stock-market-from-the-ground-up/actions/runs/40242420842). This checks public routes, anonymous denials and disabled founding checkout, **not** authenticated real-member signups or payments.
- The previously scheduled 19:05 America/Chicago beta health check was updated to the master origin and account; no change in scheduled time.

**Unchanged integrations:** Existing Supabase project, Stripe LIVE and TEST accounts, prices, users and entitlements remain unchanged; no LIVE payments were run, no signed-webhook cutover or second billing cron was activated, and no Cloudflare accounts were deleted. The preexisting **six encrypted provider-secret installation + Supabase Auth CAPTCHA/redirect + member and TEST payment lifecycle** gates below remain open. **Not a paid-beta go-live acceptance.**

**Connector limitation:** The ChatGPT Cloudflare plugin currently reports an ineligible linked-account error, so the current check used the GitHub Actions credential with GET-only account/project API requests; do not claim a direct ChatGPT Cloudflare account login was successful.

## Master pre-secret configuration closure — migration gate v1.8 (October 25, 2026)

**Permanent master account:** `4fe9e562905cf607b6f004d2374299fc`.
**Master Pages hostname:** https://stock-market-from-the-ground-up-d1r.pages.dev/.
**Latest acceptance basis:** earlier successful master 20-check public/security acceptance and migration configuration readbacks. The additional final pre-secret acceptance workflow is https://github.com/cybernexuspublishing/stock-market-from-the-ground-up/actions/runs/40241909937; **SUCCESS (completed 2026-10-25)**: 40-variable master pre-secret baseline, inactive and nonpublic Worker, 12 shutdown switches, 20 public/security smoke checks, zero failures and zero payment operations verified.

### Work completed this batch

1. Added a read-only GitHub Actions audit `.github/workflows/master-presecret-inventory.yml` and executed it successfully: https://github.com/cybernexuspublishing/stock-market-from-the-ground-up/actions/runs/40241507124. It verified **36 original master production bindings** before the final parity update, intact `main` GitHub deployment, no preview deployment, no master Worker cron or public endpoint, and all LIVE payment flags false. It compared against the original 46-variable inventory without revealing any secret values.
2. The inventory identified 11 absent original names: the **six** encrypted provider credentials; editor controls `ENABLE_BOOK_CATALOG_EDITS_V135`, `ENABLE_SHOWCASE_CREATION_V135`; inactive QA Price/Product IDs `GU71_ZERO_LIVE_PRICE_ID`, `GU71_ZERO_LIVE_PRODUCT_ID`; and the designated private QA member identifier `GU72_QA_ALLOWED_USER_ID`.
3. Read the LIVE Stripe **catalog objects only** to verify that one active USD $0 one-time QA Price exists (`price_1US1eWJL0O4GGVBH7f78HcMo`, `prod_VSxZRZ8jlX5pW7`). This was a read-only catalog lookup; **no LIVE payment was tested**.
4. Installed the four available safe metadata/settings in Yahoo master Pages: the two editors deliberately `false` until authenticated acceptance and the two $0 LIVE QA Product/Price IDs (metadata only). GitHub Actions https://github.com/cybernexuspublishing/stock-market-from-the-ground-up/actions/runs/40241607110 **SUCCESS** and confirmed **40 production environment variables**, all checked LIVE/zero-dollar QA execution flags still false, encrypted master Turnstile and billing Worker secret bindings preserved, and **zero payment operations**.
5. Kept `GU72_QA_ALLOWED_USER_ID` absent intentionally. Do not invent or substitute a member ID. This is a QA-only identifier and not required to render the public site; fill only after verifying the designated QA account.
6. Created the explicit six-secret user entry guide `docs/cloudflare-yahoo-master-secret-handoff-v1.0.md`, including matching Stripe TEST and disabled master LIVE webhook IDs and all shutdown controls. This guide contains **no credential values**.
7. Created `.github/workflows/master-postsecret-readiness.yml` for later owner-triggered GET-only backend and secret-**presence** acceptance; it does not display or read secret material and does not initiate payments. Its advertising backend check remains **blocked** while master `SUPABASE_SECRET_KEY` is missing.
8. Added `.github/workflows/master-presecret-final-acceptance.yml` to recheck the **40-variable** baseline, six expected encrypted-secret gaps, all shutdown flags, inactive master Worker, plus the standard 20 GET-only public smoke checks. **Run 40241909937 passed: 20 checks, 0 failures, 0 payment operations.**
9. Restored completed one-time migration workflows to manual-only operation to prevent accidental reinvocation. The previous interim Live fallback deployment workflow remains paused. Original and interim Cloudflare projects remain as rollback dependencies.

### Remaining blockers (not yet accepted)
- **Six encrypted provider secrets**: `SUPABASE_SECRET_KEY`, `GU39_STRIPE_TEST_SECRET_KEY`, `GU39_STRIPE_TEST_WEBHOOK_SECRET`, `GU58_STRIPE_LIVE_SECRET_KEY`, `GU58_STRIPE_LIVE_WEBHOOK_SECRET`, `GU_F600_LIVE_WEBHOOK_SECRET`. Provide values **only via encrypted Cloudflare Production secret input**, never chat or GitHub. See the precise handoff guide.
- **Supabase Auth CAPTCHA/redirect cutover**: the Yahoo master widget's secret in Cloudflare has not been coordinated with the single shared Supabase Auth CAPTCHA provider. Switching prematurely could break old-site sign-ins. Auth redirect URLs and email confirmation/reset callback URLs also require acceptance.
- **Authenticated member/Admin production acceptance**: OWNER, members A/B isolation, Free/paid entitlements, 419 Labs, Boot Camps, Journal, Simulator, weekly quotas, and Admin editors. Synthetic QA user needed for the disabled zero-dollar QA features, only if separately authorized.
- **Stripe TEST signed delivery/renewal/failure/refund acceptance**: master TEST webhook remains disabled until its credential is installed and verified. LIVE payment testing is still excluded.
- **Final webhook/scheduler route cutover, rollback, account retirement**: original LIVE and TEST endpoints and original billing scheduler remain active. Yahoo master Worker has no schedule and the master LIVE endpoints remain disabled. **Deleting old Cloudflare accounts now is unsafe.**
- **Supabase security advisor**: same existing database reported 123 `rls_enabled_no_policy` INFO findings, 9 anonymous and 77 authenticated-executable SECURITY DEFINER WARN findings, and leaked-password protection WARN. These are pre-existing risks requiring targeted design review; do not blindly revoke function grants or reapply migrations during Cloudflare migration.
- **GitHub credential least privilege**: Routine Actions should eventually use a separate narrow master Pages/Workers deployment token rather than a no-expiration broad account-admin key. The Cloudflare ChatGPT plugin still returns an ineligible linked-account error; nonpayment migration changes were performed through authenticated GitHub Actions and separately verified provider calls.

**Cutover verdict:** Yahoo is the authoritative **target** and already publicly accessible. Do NOT label it fully accepted for customer/member operations, switch active billing destinations or delete old accounts before the above blockers close.

## Master consolidation gate v1.7 — October 25, 2026

**Permanent account:** Yahoo Cloudflare account `4fe9e562905cf607b6f004d2374299fc`, Pages project `stock-market-from-the-ground-up`, production hostname https://stock-market-from-the-ground-up-d1r.pages.dev. GitHub `main` remains the canonical source. The public website and Pages Functions are hosted on this account, but authenticated member services are **not yet accepted** and live checkout is **OFF**.

### Completed, verified
1. Added the eight verified Stripe TEST price IDs to `GU39_STRIPE_TEST_PRICE_MAP_JSON` without enabling payments. Added AI no-charge provider defaults with `AI_SERVICE_ENABLED=false`. GitHub Actions execution: https://github.com/cybernexuspublishing/stock-market-from-the-ground-up/actions/runs/40240352562.
2. Confirmed the eight regular Stripe LIVE product/price pairs and two Founding 600 LIVE product/price pairs with **Stripe GET requests only**. Installed the corresponding public metadata maps `GU58_STRIPE_LIVE_CATALOG_JSON` and `GU_F600_LIVE_CATALOG_JSON` but left all LIVE checkout, webhook, fulfillment, and launch switches false. GitHub Actions execution: https://github.com/cybernexuspublishing/stock-market-from-the-ground-up/actions/runs/40240771767.
3. Deployed only the approved repository source `workers/billing-reconcile-stripe-only-v014129.js` as Worker `ground-up-billing-scheduler` in the Yahoo account. Wrangler config `workers/wrangler-master-billing.jsonc` has `workers_dev:false`, `preview_urls:false`, master-only billing origin and `triggers.crons:[]`. Cloudflare readback verified **zero crons**, **workers.dev disabled** and **preview URLs disabled**. https://github.com/cybernexuspublishing/stock-market-from-the-ground-up/actions/runs/40240145727.
4. Generated a new, master-exclusive `GU_BILLING_TASK_SECRET` using runner cryptographic randomness. Installed the same value as encrypted bindings into master Pages **and** the unscheduled Worker, without logging secret material. Verified both secret names are present, and that no cron was started. https://github.com/cybernexuspublishing/stock-market-from-the-ground-up/actions/runs/40240603613.
5. Configured a **disabled Stripe TEST webhook** `we_1UUZqGJY9FI7byHB8Ool1VaR` pointing to `/api/gu39-stripe-webhook` at the new master hostname, with 10 lifecycle events. Configured **disabled Stripe LIVE webhook** `we_1UUZvAJL0O4GGVBH5Tp77DVM` pointing to `/api/stripe-live-webhook` with 8 events and **disabled LIVE Founding 600 webhook** `we_1UUZvEJL0O4GGVBHa1CTpKMO` pointing to `/api/founding600-webhook` with 6 events. Their signing secrets are not yet installed in the master Pages project. Existing original-domain Stripe TEST and LIVE active endpoints **remain enabled and unchanged**.
6. Confirmed **36 configured master Pages production variables**, including encrypted Turnstile and paired billing Worker secrets. Disabled GitHub preview deployments for the new master while leaving `main` production deployment enabled. Master read-only smoke again reports **20 checks passed, zero failures**, and **zero payment operations**. One backend dependency, `/api/ad-sales` HTTP 503 for missing Supabase service secret, is marked BLOCKED rather than passed. https://github.com/cybernexuspublishing/stock-market-from-the-ground-up/actions/runs/40240859956.
7. Restored all one-time migration workflows to manual-only after execution. Legacy hardcoded interim account fallback remains **paused**. No old account, database project, Stripe product, payment routing, or billed subscription has been deleted, disabled, or changed by this gate.

### Remaining hard acceptance blockers
- **Master encrypted Supabase server key:** Install `SUPABASE_SECRET_KEY` from the existing Supabase project directly into master Cloudflare Pages Production as encrypted secret. Without it, member Admin/server APIs cannot pass acceptance. Never upload the key to GitHub/chat or make it public.
- **Stripe TEST credentials:** Install `GU39_STRIPE_TEST_SECRET_KEY` and signing secret `GU39_STRIPE_TEST_WEBHOOK_SECRET` for the **master** TEST webhook endpoint. Enable only TEST endpoint after signature and shadow-fulfillment validation. Global test toggle stays off until Owner sandbox acceptance.
- **Stripe LIVE credentials:** Install `GU58_STRIPE_LIVE_SECRET_KEY`, `GU58_STRIPE_LIVE_WEBHOOK_SECRET` (master primary endpoint), `GU_F600_LIVE_WEBHOOK_SECRET` (master founder endpoint) securely; no LIVE payment tests, checkout enablement, webhook enablement or provider-generated LIVE events were authorized.
- **Supabase Auth CAPTCHA:** Existing single Supabase project must verify the master Turnstile widget's secret. Coordinate the switch at the cutover after planning for old hostname sign-in traffic to avoid login outages.
- **Authenticated end-to-end:** Owner/Admin real-browser privileges, sign-up/sign-in, Free/member entitlements, 419 Labs, Boot Camps, Journal, Simulator, accessibility, account isolation, reset limits, email redirects; then genuine TEST-only Stripe signed webhook/cycle/failed/refund acceptance. Public GET tests are not substitutes.
- **Domain and service cutover:** Update canonical master URL and allowlisted redirects in Supabase and any external systems; only then change any active Stripe LIVE webhook destinations or cron schedules after corresponding gated testing. The original account has historical LIVE payment delivery and an active scheduler, so it MUST NOT be deleted while still processing events. Avoid duplicate billing cron activation.
- **Old Cloudflare account retirement:** Only after operational acceptance, verified no inbound routes/events/dependencies, archival, and an explicit irreversible-retirement confirmation. NO account deletions performed.

**Operational boundary:** The Yahoo hostname now serves the public site and is intended to become the one production account, but the site is **not fully ready for member onboarding or paid public launch**. The original and interim Pages accounts remain online as safe rollback/legacy endpoints until the secret, Auth and webhook gates close.

## Verified Yahoo master account — migration gate v1.6 (October 25, 2026)

**Master Cloudflare account ID:** `4fe9e562905cf607b6f004d2374299fc`. API `GET /accounts/{id}` returned HTTP 200 and account name `Stock_market_from_the_ground_up@yahoo.com's Account`. Verification used the GitHub repository Actions secret, with no token content printed.

**Master Pages project:** `stock-market-from-the-ground-up`, Pages project ID `2cf1b496-5f6a-4cb0-89ba-b1519c08154b`. Production URL: https://stock-market-from-the-ground-up-d1r.pages.dev/. Native Cloudflare integration points at GitHub `cybernexuspublishing/stock-market-from-the-ground-up`, `main`, with safe build `bash scripts/build-pages.sh`, output `public`. This project belongs to the new Yahoo master account, NOT the original account with a similar Pages project name.

**Read-only verification:** https://github.com/cybernexuspublishing/stock-market-from-the-ground-up/actions/runs/40239058367 — account authorized and Pages project listing successful. Further https://github.com/cybernexuspublishing/stock-market-from-the-ground-up/actions/runs/40239138385 — existing GitHub project build confirmed. The credential can read the Yahoo account but **cannot** read the interim Live account's Pages configuration (HTTP 403). Cross-account plaintext-configuration cloning via that token is unavailable.

**Master production baseline:** https://github.com/cybernexuspublishing/stock-market-from-the-ground-up/actions/runs/40239456570 succeeded. It installed 24 production settings on the new master Pages project: master website URLs, public Supabase URL and public key from the canonical frontend config, encrypted Turnstile secret, and deliberately false LIVE payment/fulfillment/webhook/QA flags. No LIVE payments were initiated. All settings were read back for verification; no secret values were logged.

**Master Turnstile:** New managed widget `SMFGU Yahoo Master Production Turnstile`, site key `0x4AAAAAAFlx7GxnPwFqJCMc`, hostname restricted to `stock-market-from-the-ground-up-d1r.pages.dev`. Its secret is stored as `secret_text` in the master Pages project. Supabase Auth's CAPTCHA provider is **not yet** switched to this widget (one Supabase Auth backend serves multiple sites; coordinate cutover to avoid blocking existing logins).

**Read-only public checks:** Master homepage canonical and `/sitemap.xml` both now reference the new master hostname; `/api/auth-guard-v0135` returns `ok:true`, `enabled:true` and the master site key; `/api/runtime-health-v014259` returns success; `/.git/config` returns 404. This does not prove authenticated user or commerce acceptance. Master-specific regression test `tests/cloudflare-master-smoke.mjs` and GitHub Actions workflow `.github/workflows/cloudflare-master-smoke.yml` were created to expand these checks. **GitHub Actions run 40239636063 completed SUCCESS: 20 checks passed, 0 failures, 0 LIVE payment operations.** The master advertising API HTTP 503 due to missing `SUPABASE_SECRET_KEY` remains explicitly blocked rather than accepted. Evidence: https://github.com/cybernexuspublishing/stock-market-from-the-ground-up/actions/runs/40239636063.

**Workflow safety:** Original fallback `.github/workflows/replacement-cloudflare-pages.yml` remains paused; the master bootstrap workflow requires explicit manual `BOOTSTRAP_MASTER` confirmation after its initial one-time execution; master credential verification workflow is manual-only. Native GitHub integration remains authoritative for production build deployment on the master account.

**Open migration gates:** master Supabase server-only credential `SUPABASE_SECRET_KEY` and all required Stripe TEST/LIVE signing and API secrets remain unset. Master Worker/billing scheduler has not been verified as migrated and must NOT be scheduled before the cutover. Member Auth and Admin browser acceptance, Supabase CAPTCHA coordination, Stripe TEST webhook, nonpayment entitlement checks, and provider delivery tests remain open. No LIVE payment testing or billing configuration activation is authorized. Original and interim Cloudflare accounts and Stripe webhook destinations remain unchanged.

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
| 1.0 | 2026-10-25 | Initial verified source/destination inventory and retirement gates | Superseded |\n| 1.1 | 2026-10-25 | Verified replacement Pages deployment, non-sensitive HTTP checks and 503 backend blocker | Superseded |\n| 1.2 | 2026-10-25 | Production replacement-origin fixes, verified SEO and Pages Functions | Superseded |\n| 1.3 | 2026-10-25 | Turnstile hardening, TEST webhook disabled, Sandbox price reconciliation, QA ID copy, noncharging smoke gate | Superseded |\n| 1.4 | 2026-10-25 | 23 verified noncharging smoke checks on interim Live account | Superseded |\n| 1.5 | 2026-10-25 | Third Cloudflare account designated master, initial credential mismatch, interim fallback paused | Superseded |\n| 1.6 | 2026-10-25 | Master identity, Pages GitHub build, 24-variable no-payment baseline, Turnstile and public URL verified | Superseded |\n| 1.7 | 2026-10-25 | Master inactive billing Worker, paired secret, 36 vars, catalog metadata, three disabled new webhook targets, noncharging 20-check acceptance | Superseded |\n| 1.8 | 2026-10-25 | 40-variable safe master parity, six-secret handoff, pre/post-secret gates, retirement holds | Superseded |\n| 1.9 | 2026-10-25 | Verified canonical master account routing, GitHub credential and no-charge guest smoke checks | Superseded |\n| 1.10 | 2026-10-25 | 45 Production bindings, 5/6 private credentials, read-only backend restored, 22-check QA and 0 payments | Superseded |\n| 1.11 | 2026-10-25 | Contained unintended Workers Builds source publication, 17 security and full Playwright tests pass, six secrets present; authenticated/real Sandbox open | Superseded |\n| 1.12 | 2026-10-25 | 19/19 Stripe TEST negative HMAC/source tests, Lab guest return redirect corrected, Owner token lock enforced; real member and Stripe TEST gates remain | Superseded |\n| 1.13 | 2026-10-25 | Guest browser acceptance PASS; three staged LIVE webhook destinations restored disabled; forged Academy token 503 remediation in CI | Active migration record |
