# Crownlight Watchlist Intelligence — Controlling Beta Readiness Register
**As of:** 2026-10-30
**Scope:** Full owner-authorized Master Execution Directive; this register is a resumable evidence ledger, not a claim of beta readiness.
**Repository:** `cybernexuspublishing/stock-market-from-the-ground-up` / `main`.
**Baseline commit:** `ff0e0824daabbe0455b00f2c2c8a756d803c18da`.
**Baseline Cloudflare:** production deployment `ab9ef7bf-c081-4507-b97d-65bd4b47e1e5`, success at the matching SHA, verified on 2026-10-30.
**Supabase:** primary project `oxihglyfgzywsupnyicb` ACTIVE_HEALTHY. Existing 419 Labs; private Free watchlist, V3 Journal transfer/research alerts, Lumen entitlements and chart workspace tables present with RLS reported enabled. Table existence does not demonstrate user-journey success.

## Completion matrix

| Workstream | Current evidence | State | Blocker / next executable test |
|---|---|---|---|
| Free Research Watchlist | `functions/api/free-watchlist.js`; continuity release 2026-10-30; 20-symbol stored quota | IMPLEMENTED | Real authenticated Free save/archive/restore/continuity acceptance |
| Advanced Watchlist V3 | `assets/js/watchlist-intelligence-v2.js`, `assets/js/watchlist-research-core-v2.js`, `functions/api/watchlist-alerts-v3.js` | IMPLEMENTED | Paid/expired member browser and persistence tests |
| Scanner and pattern engine | `assets/js/market-research-engine-v014145.js`, existing regression workflow | IMPLEMENTED | Licensed, chronologically verified sources for automated screening |
| SEC company/filing research | `functions/api/sec-issuer-research-v1.js` and `functions/_lib/sec-issuer-normalize-v1.js` added in this batch; fixed SEC origins, explicit CIK cross-check | IMPLEMENTED (guarded) | Production contact-identifying `SEC_EDGAR_USER_AGENT` and explicit `SEC_EDGAR_BETA_ENABLED=true`; global fetch rate coordination and real SEC source acceptance |
| Company fundamentals | SEC XBRL facts normalize with units, periods and unknown timestamps; no float inference | PARTIAL | Real issuer tests, revision/as-of chronology, interactive ECharts plots, wider filing coverage |
| ECharts and Chart Studio | Existing V2 Studio, saved-plan levels, source tests | IMPLEMENTED | Authenticated Studio tier, sync, persistence, no-lookahead tests |
| Advanced Trade-Plan Builder | Existing V1.1 lifecycle, scale-outs, trailing study, stored plans | IMPLEMENTED | Authenticated execution and mobile acceptance |
| Journal transfer | Existing Supabase RPC and Cloudflare `watchlist-journal-transfer-v3` | IMPLEMENTED | End-to-end idempotent multi-account Journal verification |
| Research-to-trade analytics | Journal quality and research links source present | PARTIAL | Full decision-to-result linkage, sample/missingness, measured MFE/MAE |
| Talia / Labs / Boot Camps | Prior STT sitewide reconciliation; 419 Labs still mapped | PARTIAL | Beginner-first authenticated experience and protected grading acceptance |
| Alerts / monitoring | Manual private research alerts V3 | PARTIAL | Server scheduling, preferences, authorized price/data feeds |
| Timed Lumen/cash access | Existing offers, single currency ledger, TEST drafts | PARTIAL | Genuine Stripe TEST lifecycle, expiry/reversal/reconcile |
| Administration | Existing Admin Control Center | PARTIAL | SEC source visibility, admin error monitoring, full editorial acceptance |
| CI / production | Baseline deployed SHA verified, current source checks must run | TESTING | Confirm new exact SHA CI and matching Cloudflare production deployment |

## SEC beta source restrictions
The SEC officially documents `company_tickers.json`, `/submissions/CIK##########.json` and `/api/xbrl/companyfacts/CIK##########.json`. `company_tickers.json` is not guaranteed complete or accurate. Programmatic fair-access limit is at most ten aggregate requests per second: https://www.sec.gov/search-filings/edgar-application-programming-interfaces and https://www.sec.gov/files/privacy.htm.

This source batch requires explicit server activation and an identified User-Agent; with no config, it fails closed without claiming verified records. Edge caching does not guarantee global throttling across Cloudflare points of presence, so multi-region/production ingestion must add a shared rate coordinator before unrestricted beta volume. No third-party news feeds or licensed quote redistribution was added. Dates without a verified filing acceptance time are **not** valid for historical intraday replay. Filing reports never imply a tradable signal or order.

## Resume from here
1. Check the actual resulting commit on `main` and exact-commit CI; verify matching Cloudflare deployment and check for concurrent commits.
2. Resolve SEC activation/global-rate guard and perform authentic SEC company identity/filings/fundamentals acceptance; keep functionality visibly blocked if unavailable.
3. Add SEC catalyst-event timeline into existing per-ticker research records only after verified source/time matching; never alter immutable original research.
4. Advance authenticated Watchlist → Chart Studio → saved plan → Journal → research-to-trade analytics; log individual pass/fail.
5. Complete Lumen/Stripe TEST lifecycle, admin and Academy/Talia integration; never enable paid LIVE charges to manufacture test evidence.
6. Mark BETA READY only when all owner-defined gates are individually verified. Owner routine approvals are delegated; real-money spending and external rights remain separate.

**No changes in this batch to:** Supabase schemas/data, member entitlements, Lumen balances, Stripe LIVE, master Lab grading, historical replay, or actual brokerage orders.

## 2026-10-30 implementation evidence addendum
- `858ad6ef`: guarded server-side SEC issuer API, XBRL normalization, member UI, automated test; **dedicated scanner/research CI passed**. Matching Cloudflare production deployed, but SEC retrieval remains disabled without verified server configuration and global fair-use coordination.
- `020f5edf`: repaired D08 legacy source test to mock both member-scoped Tiingo and Alpaca credentials. **D08 and scanner CI passed** on this exact SHA; no production credential or entitlement modification.
- `32d6c632`: corrected acceptance/publication timestamps and blocked unverified intraday historical replay; scanner and D08 CI passed; matching Cloudflare deployment succeeded.
- `45b4eccd`: Talia browser test now asserts the actual fictional benchmark disclosure; dedicated scanner/D08 tests passed, but sitewide CI revealed a different obsolete branding assertion.
- `7ca3c735`: source fidelity test updated to canonical `Crownlight Lumens Wallet` text; no wallet or debit behavior change.
- Additional feature under this checkpoint: read-only ECharts bar comparison of SEC-reported XBRL observations, never represented as matched-period growth or live quotes.
- **NOT accepted beta-ready:** unknown member-account browser testing; server SEC feature gating; global SEC rate coordination; full company financial chronology and live source verification; genuine Stripe TEST lifecycle and entitlement expiration tests; integration cross-product acceptance.
