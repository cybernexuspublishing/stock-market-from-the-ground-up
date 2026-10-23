## Latest D17 engineering checkpoint — c1e77a377615 (2026-10-22)

**Owner direction:** Complete all non-Lessons-Prototype implementation at no added provider cost, do not interrupt the Owner for routine updates; wait for exact approved Lessons Prototype version before touching that teaching flow. Reserve coordinated production/browser/member/paid tests for D18. No incomplete requirement is declared accepted.
**Implemented in source on main:** Member-owned Support backend modern Supabase key handling, streamed byte limits, ticket ownership before reopen, narrowed response projection, upstream error masking; existing member Support UI now enables closed/resolved ticket reopening and both TS/compiled JS were updated. Fixed Admin Stage B inspect-member crash and restored real Inspect controls. Generated canonical sitemap/robots and private-route noindex only during controlled Pages build, and sitewide keyboard Skip to main content links with high-contrast CSS. No user identity, role, Stripe, license, secret, SQL, or teaching-prototype changes.
**QA contracts:** New tests for Support API, reopened-ticket frontend parity, Admin mobile/desktop read-only inspection, canonical SEO sitemap, universal keyboard skip links. Existing sitewide Playwright workflow and D18 source acceptance workflow contain those tests; exact-head CI and full browser execution are **not independently observed**. `scripts/deployment17_source_security_readiness.mjs` actual source-function invocation: **11 of 11 guard checks present, 0 known source blockers**. `scripts/deployment18_acceptance_matrix.mjs` depends on this guard report. These are source guards, not a certification of complete D17 scope.
**D17 incomplete:** all production/integration browser and accessibility acceptance, remaining CMS and notices/editor workflows, actual email delivery, support database transactional atomicity and retries, GWS client/tenant isolation, monitoring and incident response, verified database restore, canonical custom domain, legal/privacy and all live provider permissions and billing. All must be resolved or the Owner must explicitly de-scope them before paid launch.
**Owner actions now:** NONE. For live SEO custom-domain approval, optionally configure `GU_PUBLIC_SITE_ORIGIN` once final HTTPS domain is confirmed at D18; fallback is the known Pages hostname. Previously installed D09 SQL must not be rerun. Stripe LIVE flags remain false.
**Detailed report:** `docs/v0.14.0.157_DEPLOYMENT_17_OF_18_SITEWIDE_GAPS.md`. Previous historical handoffs follow below.

---

## LATEST — Deployment 17 source engineering and D18 gates (2026-10-22)

**HEAD before this update:** `398324daeaa68d753f97c2f04e595527099ac235`. **Manifest:** v0.14.0.155. Stripe LIVE billing approval and fulfillment remain OFF.
**Prototype restriction:** DO NOT copy, change, interpret, or deploy the independent Lessons Prototype until the Owner supplies the approved prototype version number. No source touched the lessons prototype.

**Material source fixes completed:**
1. `assets/js/admin-unified-preview-v014156.mjs` member Inspect action: removed undefined `data` reference in member-summary view and correctly attached per-row Inspect actions to real paginated Members results. Read-only Owner/Admin permissions preserved.
2. `functions/api/support.js`: modern Supabase service-key PostgREST compatibility, 16 KiB bounded actual POST bytes, member-owned ticket reopen confirmation, valid numeric ID, member-scoped reply status PATCH and minimized ticket details. All current Support actions remain in place. No DB change.
3. `scripts/build-public-seo.mjs`: static site builds now generate robots.txt, sitemap.xml and canonical tags for *allowlisted public pages* only; nonpublic HTML gets noindex. Existing legal noindex is preserved. `scripts/build-pages.sh` calls it. No canonical custom domain has been independently verified; optional `GU_PUBLIC_SITE_ORIGIN` can be set at D18 to a verified HTTPS host. Source default remains the known Pages hostname.
4. `scripts/deployment17_source_security_readiness.mjs`: 10 source guard checks and evidence JSON. **Direct V8 current-source run: 10/10 guards present, zero blockers.** Not a production test. `scripts/deployment18_acceptance_matrix.mjs` now requires its zero-blocker report before generating the D18 source ledger.
5. CI/acceptance tests: `tests/test_v014157_support_security.mjs`, `tests/test_v014157_admin_read_browser.mjs`, `tests/test_v014157_public_seo.mjs`. Registered in `.github/workflows/sitewide-playwright-v014136.yml`, `.github/workflows/deployment18-source-acceptance.yml`, and shared D17 source runner.
6. Source modules parsed and controlled member-owned/foreign-ticket/active-ticket/input limit smoke cases executed with mock network: PASS. Playwright exact HEAD/Cloudflare production/Supabase/Stripe REAL acceptance remain UNVERIFIED per Owner's instruction to hold comprehensive testing until D18.

**Actual D17 completion boundary:** only high-risk source repairs and static SEO build are implemented/checked. The complete D17 scope still includes CMS editorial workflows, communications/email delivery, all responsive routes, manual WCAG, privacy/legal, scheduler delivery, true Postgres backup *restoration*, GWS tenant isolation and real production monitoring. These are NOT certified as done. D18 remains a hard launch gate.

**Owner actions now:** NONE. Existing SQL v102/v103/v107/v149/v149b must not be reapplied. No new Cloudflare secret/KV/D1/cron, Supabase SQL, Stripe product/price/charges, provider subscription or changes to the Lessons Prototype were made. Verify a final custom-domain canonical origin, production SHA, approved Stripe LIVE Price IDs and user-authorized paid lifecycle at D18.

**Detailed D17 evidence:** `docs/v0.14.0.157_DEPLOYMENT_17_OF_18_SITEWIDE_GAPS.md`. Prior notes below remain the historical source of earlier partial stages.

---

## CURRENT HANDOFF — D15 Commerce parity + D16 unified Admin Stage B (2026-10-22)

**Verified repository source before this handoff:** `4052ced18f64b24dd93f067d079a5b76d3c1bc34`. Manifest still v0.14.0.155; commercial flags OFF.
**Lessons Prototype:** Owner is working separately; implementation frozen until the Owner supplies **approved prototype version number**. This work does not change lesson teaching modes or content.
**D15 source:** restored `ONDEMAND_MONTHLY` $19.99/month to static listing, guarded five static membership prices/intervals, eight screenshot-only SKU amounts and five 30-day Book Keys. No Stripe LIVE price IDs or merchant lifecycle verified.
**D16 source:** Members/Audit paging, single-page search scope disclosure, minimal member summary API, role permission summary, server-wide `control_panel.access` plus module permissions, client read allowlist, current legacy editors retained. Admin Stage B read-only integration is PARTIAL, not migrated edit-acceptance.
**Tests:** targeted source parsing/pure-helper checks passed; exact-head GitHub CI, Cloudflare/Supabase runtime, Playwright, commerce lifecycle and editor/Owner acceptance deferred to D18.
**Owner actions now:** NONE. No SQL, Cloudflare setting, Stripe change or paid-provider invocation. No launch flags altered.
**Source detail:** `docs/v0.14.0.155_D15_D16_ADMIN_STAGE_B_AND_COMMERCE_PARITY.md`.
**Remaining:** D15 real LIVE merchant/entitlement lifecycle validation; D16 Stage B editing/mutation parity and Stages C–E; D17 website/system completeness; D18 full acceptance and consolidated Owner controls.

