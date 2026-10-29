# Historical Replay Academy — Official IEX May 7, 2024 Source Evidence

## Document control
- Company: Cyber Nexus / Crown & Lantern Press
- Project: The Stock Market: From the Ground Up / Historical Replay Academy
- Filename: HISTORICAL_REPLAY_IEX_20240507_SOURCE_EVIDENCE_V1.md
- File type: Markdown, GitHub-controlled new source evidence document
- Document ID: SMFGU-HR-IEX-20240507-EVIDENCE-001
- Google Drive location: Proposed The Stock Market: From the Ground Up / Website / Research / Historical Replay / IEX Source Evidence; not uploaded
- Version: 1.2
- Date: October 29, 2026 (UTC)
- Status: **ONE DATASET PUBLISHED TO QA-ONLY PRODUCTION; GENUINE AUTHENTICATED REPLAY ACCEPTED; GENERAL RETAIL RELEASE NOT APPROVED**
- Purpose: Maintain first-party archive identification and integrity evidence for six canonical Labs.
- Dependencies: IEX TOPS v1.66; source packet/sequence and trade-break review; individual Lesson editorial approval; authenticated positive-path acceptance.

## Verified source
Official IEX catalog: https://iextrading.com/api/1.0/hist?date=20240507

Object: `20240507_IEXTP1_TOPS1.6.pcap.gz`  
IEX archive generation: `1715119797644546`  
Compressed bytes: `2258120982` (entire source acquired by streaming verifier)  
Uncompressed bytes: `11468952092`  
Complete original gzip SHA-256: `4ad7fc26ce52471e1d631a5583353ae109422356cc723da34d8f37c7c80dcce5`  
Gzip CRC/EOF: **PASS**  
Fingerprint workflow: https://github.com/cybernexuspublishing/stock-market-from-the-ground-up/actions/runs/40823605289

All date-paired stock/source records share this original daily archive hash. No raw archive was committed to the public website, and no third-party market data was inserted into member-serving replay bars.

## Bounded source extraction
IEX raw source extraction workflow: https://github.com/cybernexuspublishing/stock-market-from-the-ground-up/actions/runs/40823472461

It inspected 258,736,167 compressed bytes to reach the end of the requested 09:30–10:00 ET opening window. After correcting eligibility using the published IEX TOPS v1.66 flags, the source returned:

| Symbol | Eligible price-bar minutes | All IEX trade events | Publication |
|---|---:|---:|---|
| BAC | 30 | 508 | Pending |
| CVNA | 26 | 149 | Pending |
| DIS | 30 | 2,749 | Pending |
| F | 26 | 207 | Pending |
| GPRO | 6 | 18 | Pending |
| RIVN | 30 | 1,243 | Pending |

Missing minutes in exchange-only observations are not automatically errors and **must never be filled with fictional prices**.

### Complete opening-window comparison against Alpaca IEX
DIS, May 7, 2024 (Eastern Time):

| Minute | Raw IEX eligible O/H/L/C | Volume | Alpaca IEX 1-minute |
|---|---|---|---|
| 09:30 | 107.250 / 107.250 / 105.765 / 106.530 | 32,051 | Match |
| 09:31 | 106.530 / 107.055 / 106.460 / 107.055 | 22,673 | Match |

A complete read-only 09:30–09:59 ET DIS comparison independently retrieved Alpaca IEX one-minute bars and compared them against the privately held corrected official IEX archive artifact. All 30 dates/times and all six numeric fields (open, high, low, close, volume, trade count) matched exactly: **180 out of 180 numeric comparisons, zero mismatches**. This is independent processing/cross-provider corroboration of the same IEX venue source, not proof of a separate-exchange price record. No Alpaca bars were placed in the website repository or redistributed. The original source still needs full-day packet/trade-break reconciliation before release.

The standard IEX TOPS eligibility requires excluding odd-lot and extended-hours prints from last-sale and high/low prices while including trade volume as specified. The original unfiltered 09:30 low of 105.670 is **not** an approved chart low.

Reference: https://storage.googleapis.com/assets-bucket/exchange/assets/IEX%20TOPS%20Specification%20v1.66.pdf, Appendix A (trade eligibility guidelines, page 27).

### Rights and disclaimers
IEX Historical Data Terms: https://www.iex.io/legal/hist-data-terms

The IEX HIST terms explicitly address distributing, selling or furnishing historical data and prescribe attribution. Review the complete agreement, use-case obligations, exchange-only limitations and indemnity before approving paid member display. Publication does not depend on licensing Alpaca IEX or SIP feed: Alpaca was used solely as an independent provider research comparison, not a redistribution source.

Required attribution: **Data provided for free by IEX. By accessing or using IEX Historical Data, you agree to the IEX Historical Data Terms of Use.**

