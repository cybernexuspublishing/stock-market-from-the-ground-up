# Research-to-approved curriculum crosswalk — source-level evidence batch 006

**Project:** The Stock Market: From the Ground Up  
**Date:** 2026-10-31  
**Version:** 1.0  
**Status:** Source-to-program crosswalk only; **NOT** a 419/419 Lab-ID crosswalk  
**Google Drive:** Not created (GitHub source of record).  
**GitHub:** `docs/research/stockstotrade/` on `main`  
**Dependencies:** `docs/419_LAB_EDITORIAL_ACCEPTANCE_v014100.csv`, `data/lab-teaching-bridges-v014168.json`, `functions/_lib/bootcamp-academy-v014168.js`, `docs/releases/v0.14.0.168_419_LABS_AND_SEVEN_BOOT_CAMPS_SOURCE_RELEASE.md`.

## Canonical course structures checked

The existing source release defines seven programs of **5, 7, 10, 30, 45, 60 and 90 days**, totaling **247 program-day positions**. The 419 canonical Labs, 30 official competencies and shared nine-stage engine are controlling; no course or Lab IDs may be inferred from URL titles.

| Official course | Sources discovered this batch | Appropriate original instruction | Review gate |
|---|---|---|---|
| 5-day The Truth Behind the Ticker | STT-E006-007 | Distinguish vendor marketing from issuer-exchange evidence | Label earnings and claimed returns unverified |
| 7-day Build Your Own Stock Watchlist | STT-E006-003, 006 | Source quality, volatility, float and liquidity | Avoid assuming scanner filters predict outcomes |
| 10-day Mastering Stock Scanners | STT-E006-003, 004, 005, 006 | Scanner vs screener, source latency, configurable filters | Distinguish hypothetical UI features from existing free features |
| 30-day Complete Trading Foundations | STT-E006-002, 003, 004 | Candles, pattern states, risk and source verification | Use actual existing day IDs before assignment |
| 45-day Chart Reading and Trading Setups | STT-E006-001, 002, 005 | VWAP, ABCD leg structure, confirmation vs hindsight | Original charts and timestamped replay data |
| 60-day Risk, Execution and Trading Discipline | STT-E006-002, 005 | Risk/reward objectives, liquidity and stop limitations | Prevent unsupported probability claims |
| 90-day Advanced Simulated Trading Practicum | STT-E006-001–006 | Independent candidate selection, counterexamples, post-trade audit | Chronological replay and private grading |
| Free Membership Foundations and eligible Free Labs | STT-E006-003, 004 | Explain scanners/screens, volume, volatility from zero knowledge | Equal teaching quality for entitled material; Free access unchanged |

## Concrete content-quality correction

`STT-E006-005` presents the generalization that a share price above VWAP means most day traders are profitable. That inference is unsound: VWAP weights transacted volume, does not determine current positions, realized profits or the distribution of individual entry prices. **Do not repeat this as a fact** in Talia instruction, Labs, Studio, or Free training. This is a teachable example for BC-05-TRUTH.

## Honest acceptance accounting

- Source records added: seven rows; STT-E006-006 was already discovered and is an explicitly duplicated reference, **not a net-new URL**.
- Verified full YouTube transcripts: zero new.
- 419 individually keyed source mappings completed in this batch: zero. Mapping by subject and course is research routing, not Lab-level acceptance.
- Existing public Lab editorial register explicitly has 419 rows, and the Academy release has 247 day positions, but neither count is proof of external source verification.

## Next executable gate

Export exact Lab identifiers from `docs/419_LAB_EDITORIAL_ACCEPTANCE_v014100.csv` and exact day identifiers from `functions/_lib/bootcamp-academy-v014168.js`, construct a deterministic `lab_id,program_id,day_id,source_id,mapping_status` crosswalk, and separately reconcile all archives and YouTube ID inventories. Do not auto-approve educational content.