---

## LATEST CHECKPOINT — Deployment 15 Memberships and Billing (2026-10-22)

**Repository source head before this handoff update:** `3358285465ecebaacd3a310db0081afd324bf8c3`.  
**Release version:** v0.14.0.155. **Paid launch:** OFF, no Stripe LIVE charge or fulfillment authorization granted.  
**Owner instruction:** Teaching/Lessons Prototype remains **FROZEN FOR IMPLEMENTATION** until Owner supplies its **approved prototype version number**. Do not change the teaching prototype, lesson behavior, grading methodology or instructional formats while working on commerce.  
**Current deployment:** D15 — source security and integration increment, NOT 100% production accepted.

### Changes since D14 checkpoint
- `functions/api/stripe-billing-portal-v014122.js`: bounded streaming 1-KB request parser instead of read-then-validate; detects falsified/missing Content-Length and malformed bytes, fails before external calls.
- `functions/api/member-tool-access.js`: legacy Supabase JWT matching corrected; modern opaque `sb_secret_` stays in API key header, not JWT Authorization.
- `functions/api/stripe-billing-portal.js`: permanent unversioned public alias. `assets/js/my-purchases.js` now calls it, with prior versioned route preserved for backward compatibility.
- Tests and workflow: `tests/test_v014155_portal_and_entitlement_boundaries.mjs`, `.github/workflows/member-billing-portal-v014122.yml`, and `scripts/dev-program-source-verification.mjs` updated.
- **Direct actual source checks PASSED:** streaming 1,025-byte fake request rejected HTTP 413, input reader cancelled/released, key regex matches proper JWT but not modern `sb_secret_`, and all five changed JS source files parse. **Exact-head Actions and LIVE runtime NOT verified**.
- Full D15 document: `docs/v0.14.0.155_D15_SOURCE_CONTINUATION_BILLING_PORTAL_AND_ENTITLEMENTS.md`.
- **Owner manual action at this checkpoint:** NONE. No Supabase SQL, Cloudflare variable, Stripe merchant config, real charge, membership SKU, price, entitlement or educational prototype modification.
- Remaining D15 production gate: real eight-SKU Stripe LIVE provider/cadence checks, real signed paid lifecycle & idempotency, book rights/keys, taxes/legal/customer email delivery, real member/Showcase/RLS, scheduled reconciliation, and full D18 integrated acceptance.
- **Next:** Continue remaining D15–D17 source work while respecting instructional prototype freeze; all comprehensive testing and launch acceptance coordinated at D18. Do not mark D15 complete from source evidence.

---

## ADDENDUM — D13 graded client race hardening (2026-10-22)

**Newest verified source checkpoint before this documentation commit:** `d8930a5bef694f8e5b3522dc9ebb04b1c2b54e34`.
- `assets/js/interactive-training.js`: per-mount generation/cancel contract; old `available`, `start`, `answer` and `resume` responses or errors no longer render into a subsequent mode/ Lab UI. Server-side `expectedStep` and private answer-key handling unchanged.
- `assets/js/lab-player.js`: cancels old training state on mode rerenders, ignores outdated completion callback notices.
- Added `tests/test_v014153_training_stale_mode.mjs` and registration in curriculum CI / `scripts/dev-program-source-verification.mjs`.
- **Source syntax parse passed. Full asynchronous Playwright/runtime behavior remains deferred to D18, not claimed accepted.**
- Source report: `docs/v0.14.0.155_D13_STALE_ASSESSMENT_UI_HARDENING.md`.
- **Owner input now:** NONE. No new Supabase SQL, Cloudflare binding, Stripe change or license cost required.

---

# CURRENT DEVELOPMENT CHECKPOINT — D10 / D11 / D14 SOURCE CONTINUATION

**Project:** The Stock Market: From the Ground Up  
**Date:** 2026-10-22 · **Main source before this handoff commit:** `a717bf93e4969ab13cc214063a592673498cdfb0`  
**Authoritative release manifest:** `v0.14.0.155` (paid checkout and LIVE Stripe fulfillment still **disabled**).  
**Owner directive:** Continue remaining D09–D18 engineering with **comprehensive integration/testing and production acceptance deferred until D18**. Do not interrupt the Owner unless Cloudflare/Supabase account action is indispensable to continue.  
**Production:** NOT ACCEPTED; no accidental launch inferred from source commits.

## New production-safe work committed
1. **D10 Market Data & Trading:** `assets/js/market-bars-import-v014150.js`, `advanced-tool.html`, `assets/js/advanced-tools.js` now handle 2MB/20k-row local CSV inputs, timezone-explicit strict chronology and OHLCV integrity without silent filtering. Invalid upload clears stale bar data. Generation-based stale-import guards prevent a slow prior file read from replacing newer data. Market observations remain member-supplied UNVERIFIED, without rights certification or assumed missing bars.
2. **D10 tests staged for D18:** `tests/test_v014150_market_bar_import.mjs`, wired into `.github/workflows/research-tools-v014145.yml` and `scripts/dev-program-source-verification.mjs`.
3. **D11 and D13 visual continuity:** `assets/js/lab-player.js`, `lab-player.html`, `assets/css/lab-learning-layout-v014151.css` now place any **existing approved portable teaching visual** in a desktop sticky column beside guided practice, decision writing and secure graded questions; on mobile it stacks. Missing source image is explicitly labeled missing, not fabricated or assumed historical.
4. **D11 checks staged for D18:** `tests/test_v014151_lab_visual_layout.mjs`, attached to existing curriculum workflow and reusable verifier.
5. **D14 original instruction:** `assets/js/bootcamp-day05-v014154.js` plus `assets/css/bootcamp-day05-v014154.css`, `bootcamp.html` and `assets/js/bootcamp.js` add truly original hypothetical Day 05 candlestick body-percent instruction with visible 0.06 ÷ 0.20 × 100 teaching, typed answer, 2-miss guided-choice scaffolding and constructed figure. No made-up historical market evidence or official grade.
6. **D14 checks staged for D18:** `tests/test_v014154_bootcamp_day05_visual.mjs`, wired into original CI and program verifier.
7. Detail: `docs/v0.14.0.155_D10_D11_SOURCE_CONTINUATION_OCT22.md` and `docs/v0.14.0.155_D14_DAY05_CANDLE_EDUCATION_SOURCE_CONTINUATION.md`.

