# Member Learning Systems — Implemented Source and Owner Acceptance | v0.14.0.92

**Project:** The Stock Market: From the Ground Up  
**Company:** Cyber Nexus / Crown & Lantern Press  
**Scope:** AI Teaching, 419 interactive Lab objective, durable historical replay, trading tools, Market Commons controls  
**Version:** 0.14.0.92  
**Date:** 2026-10-19  
**Status:** Source implementation and isolated contract testing; Supabase schema and historical content deployments pending  
**GitHub file:** `docs/LEARNING_SYSTEM_IMPLEMENTATION_AND_HANDOFF_v0.14.0.92.md`  
**Google Drive folder, Drive document ID:** Not created; no location or ID should be invented.  
**Owner decision:** Maintain the existing pricing, immutable Foundations v1.14 manuscripts, eight approved paid Stripe SKU definitions, the 21 registered first-party tools, and all pre-existing website sections.

## Delivered in source this batch

1. **Authenticated Market Tutor:** `functions/api/market-tutor-v01492.js` serves pedagogical explain / self-check / reflection modes, citations to the existing 22-topic companion glossary, links to Labs, journal and skills, and no automatically awarded grades. `assets/js/market-tutor.js` uses the endpoint for eligible signed-in accounts and retains the public companion glossary for Free users.
2. **Optional model service, closed by default:** Model calls require Cloudflare server environment secrets `AI_TUTOR_API_KEY` and `AI_TUTOR_MODEL`, plus successful atomic per-user daily quota RPC. No credentials were created or deployed. The model does not receive private journal rows or book answer keys; generated explanations are labeled as draft, not graded. The Owner-reviewed additive SQL file is `supabase/migrations/v0.14.0.92_TUTOR_QUOTA_OWNER_REVIEW_REQUIRED.sql`. Budget: maximum 15 quota-accepted paid model calls per eligible user per UTC day. Do not configure credentials until cost/privacy/quality acceptance.
3. **Private historical replay:** `functions/api/learning-replay-v01492.js` authorizes MARKET_SIMULATOR, starts only against rights-attested published OHLCV datasets, exposes the first bar, requires an immutable first decision, then uses an atomic expected-index cursor to reveal only the next bar. The client is `verified-replay.html`; it stores no replay candles in browser persistence. The Owner-reviewed additive schema is `supabase/migrations/v0.14.0.92_PRIVATE_REPLAY_OWNER_REVIEW_REQUIRED.sql`. The original browser CSV simulator remains available and is explicitly disclosed as not a tamper-resistant assessment.
4. **Conservative execution primitives:** `functions/_lib/replay-engine-v01492.js` applies timestamp/price checks, latest-visible-bar slicing, educational next-bar gap/spread/slippage assumptions and ambiguity disclosure when stop and target both touch the same OHLC bar. This is not licensed tick/Level II data and cannot demonstrate actual fills.
5. **419-Lab completeness inventory:** `supabase/admin/v0.14.0.92_OWNER_419_LAB_GAP_MATRIX_READ_ONLY.sql` produces one row per registered Lab, with authored-instruction, reviewed-rubric, and rights-qualified context flags. The current public authored registry contains 94 Foundations Lab records. The full 419-Lab production requirement is **not yet satisfied**; the remaining records and source acceptance must not be represented as complete.
6. **Forum/API protection:** Member discussion editing, moderation report handling and the paid tool access helper now support modern `sb_secret_*` service authentication without misusing it as a bearer JWT; member content database errors are sanitized; edit payload size preflight exists. Backend privilege audit and real role tests remain outstanding.

## Critical release gates (not met by pushing GitHub source)

