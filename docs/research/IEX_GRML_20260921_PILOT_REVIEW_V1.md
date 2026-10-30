# GRML Historical Replay Pilot — September 21, 2026

## Document control
| Field | Value |
|---|---|
| Organization / imprint | Cyber Nexus / Crown & Lantern Press |
| Project | The Stock Market: From the Ground Up — Historical Replay Academy |
| File | `docs/research/IEX_GRML_20260921_PILOT_REVIEW_V1.md` |
| Type | Markdown, repository-controlled historical case review |
| Document ID | SMFGU-HR-IEX-GRML-20260921-001 |
| Version | 1.4 |
| Date | October 30, 2026 |
| Google Drive location | Proposed Website / Research / Historical Replay / Case Reviews (not uploaded; Drive file ID unassigned) |
| Status | **PRIVATE DRAFT INGESTED — DO NOT PUBLISH; LESSON & AUTHENTICATED POSITIVE QA PENDING** |
| Dependencies | Original IEX TOPS archive; original fingerprint; corrected sparse-minute accounting; security identifier/corporate-action confirmation; market-data rights review; independent second-source sample verification; editorial/Talia review; signed-in production QA |
| Purpose | Preserve the owner-selected first GRML pilot and explicit criteria for release without modifying member entitlements or licensing flags |

## Original private source
- Date: 2026-09-21, 09:30–10:00 America/New_York.
- Exchange: **IEX single venue**, TOPS 1.6 / IEX-TP v1, not consolidated SIP/NBBO or all U.S. trading.
- Owner-held original: `data_feeds_20260921_20260921_IEXTP1_TOPS1.6.pcap.gz`.
- Reported verified compressed byte count: 10,282,646,165 bytes.
- Owner-reported local SHA-256: `01d84281611cb7df8523f5ba2ea77db8b61af5aefcd7c420e142dde792b4008b`.
- Full-day PCAPNG / gzip verification and reconciliation reported complete; assistant does **not** have the original source bytes locally in this turn.
- Source evaluation: first extract reported 30 of 30 price-forming one-minute GRML candles, zero observed IEX-TP sequence gaps/overlaps (as reported), and no observed selected-symbol trade-break messages. These are extractor-generated research results, not independently certified market data.
- Pilot database code: `HR_GRML_20260921`, linked Lab `DT-C35-L01`, status `draft`. Commercial-use and independent-review flags remain false.

## Candlestick and event conservation criteria
1. Preserve all recorded IEX trade events, including odd-lot and Form-T flagged trades when counting venue volume. Exclude price-ineligible trades from price formation using the published TOPS 1.66 sale-condition policy; do not infer consolidated market volume.
2. Every price-forming minute requires at least one last-sale-eligible trade; hours/minutes without such trades are **not** to be synthesized or forward-filled.
3. Report separately: completed price candles; minutes with trading volume but no eligible last-sale price; minutes with no recorded venue executions.
4. Require exact conservation: event count in price candles + event count in volume-only minutes = all surviving selected-symbol trade events after same-day break corrections. Same rule applies to their share volumes.
5. For the **first complete 30-minute GRML classroom case**, require each timestamp from 09:30 through 09:59 ET exactly once. Three-minute aggregation then produces 10 fully completed candles, five-minute produces 6, and 15-minute produces 2; incomplete higher-timeframe candles must remain invisible.
6. Preserve original unadjusted venue prices, four-decimal price precision, exchange-defined sale-condition flags, and the source's SHA-256. No direct client upload or public repository of customer-facing data.
7. Verify independent sample candles, corporate actions/security identifiers, unusual values, timestamp alignment and trade conditions before publication.

## Code and QA
- `scripts/market-data/iex_full_session_reconcile_v1.py` now retains explicit **volume-only** and **no-venue-trade** minute audit categories and verifies the event/share conservation invariants.
- `scripts/market-data/pcapng_iex_reader.py` recognizes actual NUL padding in source security names.
- `scripts/market-data/prepare_reconciled_iex_draft_sql_v1.py` refuses a private draft import if volume-only events would be omitted or the revised volume audit is missing.
- Unit/fixture scope: `tests/test_iex_20260921_sparse_volume_conservation_v1.py`, existing IEX parsing/trade-condition/local reconciliation/draft importer tests.
- CI workflow: `.github/workflows/iex-grml-pilot-source-audit-v1.yml`. This CI uses synthetic fixtures, not the owner-held 10 GB original. Do not confuse passing fixture CI with live-source independent verification.
- The owner-local original reconciliation report predates the new volume-audit schema. A fresh report with the corrected tool must be generated and checked before final private import; do **not** import the old report by bypassing checks.