## Evidence distinction
- **Direct bounded source smoke:** 2 valid OHLCV bars with correct 09:30 ET / 13:30 UTC offset; 8 invalid CSV variants rejected; source syntax/element checks on touched tool/Lab/Bootcamp modules passed.
- **Full CI, Playwright, member A/B, Cloudflare deployed commit, Supabase live state, manual accessibility, rubric/editorial/rights review, sitewide operational/commerce production QA:** *Deferred to final D18 per Owner instructions; no passing evidence claimed.*
- **Labs:** 419 IDs registered, **0/419 complete recorded editorial decisions**; 94 Foundations and 325 non-Foundations remain individually instructionally incomplete/unaccepted.
- **Bootcamp:** 30 days registered, **0/30 complete recorded editorial decisions**; new Day 05 source practice is only part of one lesson and not a graded day completion.
- **Competencies:** 30 canonical definitions, 30 full assessment/production acceptances not proven.
- **D15:** LIVE payments still locked. **D16:** staged unified Admin shell, B–E migration pending. **D17:** broad site/ops work open. **D18:** full acceptance open.

## Owner-only requirements at this checkpoint
**NONE NOW.**
- **Supabase:** No new SQL or authentication object required by D10/D11/D14 source commits; installed D09 SQL must NOT be rerun.
- **Cloudflare:** No new binding, secret, cron, KV, DNS, or paid resource needed for these client/static additions. Exact deployed SHA is unverified.
- **Stripe:** No catalog, product, pricing, customer entitlements or LIVE flags changed. No real-money transaction.
- **Content/data rights:** No new external historical data or manuscript copied into public static assets.
- **Final manual package:** Accumulate genuinely required Cloudflare/Supabase/account and signed LIVE payment authorizations for D18, not repeated piecemeal requests.

## Continuity and next development
Keep implementing D11/D12 individual original instructional Lab content and D13 grading and D14 Bootcamp depth while preserving current 419 IDs, existing manuscript locks, rights restrictions and the single current membership database. Final source count alone is not acceptance; separate ten statuses at D18.

---

## D09 final retrieval quality correction — 2026-10-22

**Last observed source head before this handoff commit:** `ea66afde4ca2f2b677a23b3d8f7c69cb3ed098a6`.
- Real topic-matching bug found and fixed: multi-word terminology aliases (e.g. “previous day high” twice) originally normalized only one occurrence. First proposed whitespace-splitting fix was **caught failing in direct source execution** because adjacent matches shared a space; it was corrected to a non-consuming lookahead with lexical word boundaries.
- **PASS direct current-source smoke:** five normalization/relevance vectors covering repeated PDH, tape and MFE synonyms, VWAP case normalization and source topic ranking. The regression assertions are committed in `tests/test_v014149_tutor_retrieval.mjs`.
- This source check supplements, but does not replace, complete GitHub Actions, real member/browser QA, content editorial acceptance or Cloudflare/Supabase runtime proof.

---

# CURRENT HANDOFF — Deployment 09 Reopened for Remaining Acceptance (2026-10-22)

**Project:** The Stock Market: From the Ground Up — unified website, books and curriculum  
**Selected Owner master prompt:** Version 2, first line **09 of 18**; process D09–D18 without inventing subsequent completed status  
**Existing release manifest:** `v0.14.0.155` (`customerCheckoutApproved=false`, `liveStripeFulfillmentEnabled=false`). This is NOT a v0.14.0.159 production release.  
**Latest repository head observed before this handoff write:** `ce2db970c44864e5d040e2ef7b81dde5a03a28b1` (`main`).  
**Previous D09 original PR:** #123 merged; previously installed Supabase v102, v103, v107, v149, v149b **DO NOT RERUN**.  
**Deployment 09 current acceptance:** PARTIAL SOURCE; DIRECT SOURCE SMOKE PASS; CI EXACT-HEAD NOT VERIFIED; LIVE PRODUCTION NOT ACCEPTED.  
**Deployments 10–18:** All previously committed work preserved; unresolved work remains documented in original reports below.

## This turn — source implementation
- `functions/_lib/tutor-conversation-context-v014159.js`: secure same-member same-conversation one-row prior verified question lookup. No private Tutor answer, reflective note, private rubric or browser-supplied `priorTurns` enters source grounding; contextual follow-ups fail gracefully without stored history.
- `functions/api/market-tutor-v01492.js`: real source-based topical follow-up routing. Response includes `verifiedFollowupContext` as a non-grading marker. Current message content remains authoritative; former personal-advice requests cannot be reused as context.
- `functions/_lib/tutor-arithmetic-v014149.js`: deterministic, validated, hypothetical candle body/range calculation (0–100%); existing position sizing and P&L remain intact.
- `functions/api/tutor-calculator.js`: new `candle` action via existing stable and authenticated route, with previous `position` and `pnl` actions retained.
- `market-tutor.html` + `assets/js/market-tutor.js`: beginner explanation and interactive OHLC calculator, labeled inputs, server-side calculation result, account-switch stale-result prevention and accessible status.
- Tests added/extended: `tests/test_v014159_tutor_verified_followups.mjs`, `tests/test_v014149_tutor_arithmetic.mjs`; connected to `.github/workflows/market-tutor-v014147.yml`.
- Source verification controller `scripts/dev-program-source-verification.mjs` uses existing Node tests in D09–D18 and produces sanitized source reports; integrated D09 invocation and artifact upload into existing Tutor workflow. Usage: `node scripts/dev-program-source-verification.mjs --scope d09` or `--scope all`. A passing report does **not** certify Cloudflare, Supabase, Stripe, accessibility, educational approval or production release.
- Documentation: `docs/v0.14.0.159_D09_MARKET_TUTOR_VERIFIED_FOLLOWUPS_AND_CANDLE_MATH.md`.

## Tests and security evidence
- **PASS — direct execution of two current GitHub source modules in trusted V8:** hypothetical 30% candle-body computation; rejection of malformed OHLC; existing 40-share positioning example; authenticated member/conversation URL filters, one-row bounded lookback, rejection of unverified history and contextual pronoun detection.
- **PASS — parse and static integration:** six actual Tutor source/HTML files, all six new labeled/calculation UI controls, Tutor→calculator action wiring and verified-context marker.
- **UNVERIFIED — exact-head GitHub Actions completion, live Playwright, Cloudflare deployed SHA, actual Supabase/member A/B, Tutor model provider free-tier rights/limits, editorial quality.** Do not mark accepted based on an unobserved job.
- **Security:** Existing server entitlement, same-origin checks and no-provider-by-default behavior preserved; no new secrets, SQL or checkout toggles. No actual historical market data or third-party research credentials published.

## Research use
The attached Master Prompt v2 was read as controlling requirements, and existing `StocksToTrade-Browser-Research (5).zip` was reviewed only for non-sensitive research scope. Batch XXVI differentiates fictional teaching examples from authentic market evidence and stresses metric provenance. It was not deployed as private files or treated as a licensed market-data source.

## Remaining D09
End-to-end with real approved authenticated owner/member environments and four modes, history creation/rename/delete/search, consent, provider routing, model licensing and cost quotas, FAQ/misconception retrieval, original guide review, lab-safe Tutor bridges, educational QA, security, full accessibility/Playwright and documented production acceptance. The existing D09 acceptance checklist is not yet 100%; no unverified item was marked done.

