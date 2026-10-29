# IEX TOPS — 2026-09-21 — Authentic source acquisition record

Document control
- Project: The Stock Market: From the Ground Up / Historical Replay Academy
- ID: SMFGU-HR-IEX-20260921-INTAKE-001
- Version: 1.0
- Date: 2026-10-29
- Status: OWNER DOWNLOADED ORIGINAL / LOCAL SHA-256 REPORTED / FULL GZIP INTEGRITY UNCHECKED / NOT APPROVED FOR CUSTOMER DISPLAY
- File: docs/research/IEX_TOPS_20260921_SOURCE_INTAKE.md
- Google Drive location: proposed Website / Research / Historical Replay / Source Evidence; not uploaded
- Google Drive document ID: not assigned
- Purpose: Ensure only actual, traceable market trades are released to paying members
- Dependencies: authenticated IEX HIST portal access, source capture, independently accepted technical/legal review, private Supabase draft import, real-account production acceptance

## Identified official source
- IEX HIST catalog: https://iextrading.com/trading/market-data/
- Official terms: https://www.iex.io/legal/hist-data-terms
- Named canonical source: `20260921_IEXTP1_TOPS1.6.pcap.gz`; actual owner-downloaded archive: `data_feeds_20260921_20260921_IEXTP1_TOPS1.6.pcap.gz` (extra `data_feeds_YYYYMMDD_` prefix is accepted without renaming).
- Listed: 2026-09-21 TOPS v1.6, IEX-TP v1, approximately 10.28 GB.
- Download access: Owner reports downloading directly without logging in. The owner retains original bytes locally; those bytes have NOT been transferred to this repository or independently inspected in the assistant runtime. The source is not approved merely because its filename or size matches.
- Intended market scope: IEX SINGLE VENUE ONLY, not consolidated SIP, NBBO, official national volume or proof of brokerage fills.

## Canonical dated cases at the source date
| Ticker | Linked canonical Lab | Current approval |
|---|---|---|
| BTTC | DT-C36-L01 | Draft, source not acquired |
| GRML | DT-C35-L01 | Draft, source not acquired |
| HUBC | DT-C51-L01 | Draft, only four SIP minute observations returned in earlier research; do not fabricate missing minutes |
| MBRX | DT-C51-L02 | Draft, source not acquired |
| VRME | DT-C37-L01 | Draft, source not acquired |

## Required acquisition and review (not yet completed)
1. Authorized IEX account operator signs into https://iextrading.com/trading/market-data/ and obtains the original 2026-09-21 TOPS capture through the official portal. Do not purchase a data plan or accept additional fees without explicit owner permission.
2. Save the original file **outside all publicly served GitHub/Pages/assets and production client storage**. Record exact portal filename, download timestamp, byte count, SHA-256, official provenance URL, applicable terms version and the account/license evidence. Do not paste session tokens or IEX credentials into GitHub.
3. Use existing `scripts/market-data/iex_tops.py` to decode for one ticker in a restricted/private runtime. Treat the result as quarantined, not approved or licensed automatically.
4. Reconcile IEX-TP packet sequence gaps, feed version and stock identity; filter trade messages and sale conditions; verify corporate actions, time zone and exchange-session boundaries. Missing minutes can mean no venue executions, halts or damaged packet coverage and must be evaluated rather than forward-filled.
5. Run `scripts/market-data/prepare_replay_import.py` to prepare draft candidate bars and metadata. Output MUST stay in a private working directory and retain the exact IEX attribution + terms hyperlink.
6. Independent reviewer accepts source integrity, rights, candle values, venue scope, case-specific Talia teaching and no-lookahead controls, and signs/dates source evidence.
7. Import only into private draft storage; publish each approved case individually after rights/signoff rather than using a bulk flag change.
8. Use genuine-account production QA workflow `.github/workflows/historical-replay-authenticated-production-v1.yml` for positive start → lock → advance → 1/3/5-minute view → resume → finish after authorized publication. Follow with cross-member isolation testing.

## Current evidence and blockers
- Source identified in official public IEX catalog: YES.
- Exact direct download obtained: YES, on owner's own Windows system according to owner; remote retrieval by assistant: NO.
- Original compressed SHA-256: RECORDED FROM OWNER POWERSHELL SCREENSHOT, awaiting independent archive and official-source verification.
- Validated IEX-only minute bars: NO.
- Approved customer-display rights for this specific source: REVIEW PENDING.
- Published datasets and genuine positive historical replay: NONE.
- Genuine account negative authorization tests: previously PASSED. These do not meet positive lifecycle acceptance.

## Important distinctions
Alpaca SIP price observations from earlier research may be used for independent internal comparisons only within their contract. They are not interchangeable with IEX venue trades or redistributable IEX-sourced historical bars. Do not copy third-party SIP bars into member displays without required rights.

**Release outcome: HOLD.** This record is not a license certificate or permission to publish.

## Owner download evidence — October 29, 2026

Owner's Windows PowerShell screenshot shows the following independent local observations; **the source file itself was not uploaded**:
- Original filename: `data_feeds_20260921_20260921_IEXTP1_TOPS1.6.pcap.gz`
- `Get-Item` output: **9.58 GiB** (Windows PowerShell / 1 GiB = 1,073,741,824 bytes).
- `Get-FileHash -Algorithm SHA256` output: `01D84281611CB7DF8523F5BA2EA77DB8B61AF5AEFCD7C420E142DDE792B4008B`.
- Official catalog compressed byte count: **10,282,646,165 bytes**; the rounded 9.58 GiB reading is consistent but does not prove the exact byte count.
- SHA provenance classification: OWNER-REPORTED LOCAL HASH, not independently compared with an official IEX-published hash; do not treat as source-authenticity certification.

The offline intake script `scripts/market-data/verify_local_iex_archive_v1.py` is designed to check the exact catalog byte count, recompute original SHA-256, stream every decompressed byte without storing the expanded file, and validate the gzip trailer/CRC and PCAP versus PCAPNG signature. It writes a small JSON record only if explicitly requested; **no market trade data are uploaded or published**. Later trade-condition filtering, IEX-TP packet reconciliation, corporate actions and rights approval remain separate gates.

### Windows command for offline full integrity checking
Requires installed Python 3.10+ with the standard library. Download the script from this repository's official `main` branch to a temporary local file, then run:

```powershell
$file = "$env:USERPROFILE\Downloads\data_feeds_20260921_20260921_IEXTP1_TOPS1.6.pcap.gz"
$script = "$env:TEMP\verify_local_iex_archive_v1.py"
Invoke-WebRequest "https://raw.githubusercontent.com/cybernexuspublishing/stock-market-from-the-ground-up/main/scripts/market-data/verify_local_iex_archive_v1.py" -OutFile $script
py $script --file $file --date 2026-09-21 --sha256 01D84281611CB7DF8523F5BA2EA77DB8B61AF5AEFCD7C420E142DDE792B4008B --expected-bytes 10282646165 --report "$env:USERPROFILE\Downloads\IEX_20260921_integrity.json"
```

**Next milestone:** full-stream local report with valid gzip CRC, recorded PCAP/PCAPNG type, exact compressed byte count and matching SHA; only then proceed to private trade extraction and per-symbol data inspection.