## Owner-local preliminary audit using the existing small JSON report
The already generated five-stock reconciliation JSON can be reviewed **without re-reading the 10 GB archive**. The audit below writes only source identity, candle counts, source flag counts and trade/event discrepancy diagnostics. It never publishes price bars. It is NOT the final independent review; the corrected full-archive scanner must ultimately be rerun to produce unambiguous volume-only minute evidence before draft import.

```powershell
$toolsDir = "$env:USERPROFILE\Downloads\IEX_Private_Tools"
New-Item -ItemType Directory -Force -Path $toolsDir | Out-Null
Invoke-WebRequest "https://raw.githubusercontent.com/cybernexuspublishing/stock-market-from-the-ground-up/main/scripts/market-data/audit_existing_iex_five_symbol_report_v1.py" -OutFile (Join-Path $toolsDir "audit_existing_iex_five_symbol_report_v1.py")
py (Join-Path $toolsDir "audit_existing_iex_five_symbol_report_v1.py") --input "$env:USERPROFILE\Downloads\IEX_20260921_five_symbol_review.json" --output "$env:USERPROFILE\Downloads\IEX_20260921_five_symbol_audit_summary.json"
```

If the summary reports an unexpected GRML event discrepancy or missing minute, the pilot stays on hold pending actual trade-level reconciliation. Share only the summary JSON for source-review discussion; preserve the original unabridged trade report privately.

## Rights and disclosures
IEX's published Historical Data Terms expressly address distribution, subject to attribution, usage restrictions and indemnification. Confirm those terms apply to this exact member-facing paid educational presentation and whether any additional terms apply to the downloaded source before marking rights approved. Do not infer attorney approval.

Required IEX attribution on customer-facing educational uses:
> Data provided for free by IEX. By accessing or using IEX Historical Data, you agree to the IEX Historical Data Terms of Use.

Terms link: https://www.iex.io/legal/hist-data-terms

Required scope statement: **Historical IEX-only venue trading activity; not a consolidated national tape, NBBO, broker fill or trading recommendation.**

## Acceptance checklist
- [ ] New extractor output independently reconciles all 30 GRML source minutes with zero unaccounted events or shares.
- [ ] Original source archive hash and exact byte count agree; no packet/sequence exceptions unresolved.
- [ ] Venue-specific prices and cross-checked sample trades independently reviewed and recorded.
- [ ] Security identity, corporate actions, trading halts and source sale-condition exclusions independently reviewed.
- [ ] Rights basis and required attribution documented and reviewed for paid website member display.
- [ ] Talia narrative and no-lookahead checkpoints individually editorial-approved.
- [ ] Draft import validated privately with SHA receipts; server RLS and private storage tested.
- [ ] Owner explicitly approves individual source release, not a bulk rights flag change.
- [ ] Genuine authenticated production GRML replay tested: protected first decision, stepwise timeframes, Talia synchronization, resume/finish and cross-member isolation.
- [ ] Deployed version, acceptance outcome, reviewer/date and rollback evidence archived.

## Rollback / non-actions
Do not activate member-facing sales/downloads, publish any of the five dates, import unreviewed source bars into public storage, change Founding Membership entitlements, charge Stripe, or deduct Sparks. GRML is the first **candidate**, not an approved customer product.

## Revision history
| Version | Date | Change |
|---|---|---|
| 1.0 | 2026-10-30 | Pilot selection, volume-conservation defect controls, source/rights/education acceptance gates. |


## Private draft-import preparation — Version 1.1 (October 30, 2026)

**Preparation complete; database import NOT EXECUTED and member release NOT APPROVED.**

The owner-uploaded corrected source reconciliation file `IEX_20260921_corrected_reconciliation.json` was processed locally. An isolated private package named `GRML_20260921_PRIVATE_DRAFT_IMPORT_v1.zip` contains the 30-candle SQL transaction, manifest, source-validation report, postflight SELECT statements and readme. **Do not commit that package, bars or SQL to public GitHub.**