## Remaining D10–D18
No production status promotion. Labs **419 registered, 0/419 individual full decisions recorded**; Bootcamp **30 registered, 0/30 full decisions recorded**; 30 official competency definitions, live grading/mastery unverified. Commerce LIVE positive-dollar paid lifecycle unverified, Admin D16 stages B–E outstanding, D17 sitewide outstanding, D18 production certification outstanding.

## Supabase / Cloudflare / Stripe / Owner action
- **Supabase:** No new SQL introduced this turn. Previously verified Tutor migrations must not be reapplied. Final read-only production postflight and real member A/B are deferred to consolidated Owner handoff.
- **Cloudflare:** No new binding or secret required solely for the new candle lesson/follow-up logic. Deployment at exact source commit and actual runtime check remain unverified. Existing Workers AI optional binding/provider configuration requires independent free-tier/license review before enabling.
- **Stripe:** No payment or secret setting changed; all LIVE activation gates remain locked.
- **Owner manual action NOW:** None for these source commits. Separate final owner-only actions later once complete source, CI and editorial evidence are available.
- **Next work:** Continue D09 educational/privacy integration and true test results, then close actual D10–D18 requirements without claiming a deployment count equals completion.

---


## Newest corrections after this handoff snapshot — 2026-10-22
- Last observed source checkpoint before this update: `e16c3207101994ce936b5100a49748016e183d53`. Run latest `main` HEAD query for exact final commit.
- Modern `sb_secret_` header handling fixed in `functions/api/admin.js` and `functions/api/admin-accounts-v01353.js`; source test plus old Owner Account Management tests wired into new D16 CI. A passing workflow/production call has not yet been observed.
- Eight-SKU and five-book static discrepancy audit added at `scripts/deployment15_catalog_audit.mjs` and integrated into existing billing and D18 source acceptance workflows. Historical Stripe registry holds 0 verified Price IDs (null fields, screenshot-only), four tools show monthly billing intervals, and five storefront books show KDP Select true with direct digital disabled. All require current provider/rights reconciliation, no automatic changes.
- D16 keyboard navigation now returns focus to the page heading when selecting a different module.
- No LIVE payment, Supabase migration, Cloudflare dashboard change, pricing change, or direct book distribution activation was performed.

---

# Active Development Continuity — D16 Stage A / D17 Security Fix / D18 Source Acceptance Gate

**Project:** The Stock Market: From the Ground Up (one unified project)
**Report date:** 2026-10-22
**Latest verified source checkpoint before this handoff:** `309238c7609ad7eabfdb73f55ef2395023f51cbc`
**Repository:** `cybernexuspublishing/stock-market-from-the-ground-up`, branch `main`
**Current public release identity:** `v0.14.0.155`; planned D16–D18 v156–v158 are NOT coordinated deployed releases.
**Current status:** D15 PAID PRODUCTION NOT ACCEPTED; D16 STAGE A SOURCE PRESENT / remaining migration open; D17 SOURCE ROUTE HARDENING ONLY; D18 SOURCE EVIDENCE GATE ONLY / PRODUCTION NOT ACCEPTED.
**Pull requests:** No new PR created for this source increment; commits were made directly to the existing `main` following earlier project source workflow.
**Important rule:** Older handoffs retained intact below this addition.

## New source deliverables
1. `assets/js/admin-unified-core-v014156.mjs`, `assets/js/admin-unified-preview-v014156.mjs`, `admin-unified-preview.html` and isolated CSS implement a staged **read-only** six-group unified Admin shell. The legacy editor and modules remain available through `admin.html`; this is not full D16 migration.
2. `assets/js/route-policy.js` now classifies the preview as staff protected; `tests/test_v014156_admin_shell.mjs` and `.github/workflows/deployment16-admin-shell.yml` contain Node 22 source regressions.
3. `scripts/deployment18_acceptance_matrix.mjs` and `.github/workflows/deployment18-source-acceptance.yml` consolidate original 419/30 curriculum ledger without silently granting accepted status.
4. D15 independent audit and D16–D18 individual gap/status reports are preserved in `docs/`.
5. `admin.html` links to the read-only migration preview without removing old initialization scripts.

## Owner evidence reviewed
Supabase eight-SKU read-only CSV `Supabase Snippet Check Existence of Replay Tables and Functions(17).csv`: all eight `CATALOG_STRUCTURE_OK`, but all eight have **0 LIVE intents, 0 matching signed payment/access rows, 0 lifecycle events**, and `GLOBAL_LIVE_APPROVAL_NOT_CHECKED`. No LIVE subscription acceptance may be inferred.

`docs/curriculum-acceptance-decisions-v014150.json` currently contains **0 Lab decisions and 0 Bootcamp decisions**, so complete recorded editorial reviews are **0/419 and 0/30**. Official competency code list is registered for 30, but individual integrated production acceptance remains unverified.

## QA and production distinction
- GitHub source code and workflow files: **COMMITTED**.
- Exact-HEAD GitHub Actions job results: **NOT OBSERVED** (connected commit-workflow tool returned empty; source CI passing cannot be claimed).
- Node tests executed in this assistant runtime: **NOT EXECUTED** (repository is accessible through GitHub connector; container cannot resolve GitHub).
- Cloudflare Pages deployment SHA/HTTP runtime: **UNVERIFIED** (independent public retrieval not accessible to verification tool).
- Supabase production SQL migration application and all-account RLS: **NO NEW MIGRATION IN THIS INCREMENT / FULL CONTRACT UNVERIFIED**.
- Stripe LIVE account, signed positive-dollar payment, webhook/retries, refunds/cancel, portal and notices: **NOT VERIFIED**.
- WCAG, editorial acceptance, market data licenses, legal/tax/refunds, PostgreSQL recovery drill: **NOT VERIFIED**.

## Mandatory unfinished tasks
- **D15:** Signed real commerce lifecycle after explicit informed Owner charge approval, commercial policy and support email reliability, keys, trials and entitlements, role isolation.
- **D16 stages B–E:** Registered authenticated write workflows, Dashboard/Members/Roles/Audit and all commerce/learning/Commons/Platform modules; no legacy removal before feature parity, regression and Owner review.
- **D17:** Full sitewide page/CMS/SEO/marketing/automation/operational/Grant Web Solutions tenancy and recovery acceptance.
- **D18:** Auth/authorization matrices, every one of 419 individually instructional Labs, each of 30 Bootcamp days, 30 competency dimensions and actual final integrated production validation.

## Owner-only consolidated gate (DO NOT REQUEST YET AS REPETITIVE PIECES)
1. Supabase preflight and any reviewed non-destructive migrations, then member A/B/TEST/Showcase cross-account checks.
2. Cloudflare exact production SHA/bindings, real scheduler/email and no-secrets inspection (do not alter already agreed Stripe secret type on speculation).
3. Authenticated Stripe LIVE price/merchant review, then only a separately explicitly authorized controlled positive-dollar payment; Stripe transaction costs disclosed first.
4. Review all 419/30 teaching, rubric, accessibility, historical rights and relevant legal/commercial policies.
5. Backup/restore drill and final Owner release approval.

