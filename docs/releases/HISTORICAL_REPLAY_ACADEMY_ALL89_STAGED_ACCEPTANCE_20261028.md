# Historical Replay Academy — All 89 Cases, Version HR-ALL89-1.0

## Document control
Company: Cyber Nexus / Crown & Lantern Press  
Project: The Stock Market: From the Ground Up / Website / Historical Replay  
Filename: HISTORICAL_REPLAY_ACADEMY_ALL89_STAGED_ACCEPTANCE_20261028.md  
Type: Markdown / controlled release evidence; new document  
Repository: docs/releases/  
Google Drive location: Proposed The Stock Market: From the Ground Up/Website/Release Evidence/Historical Replay/; not uploaded  
Google Drive document ID: Not assigned  
Prepared: October 28, 2026 (Central Time); latest CI/deploy events may be dated October 29 UTC  
Status: SOURCE RESEARCH STAGED — HISTORICAL RETAIL ACCEPTANCE BLOCKED  
Version: HR-ALL89-1.1  
Purpose: Full-case coverage, source provenance, legal publication gate, acceptance status, and rollback.  
Dependencies: 419 canonical Labs; existing secure replay engine; existing Crownlight charts/Talia; authorized data publication; end-to-end real account testing.

## Production work completed
The existing production Lab registry has 419 active records, including 122 dated Lab records spanning 89 distinct ticker/date cases. All 89 are now draft review candidates in market_datasets. Their metadata links all 122 canonical Labs without changing Lab identities.

Provider research from Alpaca SIP historical 1-minute observations checked 09:30 through 09:59 ET on each actual stock/date. Eighty-three 30-minute windows contained a continuous sequence with correct timestamps, OHLC invariants and nonnegative volume. Six exceptions: KOSS 2024-05-03 (11 returned bars), GPRO 2024-05-07 (26), NOK 2024-05-08 (29), GME 2024-05-13 (14), LOW 2024-05-17 (28), HUBC 2026-09-21 (4). Missing bars require feed/trade-halt review, not invented filling.

## Verified Supabase postflight
- 89 draft-only market_datasets rows.
- 122 correctly associated Lab references.
- 83 source-continuous opening windows; six sparse/exception windows.
- Zero newly published datasets or member display-rights flags.
- Zero new historical OHLCV bars ingested to private gu_replay_bars_v01492.
- No changes to membership grants, payment settings, paid transactions, Sparks wallets, or customer progress.
- RLS inspected: authenticated users may SELECT datasets only when status is verified or published. Draft case records are not ordinarily visible; private replay bars are not directly SELECT-able by anon/authenticated users.

## Existing website components
- ondemand-training.html: website-classroom and optional independent thinkorswim routes.
- functions/api/ondemand-training.js: removes former 50-case cap.
- assets/js/learning.js: search and 24-at-a-time display.
- verified-replay.html and assets/js/verified-replay-v01492.js: server-owned replay and immutable first decision.
- assets/js/historical-replay-classroom-v1.js and assets/css/historical-replay-classroom-v1.css: chart left, Talia right, no-lookahead 1/3/5/15-minute modes, manual and automatic playback.
- Chart playback uses 120, 90, 60, 45, 30, 20, 15, 10, 5, 2, or 1 seconds per ONE-MINUTE source observation. Multiminute aggregates appear only when fully completed.

## Legal-source decision
Alpaca's standard API terms do not demonstrate commercial redistribution rights for paid members. Retrieval and checksum/arithmetic checks do not authorize copying the source into public or member-serving repositories. See https://alpaca.markets/support/redistribute-alpaca-api . A rights-approved feed must be supplied and independently validated before the dataset publication flags may be enabled.

IEX direct HIST is a possible future low-cost source for recent dates, under IEX HIST terms and required attribution, but is exchange-only and should not be labeled SIP. IEX advertises recent twelve-month data access; this is not proof that its site makes May 2024 DIS historical captures available. See https://www.iex.io/legal/hist-data-terms and https://www.iex.io/products/market-data-connectivity .

## QA classification
- Actual market-data API research and continuity checks: completed for all 89 cases (83 continuous, six exceptions); **not independent cross-provider verification**.
- Live Supabase status, linkage and private-table policy review: completed.
- Source CI: all89 and first-batch candidate tests plus classroom source contracts. Record actual final CI outcome separately.
- Chromium browser suite: uses isolated synthetic test fixtures; must not be described as genuine member session or commercial historical data.
- Authenticated real-account, fully licensed historical replay completion and cross-session restoration: NOT ACCEPTED; impossible until at least one approved authentic dataset exists.
- Historical lesson individual editorial review / assessment: NOT ACCEPTED.
- Financial and LIVE payment testing: NOT RUN.