- Source reconciliation JSON SHA-256: `8dcaf24b259df7087b15e9a395d3d2dca62db94d903363eac22728fca06cca5c`
- Owner-reported original compressed source SHA-256: `01d84281611cb7df8523f5ba2ea77db8b61af5aefcd7c420e142dde792b4008b`
- Normalized 30-bar digest SHA-256: `bd4df3005de8e8c64a1fc4fe544f45fb93eda1802b157b79fafb85581478f247`
- Internally checked source interval: 09:30–09:59 ET, all 30 minutes continuous
- Source event and share conservation: 2,473 trade events; 213,618 IEX-only shares; no volume-only or no-trade minute
- Supabase preflight: `HR_GRML_20260921` still `draft`, no bar rows at the time of preparation; historical training approval and redistribution rights false; direct member SELECT on the bars table not granted
- Legacy dataset metadata still says `Alpaca consolidated SIP` from earlier research. Prepared SQL corrects this to IEX-only venue attribution and links the original archive/normalization fingerprints **without** changing publication or rights flags.
- Existing first-Lab association `DT-C35-L01` preserved; other linked Labs are not implicitly approved.

**Execution hold:** Before any private SQL execution, confirm that retention of IEX-derived data in Supabase is allowed by applicable source terms, complete owner import review, and inspect SQL for current schema compatibility. Independent trade verification, corporate actions, paid-member display rights, Talia editorial review, and genuine authenticated positive replay acceptance are still open. Local file processing alone is not an independent market-data audit.

### Revision history addition

| Version | Date | Change |
|---|---|---|
| 1.1 | 2026-10-30 | Prepared, hashed and validated a 30-bar GRML private draft import package; no database insertion or publication. |


## Technical and legal pre-import gate — Version 1.2 (October 30, 2026)

### Independent vendor aggregation check — passed, with scope limitation
The existing *private owner-held* SQL preparation (`GRML_20260921_PRIVATE_DRAFT_IMPORT_v1.zip`, 30 1-minute IEX-only OHLCV bars) was cross-checked against a separately retrieved `Alpaca / IEX` stock-bars response for **September 21, 2026, 09:30–09:59 Eastern**. Every minute agreed on the UTC timestamp, open, high, low, close, and trading volume: **30/30 exact matches, 0 discrepancies**. Reaggregated source totals match at **213,618 IEX venue shares and 2,473 IEX venue trade prints**.

This is independent *vendor minute-bar aggregation corroboration*, NOT an independent exchange-of-origin or trade-by-trade certification. Both feeds originate from IEX, and any common upstream errors could agree. No raw vendor price records are reproduced in this public evidence record. Alpaca comparison used for internal QA only, not permission to redistribute Alpaca data. The original owner-file hash and source-reconciliation hashes remain as recorded in version 1.1.

### Issuer identity and prior corporate action
GRML corresponds to Greenland Mines Ltd. The Nasdaq Corporate Actions Alert **ECA2026-594**, dated August 20, 2026, reports a **1-for-50 reverse split effective August 24, 2026** and CUSIP change to **49876K202**, preceding the September 21 source period. Reference: https://m.nasdaqtrader.com/TraderNews.aspx?id=ECA2026-594 . SEC September 23, 2026 8-K concerning the September 21 reporting period confirms Greenland Mines common stock traded as GRML on Nasdaq: https://www.sec.gov/Archives/edgar/data/1907223/000121390026102691/ea0306408-8k_greenland.htm .

The candidate candles are unadjusted post-split IEX venue prices. External corporate-action evidence is collected, but the formal security master/CUSIP audit, adjustments/possible intervening events, and independent reviewer sign-off remain **NOT APPROVED**.

### Private Supabase retention and paid educational display — LEGAL HOLD
The directly applicable **IEX Historical Data Terms** expressly contemplate historical-data distribution with mandatory attribution: https://www.iex.io/legal/hist-data-terms . The broader **IEX Website Terms of Use**, however, restrict commercial copying, storage, display and redistribution without prior consent except where otherwise permitted or superseded by agreements: https://www.iex.io/legal/terms . It is NOT clear from the public documents alone whether third-party cloud storage of derived historical candles and offering them to paid authenticated education members is sufficiently authorized without additional written consent.

**Gate decision:** seek explicit written clarification from IEX legal/market data on (a) derived minute OHLCV storage in Supabase/PostgreSQL, (b) website display to paying members using server-controlled playback, (c) whether historical redistribution terms override the general terms for this use, (d) whether a subscriber/distributor agreement or fees apply, and (e) exact attribution wording/placement. Pending that response, do not execute the prepared private SQL, mark rights verified, publish GRML or enable historical customer sessions.