**No new payment, provider activation, unauthorized owner entitlement, charge, production SQL run or price change occurred.**

---

# Deployment 15 of 18 — Paid Memberships & Stripe | Current Source Handoff

**Project:** The Stock Market: From the Ground Up (books and website are one project)
**Date:** 2026-10-22
**Target source version:** v0.14.0.155
**Status:** SOURCE HARDENING IN PROGRESS / PAID LAUNCH NOT ACCEPTED
**Controlling GitHub repository:** cybernexuspublishing/stock-market-from-the-ground-up
**Previous source baseline:** `8ffa118ace58241c9872457ff9e4dd54c1556c6e` (D15 checkout validation)
**Canonical work document:** `docs/v0.14.0.155_DEPLOYMENT_15_OF_18_PAID_MEMBERSHIP_LAUNCH.md`
**Google Drive location / file ID:** Not assigned; this repository document is authoritative.
**Document version:** 15.1.0, source-only
**Dependencies:** D12–D14 production/editorial acceptance; installed GU58 database contract; LIVE merchant verification; owner-approved controlled real payment.
**Purpose:** Track payment, entitlement and production evidence without asserting that source checks constitute paid-launch approval.

## D15 current implementation and retained constraints
- Eight original LIVE membership/tool SKUs, amounts, Owner TEST/LIVE controls, Cloudflare/Supabase settings, Stripe webhook signing configuration, and client-facing permanent routes are unchanged.
- Live checkout now enforces actual 2 KiB streamed input and rejects unknown codes before all provider/database calls; regression test added.
- LIVE webhook now bounds **actual** inbound bytes to 256 KiB **before** zero-dollar QA inspection or signed paid event handling; one-pass UTF-8 decoding and mock no-network regression test added.
- Signed event, ledger, retry, refund, chargeback, subscription and Customer Portal implementation remains from prior phases; full production lifecycle has **not** been independently proven.
- No additional paid service, book/market-data permission, direct digital book sale or automatic activation is authorized.
- Source CI evidence after the latest commit must be separately inspected. A green build does not prove live Stripe or production member access.

## Deployment 15 acceptance gates
| Gate | State |
| --- | --- |
| Source implemented and committed | D15 checkout changes previously on main; webhook fix pending source CI |
| Exact-head GitHub workflows | PENDING VERIFICATION |
| Cloudflare LIVE production SHA parity | UNVERIFIED |
| Eight Stripe LIVE products and amounts/cadence | OWNER READ-ONLY RECHECK REQUIRED |
| Supabase GU58 installed RLS/RPC and TEST/SHOWCASE isolation | OWNER READ-ONLY RECHECK REQUIRED |
| Signed positive-dollar Stripe LIVE payment and renewal/refund/cancellation | NOT VERIFIED; explicit informed Owner authorization required |
| Signed webhook replay, scheduler, portal, emails, member A/B/Showcase QA | NOT VERIFIED |
| Legal, tax, subscriptions, refund and privacy review | NOT VERIFIED |
| Paid launch or activation approved | **NO** |

**Manual Owner work now:** None from the source-only security correction. No Stripe secret/type change is requested. Consolidate authorized Supabase read-only verification and Stripe-account operations only after the source is independently checked.

**Next:** Finish D15 paid lifecycle acceptance, then D16–D18 according to the original 18-deployment scope. Preserve all prior research, frozen publications, 419 Lab identifiers, 30 Bootcamp days and 30 competencies.

---

## Historical handoff retained without deletion

# Deployment 10 of 18 — Market Data and Trading Tools | Permanent Handoff

**Project:** The Stock Market: From the Ground Up (single book + website project)  
**Date:** 2026-10-22  
**Status:** DEVELOPMENT IN PROGRESS / PRODUCTION NOT ACCEPTED  
**Source target:** v0.14.0.150 release candidate on PR #124 (not deployed or merged)  
**Base:** main v0.14.0.149 postflight at `3ab646eb5651101ae3bc994e32fbd496a36b8aba`  
**Branch:** `deployment-10-of-18-market-data-v014150`

## D09 source-release inheritance
- D09 source PR #123 merged as `e6df00b158d3dff7c2cac0bb026a2fac42fa613b` after 39/39 check runs and 36/36 workflows passed; corrected manifest/handoff at `3ab646eb5651101ae3bc994e32fbd496a36b8aba`.
- Owner-reported Supabase v149 and v149b already installed and structurally verified; **do not reapply**.
- Live Cloudflare SHA, member A/B and Showcase isolation, Owner editorial review and Workers AI free/cost permissions remain unverified. AI inference stays OFF. Stripe LIVE settings owner-locked and unchanged.

## D10 source implementation and relevant existing platform
- Reuse existing `/api/marketdata`, BYO Tiingo token encryption, member-only market research CSV scanner and workbenches, watchlists, Journal, server-owned verified replay, simulator and existing entitlement architecture.
- New `functions/_lib/market-data-integrity-v014150.js`: validates timezone-explicit timestamp inputs, real calendar dates, strictly increasing unique timestamps, New York trading-date coverage across UTC midnight/DST, full OHLCV presence, candle bounds and whole-share volume. No fabricated missing bars or synthetic observations.
- Member-scoped BYO `/api/marketdata?action=bars` now uses that validator. Returns explicit unverified source-data properties: venue consolidation, completeness, corporate actions, redistribution/publication rights and official replay eligibility are **not** certified.
- New deterministic regression `tests/test_v014150_market_data_integrity.mjs` is added to the existing v145 market-rights workflow. No live upstream calls are required by this test.
- Uploaded StocksToTrade Browser Research archive consulted for educational pattern, indicator and watchlist design; research statements are not licensed member-data feeds, and no archived browser sessions, credentials or private profiles are published.
- D10 scanner expansion now supports optional minimum price, reported gap %, supplied market cap and price-times-shares proxy thresholds, with fail-closed missing optional metrics and member-visible controls. The proxy is not exchange turnover or a trade indicator.
- Existing multi-timeframe educational workbench now includes independently calculated SMA 20 and Wilder ATR 14 from supplied OHLC observations, with a documented bar-2 seed, no fill/performance claim and regression tests. EMA and typical-price proxy remain explicitly non-verified.
- Watchlist lifecycle now supports authenticated edit (timestamp-based optimistic concurrency, account and tool scoping, protected data type), record deletion, private saved candidates and dated provenance. Dedicated mocked backend auth/CSRF/stale-edit tests. Existing POST/read/export and member restrictions retained.
- Cross-phase D11–D14 and D18: a machine-generated 419-Lab / 30-day individual-acceptance ledger, with 30 fixed competencies and all six collection counts, now provides a separate CI evidence artifact. All record-specific criteria default UNVERIFIED and only reviewer/evidence/time-stamped decisions can become RECORDED, not independently verified production success.
- D10 trading patterns: 18 original evidence/failure-mode study cards, independently selectable in the existing advanced-tool Pattern & Failure Library with accessible plain-text rendering and no fabricated live signal. The original library's Lab search is retained; RCT attribution is explicitly third-party and not credited to this series.
- Observed-only session references added to existing ET context workbench: HOD, LOD, PMH, PML and preceding observed regular-session high/low with no-lookahead snapshots. Incomplete bars are never elevated to verified PDH/PDL; DST/session/chronology test added.
- Planned 10.2–10.10 work remains: expanded supported scanner criteria, private watchlist lifecycle, indicator and session math, educational pattern evidence, licensed Level II/Time & Sales restrictions, approved replay chronology and simulator/journal acceptance. Existing source features must be verified before reimplementation.

