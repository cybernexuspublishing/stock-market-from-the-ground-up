# Talia Tutor — Eight Canonical Lab Claim-Level Teaching Bridges

**Document ID:** SMFGU-TALIA-RESEARCH-BRIDGE-010
**Project:** The Stock Market: From the Ground Up
**Version:** 1.0
**Date:** 2026-10-31
**Status:** Source code and exact-commit Tutor CI accepted; individual Lab editorial and authenticated production-browser acceptance pending
**File type:** Markdown
**GitHub location:** docs/research/stockstotrade/TALIA_EIGHT_CANONICAL_LAB_CLAIM_BRIDGES_20261031.md
**Google Drive location:** Not created
**Purpose:** Reuse independent educational source research to teach the exact registered Lab objectives in Talia while preserving private assessment boundaries.

## Actual content and lesson identities
The original `data/tutor-lab-claim-evidence-v1.json` contains eight narrowly sourced, original, independently worked, **fictional** instructional cases. The registered IDs and titles in `data/competency-lab-paths-v01499.json` remain controlling:
1. F1-C08-L01 — Share Price Versus Company Size — Mega-Cap Example (SEC market capitalization).
2. F1-C07-L02 — ETF Versus Index (SEC ETF/fund characteristics).
3. F2-C04-L01 — Bid, Ask, Last, Spread, and Midpoint in a Frequently Updating Quote (SEC ask price and definitions).
4. F2-C04-L02 — Compare Quote Width Without Jumping Ahead to Liquidity Analysis (FINRA liquidity).
5. DT-C41-L01 — Order Selection, Fills, Partial Fills, and Execution Control — Market Orders (SEC order types).
6. DT-C41-L02 — Order Selection, Fills, Partial Fills, and Execution Control — Marketable Limit Orders (SEC order types).
7. DT-C42-L02 — Stops and Invalidation — Slippage and gaps (SEC stop order guidance).
8. DT-C11-L01 — VWAP and Moving Averages in Intraday Trading — VWAP as a session reference (StockCharts VWAP technical definition; explicit HLC3-volume proxy).

Each record contains the exact canonical title, narrow teaching claim, worked original numerical/observational case, falsifying counterexample, independent transfer task, source ID, source URL and `source_specific_general_claim_checked_ungraded_not_independently_approved` status. Source citations explain general principles rather than actual chart executions, strategy profitability, historical exchange data or secure graded responses.

## Implementation contract
- `functions/_lib/tutor-lab-context-v014149.js`: For requests containing a valid canonical Lab ID, retrieve the public canonical crosswalk then look up a separately published research record. Display extra teaching only if the exact ID **and title** match and the source passes a domain/status/schema gate. A missing or malformed optional source falls back to original Tutor learning guidance.
- `scripts/build-pages.sh`: Copies the eight-bridge JSON to Cloudflare Pages public data. No private grading record, key, member profile or market feed is exposed.
- `tests/test_tutor_lab_claim_evidence_v1.mjs` and Market Tutor Trust CI: assert eight correct canonical IDs and titles, source URL allowlist, original fictional examples, worked/counterexample/transfer sections, arithmetic and safe fallback.
- No change to 419 canonical Lab IDs, 252 program-day baseline, membership entitlements, payments or original 134 guided practice modules.

## Acceptance and next research
Market Tutor Trust CI passed for commit `3e4e9c757faeb5e694dba142c75de475768e24d9`; the exact 419+252 research queue also passed its curriculum test. Sitewide browser testing and authenticated production member testing remain separate acceptance gates. The remaining registered units must have their actual claims, worked calculations, counterexamples, fresh transfer and source rights independently investigated; generic topic-family matches do not confer lesson acceptance.

**Dependencies:** `data/tutor-lab-claim-evidence-v1.json`; `data/competency-lab-paths-v01499.json`; `functions/_lib/tutor-lab-context-v014149.js`; `tests/test_tutor_lab_claim_evidence_v1.mjs`.
**Rollback:** Revert the exact research-bridge commits or remove the optional public asset; the Tutor's original canonical Lab guidance will continue without source enrichment. No SQL rollback is necessary.