### Safeguards and action log
- Existing 30-bar SQL package audited: bounded transaction, draft-only and no-overwrite checks, source/hash references, IEX-only attribution, retention/release approval flags left false. **No SQL executed.**
- Database RLS reviewed: `market_datasets` has a SELECT rule for `verified`/`published`, not draft; `gu_replay_bars_v01492` has RLS enabled and no direct `authenticated` SELECT grant/policy.
- Informational comparison with Alpaca's IEX feed is NOT a license to store its 30 bar rows or publish an export.
- Genuine signed-in positive replay remains NOT ACCEPTED; first decision lock and member isolation must be verified after licensed publication.
- The legal question has been prepared for IEX via the business email account as an **unsent draft**, subject to Owner review.

### Revision history addition
| Version | Date | Change |
|---|---|---|
| 1.2 | 2026-10-30 | Independently supplied IEX vendor 30-of-30 OHLCV comparison; Nasdaq reverse split evidence; contractual conflict identified and release held; private SQL/RLS gate reviewed. |


## Private draft ingested — Version 1.3 (October 30, 2026)

### Rights decision: owner-confirmed authorization (supersedes the previous request-for-clarification hold)

The project owner explicitly confirmed in conversation that **IEX authorized both of the stated uses**: (1) storage of IEX-derived historical candle records in private Supabase/PostgreSQL and (2) display of those historical candles to paying members of this educational website. This **owner-reported grant is the controlling product-owner direction**. A copy of the underlying written IEX confirmation was not attached, reviewed or independently authenticated in this project. Do not describe it as independently legally verified or attorney-approved, and preserve any later written evidence in restricted legal records. The earlier v1.2 request to contact IEX again is superseded; do not make duplicate outreach solely for the same issue.

**This confirmation authorizes private ingestion but is not an instruction to publish GRML without technical, editorial, and real-browser acceptance.** To avoid accidental member access, the existing `licensed_for_member_display=false`, `license_publication_reviewed=false`, `historical_evidence_verified=false`, and `ondemand_training_approved=false` flags remain false at the draft stage. The owner confirmation is separately recorded in `metadata.owner_attested_iex_permission`, including the precise permission scope, date and provenance.

### Verified private database import

- Dataset: `HR_GRML_20260921`; existing 14 Lab associations preserved, no new Lab identity created.
- Source: owner-uploaded corrected IEX TOPS source reconciliation JSON, SHA-256 `8dcaf24b259df7087b15e9a395d3d2dca62db94d903363eac22728fca06cca5c`.
- Original archive referenced by reconciliation report: `01d84281611cb7df8523f5ba2ea77db8b61af5aefcd7c420e142dde792b4008b` (10,282,646,165 compressed bytes). Original archive remains on the owner's machine; only derived GRML candles were imported.
- Transaction preflight enforced exact source/date/venue, `draft` status, no existing bars, 30 continuous timestamps from 09:30 through 09:59 ET, valid OHLC precision, no volume-only minutes, and 2,473 conserved events / 213,618 conserved shares.
- Supabase transaction inserted precisely 30 private `gu_replay_bars_v01492` rows, indexes 0–29, unadjusted IEX-only one-minute OHLCV. Independent postflight SELECT returned `bars=30`, `first_idx=0`, `last_idx=29`, `shares=213618`.
- Dataset `source_feed` was corrected from stale `ALPACA_SIP_RESEARCH_ONLY` to `IEX_HIST_TOPS_1.6_OWNER_ORIGINAL`; venue scope now `IEX_SINGLE_VENUE_NOT_SIP`. Required IEX attribution and historical-terms URL are stored in `source_attribution`.
- Final production status remains `draft`. Member-display and training-approval flags remain **false**. No Stripe transactions, Crownlight Sparks debits, or entitlements changed.
- Earlier separate-provider (Alpaca IEX) 30/30 matching OHLCV comparison is retained as technical corroboration; it is not the source of the imported bars and is not independent exchange-of-origin certification.
- This is a **PRIVATE DRAFT DATA INGESTION ACCEPTANCE**, not a commercial member playback, publication or legal counsel approval.

### Remaining acceptance before member exposure

