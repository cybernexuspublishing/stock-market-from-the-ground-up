# Mandatory Independent Source Research — 671-Unit Curriculum

**Document ID:** SMFGU-CURRICULUM-RESEARCH-009
**Project:** The Stock Market: From the Ground Up
**Version:** 1.0
**Date:** 2026-10-31
**Status:** Research underway. Topic-level authority review completed; five Free Foundations claim-specific links recorded; independent acceptance for remaining units pending.
**File type:** Markdown
**GitHub location:** docs/research/stockstotrade/671_MANDATORY_EVIDENCE_INVESTIGATION_20261031.md
**Google Drive location:** Not created
**Purpose:** Require actual research for every unverified instructional unit rather than accepting a topic-only vendor citation.
**Dependencies:** Original canonical 671-unit register, five Free Foundations lessons, SEC/FINRA/Nasdaq/StockCharts authority register, exact unit editor review.

## Evidence completed
Twenty authoritative regulator, exchange, or identified technical-publisher pages were checked for the narrow claims recorded in `primary_authority_research_catalog_v1.csv`. These pages cover quotes, orders, stop execution, liquidity, SEC filings, acceptance versus public dissemination, market cap, ETFs, T+1 settlement, short sales, margin, Nasdaq opening, OHLC, VWAP, EMA, performance assertions, trade lifecycle, research misconceptions and announced future hours.

The exact Free Foundations lessons 1–5 now each have source references, an original worked example/evidence procedure, a common failure/counterexample, an independent transfer question and explicit limitations in `data/free-foundations-evidence-v1.json`, rendered within Academy instruction. The five remain ungraded; acceptance of the whole lesson still requires separate editorial and authenticated learner tests.

## Mandatory research queue for remaining positions
`scripts/mandatory_671_source_investigation_v1.mjs` processes the frozen 419-Lab + 252-Academy position register without renaming, changing approval or rewriting prior evidence. It produces:
- `artifacts/mandatory-671-research-queue.csv` with exact lesson ID, title, original vendor candidate, researched topical authority where appropriate, unresolved calculation/transfer tests and a mandatory specific next investigation.
- `artifacts/mandatory-671-research-summary.json` with exact counts and nonapproval status.

A topic-level researched authority **does not** prove the individual teaching assertion. Unmatched positions are expressly `unresolved_requires_active_source_discovery`, never exempt. Search a primary regulator/exchange/issuer source or source-defined technical specification, document what was actually checked, check counterevidence and unit calculations, and independently validate before approving. Do not mark unsupported material merely 'deferred' as a final disposition.

## Material effective-date findings
FINRA intraday margin changed effective 2026-06-04, with firm implementation transition through 2027-10-20; broker-specific status matters. SEC EDGAR acceptance time is not the public information time. Nasdaq announced an additional overnight session beginning 2026-12-06, which must not be applied to October 2026 or earlier examples.

## Per-lesson completion gate
Exact objective; claim-level original source and as-of time; worked numerical calculation independently recomputed with units, seeds, warmup and zero denominators (or explicit N/A); substantive counterexample; fresh transfer case; no-future-data boundary; original licensed/fictional distinction; protected-grade isolation; independent editor acceptance; and authenticated browser regression.

**No additional Labs/Boot Camp days, paid tools, live market data, private answers, membership changes, or financial transactions are authorized by this research.**

## Version control and testing
New files required for primary authority catalog, queue script, source-level test and this report; originals retained. Execute `node tests/test_671_mandatory_primary_source_research_v1.mjs` and the existing Curriculum Acceptance workflow. Roll back these research-only files or their commit if inventory integrity fails; never suppress an unverified claim to make a test green.