IEX reflects **IEX venue executions only**, not SIP consolidated national tape, NBBO, other ECNs or simulated broker fill accuracy.

## Unresolved release controls
1. Full IEX-TP packet/message sequence and trade-break reconciliation, including corrections occurring after 10:00 ET.
2. Full-bar independent comparison and timestamp/eligibility/corporate-action checks.
3. Individual dataset draft ingestion into controlled private storage with reproducible checksum and evidence.
4. Human-reviewed data-use decision and Talia's case-by-case no-lookahead instruction.
5. Exactly one controlled case publication followed by real authenticated positive-path browser/replay/Journal acceptance.
6. Only then repeat across remaining eligible sessions.

**None of these unresolved controls may be treated as passed because the archive checksum passed.**

## Revision history
- 1.0 — October 29, 2026: First-party catalog and full compressed archive verified; six candidate windows extracted with corrected sale eligibility; publication explicitly withheld.

- 1.1 — October 29, 2026: Expanded independent IEX provider verification from two sample candles to all 30 opening-minute candles (180 exact field matches). Full-day correction audit still pending.

## Final controlled acceptance addendum — v1.2, October 29, 2026

**Verified provenance:** Full original IEX TOPS May 7, 2024 capture, 2,258,120,982 compressed bytes, gzip checksum/CRC passed; complete capture SHA-256 `4ad7fc26ce52471e1d631a5583353ae109422356cc723da34d8f37c7c80dcce5`. Full-day 71,591,683 IEX-TP message packets audited, no sequence gaps or overlaps, no trade breaks for the six May 7 candidate tickers. Original IEX venue only; not SIP/NBBO.

**DIS price data:** 30 minute bars `2024-05-07T13:30:00Z` to `2024-05-07T13:59:00Z` imported into private `gu_replay_bars_v01492`, no invented minutes, IEX-only accumulated shares 408,106. Extracted 30-bar SHA-256 `5cc9af15daff3ada9e2456dc70183f98326f5ed698deb4b753ec4ef7631b67cc`. All 180 DIS 1-minute OHLCV/trade-count field values reconciled with Alpaca's IEX research feed; **Alpaca data were not republished**.

**Corporate action:** Raw chart (not adjusted), issuer's official investor stock-split history lists no May 2024 split. This is a source-date corporate action review, not a claim of universal adjusted-price comparability.

**Limited IEX terms review:** IEX Historical Data Terms explicitly describe distribution with attribution and hyperlinks. The webpage renders the required exact attribution and clickable IEX Terms link. The limited Owner-directed educational QA approval is not an attorney opinion or permission for broader uninhibited data reuse. Legal review before general retail launch remains recommended. <https://www.iex.io/legal/hist-data-terms>

**Access classification:** DIS dataset `HR_DIS_20240507` moved from private draft to `published` **only with `qa_release_only=true`**, a server-validated allowlist of the dedicated QA account, all normal entitlement requirements, and `license_publication_reviewed=true` scoped to this limited exercise. Ordinary members do not receive its historical bars; all other 88 historical case records remain in draft. This is **not a retail release**.

**Genuine production acceptance:** <https://github.com/cybernexuspublishing/stock-market-from-the-ground-up/actions/runs/40827085229> — **SUCCESS**. Actual authorized password-authenticated QA user, live Cloudflare Pages + Supabase, correct DIS opening timestamp, protected first decision, nonlookahead bar advancement, stale cursor rejection, Talia synchronization, real browser chart, cross-load resume, server-acknowledged finish, session sign-out. No payments or Sparks transactions. Database postflight after the final run: five finished QA sessions, all decisions locked, **zero active QA sessions**. Earlier test runs were legitimately corrected for duplicate-session conflict, omitted ticker in authorization rechecks, onboarding modal, and browser finish-acknowledgment race.

**Remaining scope:** Public/founder-member access **not approved**, actual second signed-in non-QA identity penetration test remains separate, 88 other historical datasets require authentic independent verification and individual publication approval. No LIVE Stripe checkout/charge was initiated.

### Release-control checkpoint
- Source verification: **Accepted for DIS limited QA**.
- Draft candle storage: **Complete**.
- IEX attribution: **Displayed and linked**.
- Controlled QA-only dataset publication: **Complete**.
- Real authenticated replay / browser acceptance: **Passed**.
- General member publication: **Closed**.
- Remaining 88 real-market publications: **Not completed**.

### Revision history
- v1.2 — 2026-10-29 — DIS source verified, 30 real minute candles staged then published QA-only, full real-member production acceptance passed; retail flag remains closed.

**Document footer:** SMFGU-HR-IEX-20240507-EVIDENCE-001 | HR source evidence v1.2 | Controlled record | Not attorney-reviewed.