| Gate | Required evidence | Current status |
| --- | --- | --- |
| 419 actual interactive lessons | 419 individually reviewed private lesson bodies, decisions, explanations, graded rubrics and approved historical/conceptual evidence; all mapped to one of 30 competencies | **Not verified; only 94 Foundations source entries registered publicly** |
| Historical provenance | License, source/provider, ticker/date, timezone, corporate actions and legally allowed member redistribution per dataset | **Missing verification** |
| Private dataset content | Real ordered OHLCV rows with unique indexed timestamps in Owner-approved private store | **Not loaded by this release** |
| No-lookahead QA | Negative unauthorized calls, server-locked decisions, strict forward cursor, no future bar serialization, concurrency tests, no private answer leakage | **Core source and isolated tests built; live permission and deployed SQL tests pending** |
| Simulator/journal integration | Matching server session to actual authenticated journal record, idempotency, P&L assumptions, export and retention | **Not implemented end to end** |
| Market Tutor AI | Owned billing budget, private model secrets, provider terms, prompt privacy, rubric accuracy and content provenance | **Premium source-grounded teaching runs without a model; optional model delivery not authorized** |
| Market Commons | Full member/moderator/owner/test role matrix, anti-spam, thread edits, reporting and concurrent moderation behavior | **Source hardening only; live permissions unverified** |
| Stock market education review | Individual accuracy checks by competent educators/market-data reviewers; no trading advice or performance promises | **Editorial review pending** |

## Owner SQL sequence — no unnecessary new Supabase project

**Read-only first:** Run `supabase/admin/v0.14.0.91_OWNER_PRODUCT_READINESS_READ_ONLY.sql` against the EXISTING Supabase project; export Query 01–09 result tables. If required tables exist, separately run the v0.14.0.92 `OWNER_419_LAB_GAP_MATRIX_READ_ONLY.sql` and upload its CSV without raw answers or customer data. These scripts begin read-only and end ROLLBACK.

**Only after review and an adequate backup:** Review and execute the two `v0.14.0.92_*OWNER_REVIEW_REQUIRED.sql` migrations, in the existing project, once each. They create private Tutor usage quotas and replay tables/RPCs; they do **not** insert lessons, historical prices or payments. If any migration has already been applied, inspect installed objects before rerunning.

**Postflight output to send:** Schema object presence, RLS flags, `anon`/`authenticated` execute privileges on `v01492_consume_tutor_quota` and `v01492_replay_advance` (both should be FALSE), server-only table grants, counts in replay bars and replay sessions, and 419-Lab gap CSV. Omit customer IDs and secret values.

**Cloudflare:** Build `bash scripts/build-pages.sh` and deploy the existing production GitHub source. The Cloudflare Page's `functions/` directory must be deployed as server Functions, not copied into `public`. Verify the current Git commit SHA against `release-manifest.json`. Do not set `AI_TUTOR_API_KEY` or `AI_TUTOR_MODEL` without prior explicit budget and privacy acceptance. New replay page is not releasable to paying learners unless populated rights-cleared datasets and authenticated role tests pass.

## Test baseline

- `tests/test_v014092_market_tutor_contract.mjs`: source/topic parity, active entitlement, forbidden Showcase role, no paid model call absent quota, advice restraint, ungraded review, service-key isolation.
- `tests/test_v014092_replay_contract.mjs`: first-bar visibility, rights gate, required decision before future bar, server cursor step, stale concurrent cursor rejection, forbidden account role, conservative OHLCV ambiguity.
- GitHub Actions: `.github/workflows/learning-tutor-v01492.yml`.
- v0.14.0.91 Owner product roadmap and previously approved Store/payment tests must still pass. Source and mocked tests do not replace live acceptance.

## Progress governance

Mark the AI Tutor and server replay work **in progress / source implemented**, not verified complete. Preserve all previous Owner status entries. Block the 419-Lab completion signoff until every independent Lab acceptance exists. Do not alter book manuscript freeze, Stripe checkout approval, existing membership grants or data licensing attestations merely to improve the progress counters.

**Dependencies:** Existing Supabase schema, Owner read-only CSV evidence, independent historical data rights, reviewed curriculum, responsible optional model operating budget, Cloudflare private secrets and final release acceptance.
