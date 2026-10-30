# GRML Historical Replay Pilot — September 21, 2026

## Document control
| Field | Value |
|---|---|
| Organization / imprint | Cyber Nexus / Crown & Lantern Press |
| Project | The Stock Market: From the Ground Up — Historical Replay Academy |
| File | `docs/research/IEX_GRML_20260921_PILOT_REVIEW_V1.md` |
| Type | Markdown, repository-controlled historical case review |
| Document ID | SMFGU-HR-IEX-GRML-20260921-001 |
| Version | 1.0 |
| Date | October 30, 2026 |
| Google Drive location | Proposed Website / Research / Historical Replay / Case Reviews (not uploaded; Drive file ID unassigned) |
| Status | **TECHNICAL REVIEW CANDIDATE — DO NOT PUBLISH** |
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