## D10 acceptance and owner actions
| Gate | State |
| --- | --- |
| First new historical OHLCV validation source | Submitted on D10 branch; CI pending |
| Exact-head GitHub source CI | PENDING |
| Database changes required by this initial change | NONE |
| Cloudflare environment changes required by this initial change | NONE |
| New paid market feed or inference | NONE |
| Live provider data license and provider plan | NOT VERIFIED; no redistribution |
| Real published historical dataset | NOT VERIFIED |
| Protected member A/B, TEST/Showcase acceptance | NOT VERIFIED |
| 419 individually accepted Labs | NOT VERIFIED |
| 30 individually accepted Bootcamp days | NOT VERIFIED |
| D10 production accepted | NO |

**Owner action now:** None for this initial source-only increment. Existing optional private BYO provider tokens and Supabase objects are left untouched. Future proposals must document exact rights and any non-destructive SQL separately.

## D09 historical source handoff retained verbatim below

# Deployment 09 of 18 — Market Tutor AI | Permanent Handoff

**Project:** The Stock Market: From the Ground Up (one unified project: books and website)  
**Company:** Cyber Nexus | **Publishing imprint:** Crown & Lantern Press  
**Document location:** GitHub `docs/DEPLOYMENT_HANDOFF_LATEST.md`  
**Document type:** Markdown  
**Document ID:** Repository path above; no separate Google Drive document ID assigned  
**Google Drive location:** Not assigned (no new file is necessary)  
**Document version:** 0.7 | **Status:** D09 SOURCE MERGED / PRODUCTION NOT ACCEPTED  
**Last updated:** 2026-10-22 | **Next review:** On receipt of exact-head CI and installed-schema evidence  
**Purpose:** Preserve cross-chat source control, testing, dependencies, owner actions and risk-based acceptance.

