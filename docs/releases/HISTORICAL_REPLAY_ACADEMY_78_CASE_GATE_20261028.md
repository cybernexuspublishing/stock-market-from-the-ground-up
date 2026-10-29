# Historical Replay Academy — Batch 01 source-review register (78 cases)

Project: The Stock Market: From the Ground Up | Owner: Crown & Lantern Press / Cyber Nexus
Date: 2026-10-28 | Version: HR-78-v1.0 | Status: SOURCE RESEARCH ONLY; NOT RETAIL / NOT PUBLISHED
Location: docs/research/HISTORICAL_REPLAY_78_SOURCE_CANDIDATES_20261028.csv (versioned register)
Google Drive: Proposed The Stock Market: From the Ground Up/Website/Research/Historical Replay; not uploaded. Document ID: not assigned.
Purpose: Map 78 canonical Labs to their actual ticker/date for source-level verification and later rights-approved replay ingestion.

## What was actually checked
On 2026-10-28, the available Alpaca historical stock-bars connector returned one-minute SIP observations for regular-session 09:30:00–09:59:59 ET, on each listed trading date. Initial programmatic checks enforced each minute's timestamp, chronological continuity, OHLC bounds and nonnegative volume. 73 of 78 candidates contained the complete set of 30 1-minute observations. Missing-minute exceptions: KOSS 2024-05-03 (11), GPRO 2024-05-07 (26), NOK 2024-05-08 (29), GME 2024-05-13 (14), LOW 2024-05-17 (28). These counts are returned records, not proof of data-provider outage or an invalid security.

## NON-NEGOTIABLE RELEASE GATES
1. **No raw third-party OHLCV records are in this GitHub file.** The Alpaca access used here has no demonstrated redistribution agreement for this website. Do not publish, monetize, export or embed these observations for members without signed permission covering historical display, exchange fees where applicable, data retention and required attribution.
2. Technical API retrieval and arithmetic checks are not independent bar-by-bar verification. Reconcile every approved import with an independent authoritative feed, corrections/cancellations, timestamps, corporate actions, odd lots, trade flags, time zones and session coverage.
3. An incomplete or halted session must retain its missing-minute gap; do not invent trades or use unverified forward fill. GME 2024-05-13 requires explicit halt/LULD and session-event review.
4. Canonical Lab authoring requires separate factual teaching review, no-lookahead checkpoints and protected grading. No case gains mastery status solely because market bars exist.
5. Production market_datasets.status must stay draft, rights flags false and bar rows absent pending licensed import. Never set status=published to complete a checklist. Website server verifiedHistoricalDataset/replayAvailableToEntitlement gate remains controlling.

### Test and provenance classification
Provider retrieved: 78 cases; 73 full first-30-minute windows; 5 partial. Independent source corroboration: 0. Confirmed member redistribution rights: 0. Licensed authenticated historical dataset publication: 0. Live signed-in historical end-to-end acceptance: 0. Noncharging security/negative-auth and local Chromium coverage must be reported independently.

### Required final publication packet
Signed authorized license; independent sampled-price crosscheck; market-data feed and security identity; SHA-256 of immutable private source; OHLCV/timeframe/incomplete-minute QA; corporate-action and session review; lab curriculum reviewer; security/entitlement verification; source-to-chart no-lookahead browser acceptance; deployment hash and rollback.
