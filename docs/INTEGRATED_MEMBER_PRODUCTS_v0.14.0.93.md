# Integrated Member Product Implementation — v0.14.0.93

**Company:** Cyber Nexus / Crown & Lantern Press  
**Project:** The Stock Market: From the Ground Up  
**Version:** 0.14.0.93  
**Prepared:** 2026-10-19  
**File type:** Markdown (.md)  
**GitHub path:** `docs/INTEGRATED_MEMBER_PRODUCTS_v0.14.0.93.md`  
**Google Drive path / document ID:** Not established. A separate Google Drive file is not required for source-controlled release documentation.  
**Status:** Source implemented; GitHub CI and deployment acceptance required; production database installation and licensed historical data unverified.  
**Dependencies:** Existing Cloudflare Pages project, existing Supabase project, preexisting v0.14.0.92 service-only replay migrations, approved instructional material, market-data usage rights and existing paid entitlements.  
**Purpose:** Integrate and harden existing features rather than creating replacement systems, preserve all 419 Lab identifiers, and quantify gaps without fictitious completion.

## Existing work retained

The v0.14.0.92 Tutor endpoint, reviewed-topic library, optional model quota, durable server replay service, OHLCV execution model, private schema migration candidates, book-entitled training routes and current Market Simulator remain the architectural baseline. Previous v0.14.0.91 Owner Roadmap and eight commercial Stripe product definitions remain unchanged. No alternative database, separate 419-Lab registry or duplicate simulator has been created. Book v1.14 source is untouched. No production secrets are stored in the website.

## Engineering delivered in source

**Replay (existing `learning-replay-v01492` route and existing `verified-replay.html` workbench):**

- `GET /api/learning-replay-v01492?action=catalog` lists only published, rights-cleared, evidence-verified private OHLCV dataset metadata for an authenticated member with Market Simulator entitlement. It never serves the underlying future candle sequence.
- `GET /api/learning-replay-v01492?action=resume` discovers an active session by the server-authenticated user; returns exactly the last authorized visible bar and locked-decision state. No browser `localStorage` session IDs, answer keys or future observations.
- Existing `start`, `lock`, `advance`, `current` and `finish` operations now additionally verify that the dataset has **not been unpublished or had educational display rights revoked**. Replay advance retains atomic, server-controlled cursor compare-and-swap.
- Existing workbench now includes a published-dataset picker, refresh and resume functions; the original authorized code field and CSV-based Market Simulator remain available.
- A historical OHLCV fill is explicitly an educational estimate, not evidence of actual exchange fill price, queue priority, intrabar order or real Level II.

**Owner's 419-Lab evidence audit:**

- Reuses existing `platform_labs`, `lab_instruction_v014`, `lab_training_sets_v014`, `market_datasets` and `historical_context_envelopes` from the **existing** Supabase project.
- The Owner-only `GET /api/owner-roadmap?action=lab-audit` runs **after Owner authorization**, lazily when the existing **Product Development** tab is selected. The source register and saved Owner statuses are not mutated.
- Every returned Lab gets a distinct evidence stage: disabled, missing private lesson record, missing independently reviewed grading, missing rights-cleared historical context, or content precheck only with remaining acceptance tests.
- Counts are based on actual available database records rather than static 419 identifiers or presumed completion. The expected 419 count is checked, not forced.
- Owner dashboard provides 40-row pagination, identifier/topic/ticker search, stage filtering, and CSV export with formula-injection protection.
- No rubric keys, assessment answers, private full instruction bodies, member journals or market dataset bar sequences leave the server via the audit.
- **No Lab is marked 100% complete automatically.** Publication rights, answer review, classroom accuracy, true no-lookahead tests, end-to-end release and member access require explicit separate acceptance.

**Tutor integration:**

- Reuses existing premium `market-tutor-v01492` route instead of replacing the current glossary or Tutor.
- Adds `practice` teaching mode, combining only the signed-in eligible member's own, recent, self-tagged Journal/Lab mistakes (60 records per source, bounded).
- Each record's duplicate mistake tags are counted once. Returns ranked study topics, count of references, scoped Lab search links and skill-code activity, never a trading recommendation or automatic score.
- This mode does **not** send raw Journal records to an external model or consume AI provider quota. If source tables are unavailable, the private endpoint returns an unavailable response instead of fabricating learning results.
- The existing Tutor UI now includes the practice mode; common “what should I practice next?” questions select it automatically. Basic glossary explanations remain intact.

## Critical independent acceptance not yet satisfied