## Release gates
A case may be published only after a signed data display/redistribution authorization, private immutable source hash, independent sample/corporate-action/trade-condition verification, documented feed scope, no-lookahead time alignment, specific Talia lesson checks, server entitlement test, genuine authenticated browser test, and reviewer/date evidence. Do not change draft status or rights metadata to satisfy release metrics without those artifacts.

## Rollback and traceability
The two public CSV registries preserve 78 initial cases and the combined 89-case set under docs/research. To roll back source changes, revert only relevant changes on main after current-head checks. To reverse staging, archive the 89 new HR-prefixed drafts only after checking foreign-key dependencies; preserve all 419 Labs, customer sessions, Journal history and migrations.

## Revision history
HR-ALL89-1.0 — October 28, 2026 — Expanded source evidence from 78 to every one of 89 existing stock/date cases and associated all 122 Labs; six sparse-session exceptions retained.


## Release Gate Execution Update — v1.1, October 28, 2026 Central / October 29 UTC

### Verified genuine QA evidence
- GitHub Actions run 40820858876: SUCCESS. The real James_Test QA credential, exact immutable user identity and production password grant were verified against Supabase Auth. The actual signed-in browser reached the Historical Replay page, and successful sign-out was independently confirmed after navigation.
- Historical guest catalog denial: PASSED (real production HTTP).
- Real-account historical dataset catalog response: PASSED; no publicly licensed/published source returned.
- Unpublished DIS start denial: PASSED; HTTP 403, no source bar disclosure.
- Read-only database postflight: 89 draft cases, 122 linked Labs, zero source bars ingested, zero QA sessions created by these negative tests. No Stripe transactions or Sparks spending.
- No positive real-market replay session may be certified while the published approved source catalog is empty. Do not relabel negative-path acceptance as full end-to-end acceptance.

### IEX public-term alternative feasibility
- IEX HIST terms contain an express distribution-attribution clause; any use remains conditioned on those terms, appropriate exchange identity, trade/packet validation, and complete published acknowledgments: https://www.iex.io/legal/hist-data-terms
- The IEX HIST listing identifies a TOPS 1.6 binary PCAP dated 2026-09-21, size approximately 10.28 GB. The website's existing scripts/market-data/iex_tops.py + prepare_replay_import.py pipeline provides a starting private extractor and draft file validator.
- The IEX TOPS feed is **IEX-only**, not SIP/NBBO. Some 2026-09-21 cases may be sourced from this date if the genuine binary capture is obtained, checked for packet continuity/trade conditions, and the exact symbol/security history is reviewed.
- The IEX downloadable offering is constrained by authentication and size. A verified copy of the September 21 10.28 GB source capture has **not** been acquired or decoded in this acceptance. No extra paid service or market-data subscription was purchased.
- Our 2024 source set, including DIS May 7, 2024, requires a separately authorized archive or a provider-specific redistribution grant; Alpaca SIP retrieval is not itself licensed website distribution.
- The IEX draft importer now preserves the full required attribution text and hyperlink in its source field.

### Website publication-aware controls
The historical learning catalog now asks the authenticated, entitlement-checked replay API which exact ticker/date datasets are approved. Until that API returns a permitted source, the lesson card displays **Historical chart pending source approval** rather than an active chart link. The independent thinkorswim instructional route remains usable. Actual source release then enables the matching chart without opening every other unapproved date.

### Release authorization sequence
1. Obtain genuine exchange- or provider-authorized raw historical capture for the desired day and retain it privately, with source identity, redistribution basis, original checksum, and dated terms.
2. Decode and cross-check the eligible trade records with the existing private pipeline; preserve missing-minute gaps and IEX-only disclosures.
3. Complete signed/dated independent packet, corporate action, licensing, bar-range, source SHA and teaching reviews. Import **draft** bars only after retaining source and usage-rights evidence.
4. Before dataset publication, verify protected RLS, exact record counts, immutable source checksum and entitlement gate. Require owner approval and avoid any mass rights toggle.
5. Publish one reviewed source, then run the genuine production acceptance: real account, first decision lock, protected advance, timeframe integrity, cross-session resume, sign-out and another account's forbidden access.
6. Expand to the remaining 89 cases only after each source and Lab-level lesson passes the same process.

### Change record
HR-ALL89-1.1 — Added actual signed-in production negative-path QA evidence, complete IEX attribution correction, source alternatives and member-visible publication controls. Positive licensed historical playback remains outstanding.