## Controlling release
- **Selected delivery:** 09 of 18: Complete Market Tutor AI
- **Source release:** v0.14.0.149 merged into `main`; live deployment is not independently verified.
- **Verified D09 source merge commit:** `e6df00b158d3dff7c2cac0bb026a2fac42fa613b` (PR #123); any subsequent metadata-only commit must be read from GitHub.
- **Development branch:** `deployment-09-market-tutor-retrieval-20261022`
- **GitHub pull request:** https://github.com/cybernexuspublishing/stock-market-from-the-ground-up/pull/123 (merged).
- **Commit authority:** consult PR #123 current head and associated GitHub workflow results; this handoff's old commit identifier is not a release proof.
- **Prior deployment:** D08 had source release and unresolved live database/production acceptance; no inference from merging D08 to completing D09.
- **Source acceptance evidence:** `scripts/deployment09_release_evidence.mjs` (machine report at `artifacts/d09-tutor-source-evidence.json` when executed). File presence/checks are not actual production verification.

## Completed source changes in branch
1. **First-party deterministic topic retrieval:** verified-source catalog remains existing v92/v100; new whole-token terminology and abbreviation normalization, source-only ranking and uncovered-topic fallback.
2. **Provider adapter/routing:** existing OpenAI adapter now requires explicit OWNER approval and model allowlist. Cloudflare Workers AI binding adapter added with one allowlisted non-deprecated model `@cf/zai-org/glm-4.7-flash`; free plan, license and binding must be separately verified and flagged. The adapter is OFF by default. Source-only teaching remains active.
3. **Atomic inference meter:** existing v103 per-member/day and site-wide day/month reservation RPC retained. No API calls are permitted by merely receiving a browser request, without explicit consent, approved provider and a successful transaction reservation. Caps count requests, not guaranteed monetary spend or Neurons.
4. **Secure named conversations (new, proposed v149 Supabase migration):** user-scoped 30-conversation cap, RLS/revoked direct access, stable API CRUD, per-user exchange linkage and migration-compatible ungrouped history. Client never supplies authoritative identity. Requires installed v102 and Owner review. Exchange save/link is not a single transaction; separate association failure is disclosed and recoverable as an Unfiled exchange.
5. **Member workspace:** named conversation list/search/rename/delete, cross-device history when database is installed, explicit save preference, stop-waiting, source-only retry, account-switch epoch cancellation, readable safe Markdown/limited tables/inline math, existing four teaching modes, feedback, copy and exports. Client does not run untrusted HTML.
6. **Member transcript portability:** `/api/member-tutor-data-export` authenticates via Supabase Auth and exports only authenticated user's ungraded saved records even after Tutor entitlement expiry; doesn't award mastery. Privacy counsel review still required.
7. **Verified arithmetic in source:** long-only hypothetical position sizing, buying power, risk/reward and P&L with validation. Member calculator at `/api/tutor-calculator` is entitlement protected. Does not place orders or guarantee fills.
8. **Stable API paths:** `/api/market-tutor`, `/api/member-tutor-history`, `/api/member-tutor-conversations`, `/api/tutor-calculator`. Old versioned Tutor/history routes remain for compatibility.
9. **Test infrastructure:** existing Market Tutor CI workflow extended for retrieval, arithmetic, provider allowlisting, conversation isolation, member calculation and history export; consolidated source evidence script added.

## Functional and security tests
- **Source tests committed:** `tests/test_v014149_tutor_retrieval.mjs`, `test_v014149_tutor_arithmetic.mjs`, `test_v014149_tutor_provider.mjs`, `test_v014149_tutor_conversations.mjs`, `test_v014149_tutor_calculator.mjs`, and `test_v014149_tutor_data_export.mjs`.
- **Previously installed tests retained:** v92/v93/v95/v100/v102/v103/v105/v107/v147 Tutor tests, plus repository-wide regression workflows. Legacy provider mocks explicitly declare an approved test-only model; no test model is enabled in production.
- **Exact-head GitHub Actions:** must be checked at PR #123's latest head. Commit `d99566511d5e344dbb424be97470426f4bb989b4` repaired Owner-case UUID validation and D08 SQL-whitespace assertion. Follow-up source commits require fresh CI.
- **Production browser:** no verified Owner/Member A/Member B/TEST/Showcase, expired membership, mobile keyboard and screen-reader acceptance has occurred.
- **SQL:** Owner executed v102/v103/v107/v149; earlier read-only checks passed. The corrected **v149b** migration also now passes Owner-supplied read-only Supabase verification: all three new private tables exist, RLS is enabled, anon/authenticated direct SELECT is denied, service SELECT is available, and Owner review, topic-gap and atomic privacy-deletion RPCs are installed. No migrations need rerunning. Evidence: `Supabase Snippet Check Existence of Replay Tables and Functions(16).csv` (Owner-uploaded, 2026-10-22). **Scope is database structure only**, not live application or functional acceptance.
- **Cloudflare:** Owner screenshots show the intended 10 Market Tutor environment variables and a Workers AI binding named `AI`. Inference remains OFF (`AI_SERVICE_ENABLED=false`); free-tier/model-license verification flags also remain false. Settings and binding are Owner-reported and screenshot-supported, while live deployment/inference remain unverified. Existing Stripe LIVE webhook configuration is Owner-locked; do not request or make changes to it as part of D09.
- **Stripe:** unchanged. No prices, subscriptions, payments, real entitlements or charges modified.

## Evidence and acceptance gates
| Gate | Evidence-based status |
|---|---|
| New source files committed | YES — D09 source merged into `main` (PR #123) |
| Regression CI passing | YES — 39/39 exact PR-head checks, 36/36 exact PR-head workflows passed before merge; Cloudflare production runtime remains separate |
| Required Supabase migrations installed | Owner-supplied v149/v149b read-only structural checks PASSED; runtime/production acceptance NOT VERIFIED |
| Cloudflare production commit deployed | NOT VERIFIED |
| Four-mode functional acceptance | NOT VERIFIED in production |
| Browser privacy/session isolation | NOT VERIFIED in production |
| Human educational content approval | NOT VERIFIED |
| Authoritative source-grounded model citation quality | NOT VERIFIED |
| Workers AI free quota and account plan | NOT VERIFIED; disable inference |
| Admin Tutor comprehensive editorial workflow and emergency control | PARTIAL; runtime environment kill-switch exists; full audited in-app controls not accepted |
| All 419 Labs individually accepted | NOT VERIFIED; 419 registrations only |
| 30-day Bootcamp accepted | NOT VERIFIED |
| 30 competencies production accepted | NOT VERIFIED; 30 definitions tracked |
| Production acceptance | **NO** |

## Known remaining work and risks
- Privacy-safe topic-gap aggregation and Owner dashboard code are now implemented on this branch; v149b installation and real endpoint acceptance are still required. A comprehensive editorial source approval/versioning workflow remains outstanding.
- Existing Tutor feedback inbox now has proposed Owner-only case status controls and a new append-only audit/RPC in v149b; production remains unverified until SQL and authenticated tests. Curriculum source approval/versioning and in-app emergency AI switch are still distinct outstanding acceptance gates.
- Free Cloudflare AI capacity has variable per-model neuron consumption. A count of API calls is not evidence of zero cost. An approved Cloudflare Free account with correct AI binding/model license and hard caps is a required activation gate. Never activate paid fallback.
- Existing saved Tutor exchanges are ungraded. Explicit canonical 419-Lab ID guidance uses only public Lab/competency metadata and never private rubrics, future bars or unlicensed historical data. A new one-transaction member privacy deletion covers both saved exchanges and named conversations, including after Tutor entitlement expiry. v149b is structurally confirmed installed, but functional tests remain outstanding.
- Browser-only stop requests do not guarantee cancellation of already-reserved server inference.
- GDPR/consumer privacy, copyright/source licenses, AI vendor data processing and policy retention require jurisdiction-sensitive review.
- Historical market-data rights, Labs and Bootcamp are separately governed by D10–D14.
- Avoid “100%” or “accepted” language until all required evidence is recorded.

## Next work / Owner actions
1. Obtain successful exact-head GitHub CI and correct any regressions before PR review/merge.
2. Owner reported SQL installation. Verify with new v149 **read-only** installed-contract query and the actual user-scoped storage tests; apply no duplicate migrations without a detected gap.
3. Complete source/editorial workflows, unanswered-topic aggregation, owned Admin resolution/approval UI and review of all four Tutor modes.
4. Verify production Account A/B isolation, expiry/export, authorized Lab context, keyboard/mobile, provider timeouts, rollback, cost caps and historical-data separation.
5. Confirm Cloudflare Free plan and licensing; keep AI disabled unless all authorization/limit switches explicitly pass. Do not activate new paid services.
6. After D09 passes all independent gates, proceed to D10 Market Data, Trading Intelligence and Replay.

## D09 source QA and latest follow-up
- **Browser integrity repair:** removed a duplicated invalid JavaScript tail and restored complete calculator/privacy-export methods in `assets/js/market-tutor.js`. The repaired source passed an independent JavaScript syntax compilation smoke check; all 31 statically referenced Tutor element IDs exist in `market-tutor.html`.
- **Independent pure-logic checks:** deterministic arithmetic, retrieval, canonical Lab lookup, and anonymous gap taxonomy modules compiled and passed direct smoke cases; these are not a substitute for Node/GitHub Actions.
- **CI:** the exact current PR #123 head must pass GitHub Actions; past test success is not acceptance of later source commits. Browser integrity and Owner/privacy regressions remain in the workflow.
- **Cloudflare:** no user configuration changes verified; `AI_SERVICE_ENABLED=false` until account and licensing checks are passed.
- **Owner action:** D09 SQL installation and structural verification are complete; no further SQL is currently requested. Cloudflare AI variables and `AI` binding are configured with inference disabled. Remaining actions depend on exact-head CI, merge, deployment, and functional acceptance.


- **October 22 v149b SQL correction:** Owner-reported SQLSTATE 42601 at line 110 traced to malformed single-dollar PL/pgSQL delimiters in atomic Tutor privacy deletion. Corrected the opening and closing to matching double-dollar markers. Verified updated SQL blob and added a D09 source-gate invariant to detect recurrence. The initial execution failed, then corrected v149b was installed and Owner-supplied read-only structural verification passed. Do not reinstall v102/v103/v107/v149/v149b or roll back without a specific diagnosed defect.

- **October 22, Owner follow-up:** Supabase v149b read-only verification passed for 3/3 tables and 3/3 RPCs with the expected role permissions; Cloudflare Market Tutor variables and `AI` binding are screenshot-confirmed. Stripe LIVE webhook Text/Secret configuration is not to be modified under the Owner's explicit direction. GitHub PR #123 remains draft/unmerged; exact-head CI is queued, not passed.


## Branch reconciliation and controlling source (2026-10-22)
- **Canonical candidate:** PR #123 on `deployment-09-market-tutor-retrieval-20261022`. It alone may progress toward a reviewed Deployment 09 merge; the current `main` baseline remains unchanged.
- **Competing alternative:** PR #122 on `deployment-09-of-18-market-tutor-v014149` is superseded. Preserve its commit history for audit, but do not merge its conflicting v149 conversation table `gu_tutor_conversations_v014149`. The Owner-installed canonical v149 table is `gu_member_tutor_conversations_v014149`.
- **Selected compatible transfer:** PR #122's whitelisted general-topic navigation from guided/practice Labs to Market Tutor has been incorporated on PR #123; no private answers, grading rubrics or future bars are transferred.
- **Historical source merges:** audited merged pull requests targeted `main`. Do not undo Deployments 01–08 because their changes were originally authored on topic branches. No branch force-reset is necessary.
- **Release gates:** no additional SQL execution, Cloudflare AI activation, Stripe changes or `main` merge from this reconciliation. Passing source tests do not establish that the 419 canonical Labs or all 30 Bootcamp days are fully developed and accepted.

## Revision history
| Date | Version | Change |
|---|---|---|
| 2026-10-22 | 0.1 | Original source-only retrieval handoff and production blockers. |
| 2026-10-22 | 0.2 | Source-only mathematical calculation and tests. |
| 2026-10-22 | 0.3 | Workers AI guarded adapter, safe private conversations, data portability, member calculator, stable routes and explicit acceptance gates. |
| 2026-10-22 | 0.4 | Audited Owner cases, privacy-safe gap counts, canonical Lab ID guidance, atomic post-entitlement deletion and Browser syntax repair; source CI and production acceptance pending. |
| 2026-10-22 | 0.5 | Recorded verified Supabase v149b schema/RPC report, Cloudflare screenshot-based setup, and locked decision not to change the previously tested Stripe LIVE webhook settings. |
| 2026-10-22 | 0.6 | Reconciled D09 source ownership and existing SQL, corrected status contradictions, carried over safe guided/practice Lab Tutor link. |


## D09 merged source postflight — October 22, 2026 (authoritative update)

- Deployment 09 PR #123 was merged to main at `e6df00b158d3dff7c2cac0bb026a2fac42fa613b` after 39/39 exact-head check-runs and 36/36 exact-head workflows passed.
- Source release manifest was previously stale at v0.14.0.148 despite merging D09; its `version` was corrected to v0.14.0.149 while keeping `status` pending production acceptance and retaining existing financial status flags.
- Installed Owner-reported v149/v149b Supabase structures were NOT reinstalled. No database or Cloudflare/Stripe configuration was changed by the source metadata correction.
- Acceptance gates remain separate: Cloudflare-deployed exact SHA, member A/B and restricted account tests, privacy endpoints, Owner editorial workflows, source accuracy, Workers AI Free plan/license and hard cost caps. All 419 canonical Labs and all 30 Bootcamp days are separately not production-certified by D09.
- D10 work starts from this corrected source baseline, preserving a single repository and a single next-development branch; this source handoff will be extended there with exact D10 commit and evidence.


### D09 release metadata compatibility inherited on D10 (2026-10-22)
The D09 main-source postflight at `d2a4641a043c0a79e6154ec53f030cc3523a8648` corrected production browser `config.js`, route-policy version and Service Worker public cache to v0.14.0.149. The D10 branch intentionally includes these identical fixes and records that main as a merge parent, preventing legacy source CI version mismatch without removing any tests. Cloudflare deployed exact SHA still unverified.

### D09 commerce/browser display version fix inherited (2026-10-22)
Merged corrected main postflight `2090c423d3f2501d56ce9316028e8235bce6306e`: commerce JSON version and Admin/Owner Roadmap HTML version labels now align to v149. D10 retains all earlier trading changes; previous source checks are not removed or weakened. No prices, live settings, Supabase or Cloudflare variables changed.

### Inherited D08 CI compatibility from corrected main (2026-10-22)
The D10 branch merges main postflight commit `1ec004cc423527bc85b05c951ad8aed33f07c753`, keeping original D08 checkout-disabled and `not_certified` checks and enforcing version >= v149 (workflow minimum v148) without pinning future versions to v148. SQL/Stripe/Cloudflare state unchanged.

### Existing Admin Stripe noncharging test after v149 source parity (2026-10-22)
The retained v0.14.0.52 Admin Stripe source test checks that query-busted Admin CSS/JS and JS fallback identify the actual current release. D10 revealed stale v148 asset labels after D09 merged. Corrected only `admin.html` asset queries and `assets/js/admin-stripe-shadow-v01439.js` source fallback; did not alter Stripe secrets, checkout mode, product prices, customer records or authorization. The noncharging workflow must pass again on the new exact D10 head.

### Consolidated D10 source manifest candidate v0.14.0.150 (2026-10-22)
Version-consistency fields in release-manifest, browser config, commerce JSON, route policy, public Service Worker cache, Admin and Owner Roadmap HTML metadata, and Stripe Admin JS/CSS cache selectors are advanced **together** to v150. No entitlement, checkout configuration, price or Stripe provider behavior changed; future schema, historical rights, editorial, browser and production release gates remain pending. The current draft PR #124 must pass full exact-head CI before merging this source candidate.


## Main-only D11 continuity update (October 22, 2026)
PR #125 merged at `704962888aec8e3c0ac7b830ec1bd0c1b1a8c0ff`; owner directed all subsequent changes directly to main without redundant merge PRs. D11 public Book III title reconciliation uses exact existing source index metadata for 13 previous generic titles, leaves 3 non-descriptive indicator examples flagged, and does not change frozen books, Supabase, Stripe or customer state. All 94 lesson and historical-data production acceptance gates remain open.

## D11 authoritative source reconciliation after full learning CI
The v0.14.0.99 curriculum contract binds all 419 competency-crosswalk titles to the immutable `lab-catalog.json` title values. For these 13 Book III Labs that underlying private catalog currently records only the ID. **Do not update that crosswalk independently**: the attempted change failed the existing learning contract, and the exact 13 original ID-only titles have been restored. The improved public-facing companion titles remain in `data/labs.json` and the previously existing `data/interactive-lab-index.json`. The D11 report explicitly flags the 13 differences as `CANONICAL_CATALOG_TITLE_REVIEW_REQUIRED`, with full Lab and grading acceptance blocked. Any future canonical title changes must coordinate the original Lab catalog, corresponding Owner training data and existing tests; no private rows were changed by this correction.

## D12 coordinated source evidence (v0.14.0.152 target; D11 acceptance still pending)
New single-ledger 325-Lab inventory audit for Day Trading (150), Reading the Tape (75), and Site Exclusive (100) validates original 419 source associations and emits per-Lab JSON/CSV gaps in existing CI. This is source-only, not private lesson or production acceptance; no separate backend or user action. Exact 30 competency definitions retained.

## D13 graded-history integrity started
Existing `/api/interactive-training?action=progress` now loads chronological server-owned, member-scoped completed grades beyond an older 500-row silent cutoff; a bounded 10,000-record exhaustion condition fails closed. Reuses original private rubric/answer/grading system and 30 competencies. CI verifies two pages, no grade omitted, restricted user denial and no secret leakage. D13 production completion remains unverified; no SQL run.

## D14 30 original study checkpoints integrated
One different formative question, existing topic-specific practice-based review guide and day-specific common misconception is attached to each original 30-Day Bootcamp day. Learners can copy a question into their already-private ungraded reflection; the session-authenticated Bootcamp progress API and 30-day mapping are unchanged. A missing incomplete checkpoint source fails visibly without awarding a fake grade. This does not count as 30 graded/approved Bootcamp days.