1. All **419 finished interactive Labs** still need reviewed pedagogical lessons, answer keys, questions, scoring, verified historical context, private no-lookahead delivery, accessibility, and progress integration. Catalog counts alone are not the required output.
2. Owner must inspect installed data through `supabase/admin/v0.14.0.92_OWNER_419_LAB_GAP_MATRIX_READ_ONLY.sql` and prior `v0.14.0.91_OWNER_PRODUCT_READINESS_READ_ONLY.sql`. Missing objects or rows are dependencies, **not authorization to rerun legacy migrations**.
3. v0.14.0.92 private replay SQL migration candidate must be independently reviewed and installed only when appropriate; real licensed bars and verified historical context must be loaded through an approved ingestion path. This release makes **no Supabase writes**.
4. Durable replay is not equivalent to verified full Journal integration, historic fills, ledger-style execution persistence, or 419 finished instructional scenarios.
5. Generative Tutor is not production-ready merely because optional provider integration exists; model credentials, private quota installation, content review, provider terms, error handling and teaching quality need independent acceptance.
6. Market Commons, forum moderation, exposed database privileges, access control and privacy must be accepted using the existing role matrix and outstanding v0.14.0.50 ACL preflight/postflight evidence; no blind schema reset.
7. Legacy browser Lab modes remain **ungraded unless the existing private reviewed training API validates the learner's graded attempt**. Concealing instructions in the DOM is not true tamper-resistant future-data protection.

## Test coverage

The new `tests/test_v014093_replay_catalog_resume.mjs` verifies dataset filtering, unauthorized access, no future-bar leaks on session restoration, Owner-publishing-rights revocation, account restrictions and durable cursor behavior against an isolated mock service.

`tests/test_v014093_owner_lab_readiness.mjs` verifies all five record statuses, role restrictions, missing-schema fail-closed behavior, private rubric answer isolation and Owner-only lazy report contract.

`tests/test_v014093_tutor_practice.mjs` verifies private member scoping, count correctness, no AI model charges, no answer-key access, denied nonmember roles and unavailable-source handling.

The existing v0.14.0.92 replay and Tutor contract suites remain mandatory. GitHub Actions workflow `.github/workflows/verified-replay-resume-v01493.yml` runs these tests against repository changes.

## Owner tasks, next manual dependency and acceptance

- **GitHub:** Engineering files have already been committed to `main`. Confirm GitHub Actions success on the **final head commit**; earlier successful workflow runs do not certify later commits.
- **Cloudflare:** Continue using `bash scripts/build-pages.sh`, output `public`. This deploys the already existing verified replay workbench and the additional controls. Do not publish `functions/`, `supabase/`, private answer keys or raw service-role credentials as static files.
- **Supabase:** The **Owner audit uses the installed existing tables read-only**. To verify actual completeness and source rights, run the read-only 419-Lab gap matrix and upload results. Review any missing v0.14.0.92 private replay or Tutor quota migration separately; do not install either until the Owner understands the preflight.
- **Educational content:** No fictional market candles, tick prints, filings, trades or legally unverified market-data rights are included. All 419 Labs remain a delivery goal, not an assertion of completion.
- **Memberships:** Four principal subscriptions and four paid membership prices remain unchanged; no Stripe writes, charge, entitlement grant or product availability changes were performed.

## Change control

Accepted existing task IDs updated only where source work is now evidenced: `CORE-0207`, `CORE-0210`, `CORE-0211`, and `CORE-0218`. Their engineering review is **source implemented / in progress**, not Owner-verified commercial release. All Supabase-saved Owner decisions retain priority. No existing roadmap IDs, Lab IDs, book manuscript contents or approved membership decisions were deleted or rewritten.

**Next development dependency:** authenticated real installed-schema evidence, licensed per-Lab source data, controlled instructional authorship and a transactionally durable replay-to-Journal link. These will build on the existing modules rather than create a duplicate subsystem.

## Execution correctness correction added after initial review

Existing `functions/_lib/replay-engine-v01492.js` was **repaired in place**: an adverse spread/slippage estimate could previously produce a hypothetical BUY LIMIT fill **above** its limit or SELL LIMIT fill **below** its limit. The engine now caps the modeled price to the customer's stated limit. Favorable price improvement is not incorrectly counted as adverse transaction friction. The check covers BUY/SELL LIMIT, MARKET adverse slippage, STOP gap handling and ambiguous stop-versus-target bars in `tests/test_v014093_execution_price_bounds.mjs`. This improves deterministic model correctness; it does **not** prove actual historical limit-order execution from OHLCV.