1. Inspect and affirm the Talia GRML lesson's bar-by-bar coaching checkpoints, no-lookahead aggregation for 1/3/5/15-minute views, corporate-action context and IEX-only scope notice.
2. Confirm server entitlement and RLS isolation, including authenticated/non-authenticated draft-denial tests and negative cross-account access. Keep published catalog empty for this case until approval.
3. When individually authorized for release, record the reviewer and date, update publication flags consistently using the existing server validation gate, and run genuine logged-in positive end-to-end replay against this **exact** source: first decision lock, controlled advance, replay timing, review cursor, restart/resume, finalization, and account separation.
4. Capture exact deployed commit, signed QA result and rollback instructions. No bulk activation of the other 88 historical cases.

### Revision history addition
| Version | Date | Change |
|---|---|---|
| 1.3 | 2026-10-30 | Owner confirms permitted Supabase retention and paid-member educational display; 30 source-verified GRML bars privately imported and postflight checked; member publication remains off. |


## GRML Talia classroom teaching acceptance — Version 1.4 (October 30, 2026)

### Product/editorial sequence
GRML is taught through the same protected first-decision lock and private, forward-only source cursor. **No future OHLCV bars, answers from later timestamps, ticker forecasts or brokerage fills are embedded in the lesson script.**

Eight authored checkpoints were added to the existing classroom engine:

| Source-minute observations revealed | Talia lesson | Evidence/response method |
|---:|---|---|
| 1 | Observe before predicting | Explain what one venue-only completed candle can and cannot establish |
| 3 | Recognize candle sequences | Guided comparison of completed highs/lows/closes and uncertainty |
| 5 | Read venue volume carefully | Distinguish IEX-only volume from national volume and trading direction |
| 10 | Mark observed levels without hindsight | Identify decision-time reference and invalidation |
| 15 | Check completed higher timeframes | Compare only fully completed 1m, 3m, 5m and 15m candles |
| 20 | Define the trade and the risk | State trigger, invalidation, friction or defensible NO TRADE |
| 25 | Reassess rather than force a setup | Reevaluate the hypothesis using only revealed prices |
| 30 | Separate decision quality from hindsight | Review original locked decision without backcasting the outcome |

Each stage has teach → current completed-candle evidence → three-choice ungraded question → corrective feedback/retry → transfer task. All answers are held solely in the current browser session, cleared on replay reset or sign-out; not recorded as course mastery. Replaying earlier observed bars does not move the server cursor. Automatic playback pauses at these stage boundaries when Talia autoplay pauses are enabled. Chart intervals never generate incomplete higher-timeframe bars. This version does not yet provide formal protected graded Lab assessment.

**Editorial acceptance for QA:** These eight instructional prompts are reviewed against the Foundation one-on-one novice teaching sequence and correct single-exchange limitations; reviewer-delegated acceptance is limited to GRML QA practice. True authenticated production rendering and accessibility require real-account acceptance.

### Code and acceptance evidence
- Teaching model: `assets/js/historical-grml-talia-v1.js` (no market prices embedded).
- UI integration: `assets/js/historical-replay-classroom-v1.js`; presentation `assets/css/historical-replay-classroom-v1.css`; protected page `verified-replay.html`.
- Isolated fixture tests: `tests/test_historical_grml_talia_v1.mjs` and `tests/test_historical_grml_talia_browser_v1.mjs`. These are NOT genuine-account acceptance.
- Genuine GRML-only scripts staged: `tests/test_historical_grml_authenticated_production_v1.mjs` and `tests/test_historical_grml_authenticated_browser_v1.mjs`. No mocked auth/data is permitted in these tests; positive acceptance requires a controlled pinned QA allowlist, real entitlement, production deployment and actual login.
- Classroom CI: `.github/workflows/historical-replay-classroom-v1.yml`; record final workflow and result separately. No synthetic fixture result may be labeled a genuine production pass.
- Dedicated QA-only release policy: Do **not** expose this case to paying members before real account acceptance. The `qa_release_only` allowlist is the existing permitted mechanism for a non-commercial closed browser test. No bulk publishing of all historical cases.

### Revision history addition
| Version | Date | Change |
|---|---|---|
| 1.4 | 2026-10-30 | Added eight stage-specific Talia explanations, ungraded questions/retries/transfer, no-lookahead timing tests and dedicated genuine-account GRML acceptance scripts. |
