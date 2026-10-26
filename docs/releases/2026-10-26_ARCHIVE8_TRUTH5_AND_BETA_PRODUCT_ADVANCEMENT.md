# Archive 8 research integration and sellable-beta teaching — October 26, 2026

## Roles and controlled baseline

Owner representative; security architect; Cloudflare engineer; Supabase/PostgreSQL engineer; curriculum and source-verification editor; commerce engineer; QA/accessibility reviewer; equity-market research specialist.

Authoritative website source: GitHub `cybernexuspublishing/stock-market-from-the-ground-up`, `main`, never a stale version prefix. Production: Yahoo Cloudflare Pages project `stock-market-from-the-ground-up`. The Owner's newest verified research is the uploaded `StocksToTrade-Browser-Research (8).zip`, NOT the previously referenced archive (6). Only original educational paraphrase and public citations were put in the site; private Chrome profile, cookies, source transcripts, chart screenshots and vendor research artifacts were NOT committed.

Archive (8) research collection QA `private/observations/RESEARCH_001_300_QA.json`: 320 source rows, 300 topical scope IDs, zero duplicate source IDs, all 300 at **EDUCATIONAL_RESEARCH_COMPLETE within the bounded source-research scope**. It also explicitly records `fully_complete_topics: 0`; these are not graded labs, licensed historical OHLCV bars, independently verified trader executions, or accepted manuscripts. Research archive (8) contains new material relative to archive (6): public and claimed trade registers and historical source detail continuation; no user/private browser-state data is needed for instruction.

Read-only production Supabase audit in this work section: 419 active/visible canonical Labs; 177 existing private Lab instruction records; 0 reviewed private grading sets; 1 Academy enrollment; 60 Store records; 0 `sale_ready=true`. These counts are a dated snapshot, not a certification of 419 finished lessons.

## Four real research investigations added to the existing five-day Truth Behind the Ticker program

| Day | Exact archive evidence | What the member sees | Verification limits |
|---|---|---|---|
| 1 | STT-S-0075; `STT_HISTORICAL_SOURCE_DETAILS_2026-10-24.md`, HIMS case | HIMS source-reported **no-trade** decision with a primary-document verification prompt | No independent execution or precise news/quote timeline in the selected article. A reported non-trade is not a winning trade. |
| 3 | STT-S-0318; `STT_PUBLIC_TRADE_AND_CASE_CONTINUATION_2026-10-24.md` | PLRX author-reported $22.01 stop trigger / $20 risk reference / approximate $0.22/share loss; split chronological claims vs trade evidence | A planned risk reference differs from an execution fill. No broker confirmation or rights-licensed OHLCV. |
| 4 | STT-S-0320; `STT_HISTORICAL_SOURCE_DETAILS_2026-10-24.md` | SSM article's $4.23/$4.10/$4.84 **retrospective hypothetical** plan. Risk $0.13, target gap $0.61, ≈4.69 price-distance R; $100 nominal cap floors to 769 whole shares before costs | Archive captured a Sep. 5 page date while later public retrieval displayed Sep. 4; that difference remains disclosed. The Sep. 1 chart caption is source-reported, not an independent trade. Stops are not guaranteed fill prices. |
| 5 | STT-S-0085; `STT_HISTORICAL_SOURCE_DETAILS_2026-10-24.md` | MNDR/NCPL source-reported pre-open 57m/3.5m vs 9m/4.3m volume/float (~16.29x vs ~2.09x); 9:38 scanner pause with later 89%/77% signal-to-high claims hidden from a contemporaneous decision | No verified quote/liquidity, unique share-turnover inference, broker fill or complete performance sample. Later highs remain retrospective. |

The instructor's source-case content uses static `sourceClaimCase` descriptors attached to the pre-existing `truth5Lessons` days, not a new learning engine, new independent SKU or duplicate progress table. Rendering is inside `assets/js/bootcamp-academy-v014168.js` using DOM text nodes only and an allowlisted public `https://stockstotrade.com` link; the licensed chart content and trade records are not copied. Existing `/api/bootcamp-academy` verifies user membership for these day records; the public unauthenticated catalog exposes program metadata, not private member reflection or these day details. Learning examples remain ungraded with independent transfer prompts.

Current outside verification: SEC Investor.gov orders guidance explains that a stop order's stop price is a trigger and not a guaranteed execution price; a stop-limit controls price but may not execute. Public resource: https://www.investor.gov/introduction-investing/general-resources/news-alerts/alerts-bulletins/investor-bulletins-15 . Source pages inspected: https://stockstotrade.com/two-key-lessons-from-my-live-plrx-trade/ and https://stockstotrade.com/perfect-example-of-the-vwap-hold/ . Public articles are supplier statements, not certified market history.

## Production entitlement hardening

Existing `public.user_has_tool_access(uuid,text)` grants the existing `ONDEMAND_MONTHLY` educational membership only `ONDEMAND_TRAINING` on valid active, nonexpired member grants/subscriptions, with restricted/Showcase denials, and still preserves separate full-platform entitlements. No new member rows, Mastery, Sparks, orders or payments created.

Added a guarded metadata-only migration:
- `supabase/migrations/20261026_training_access_rpc_search_path_hardening.sql`
- `supabase/rollbacks/20261026_training_access_rpc_search_path_hardening_ROLLBACK.sql`
- `supabase/admin/20261026_training_access_rpc_search_path_PREFLIGHT_READ_ONLY.sql`

**PROVEN in live Supabase:** SECURITY DEFINER function has empty search_path, only `service_role` can EXECUTE (anonymous and authenticated role cannot), and exactly one corresponding audit entry. No LIVE Stripe keys, configuration, prices or transactions accessed.

## CI acceptance and reproducibility

Tests connected to existing Boot Camp workflow: `tests/test_truth5_archive8_source_cases.mjs` checks day case provenance, arithmetic, time-outcome boundary, source links, no official grading, public catalog redaction and safe DOM. Existing `tests/test_sellable_training_product_v1.mjs` and the isolated PostgreSQL entitlement fixture remain active. The sitewide GitHub workflow also covers the shared v3.2/v3.3 Lab Engine and mobile/browser contracts. Outdated test expectations were updated to preserve owner-approved member display name **Talia** and *clearly marked FICTIONAL* teaching.

A source commit proves that code was written, not that all workflows passed or member journeys were exercised. Each test is labeled **TESTED** only after a completed passing exact-head CI or independently reproduced run. Cloudflare deployed source revision and signed-in member behavior must be checked separately. Owner-controlled human beta feedback may arrive later and does not prevent continued safe releases.

## Current acceptance decisions

- **ACCEPTED — Provider/security scope:** Service-role execution controls and empty search path, verified live; guarded rollback committed.
- **ACCEPTED — Authored instructional addition:** Four original teaching cases use the approved research archive responsibly; editorial and independently graded assessment acceptance not claimed.
- **CARRIED FORWARD:** Checkout fulfillment and Stripe TEST end-to-end subscriber lifecycle, actual member persistence/resume, authenticated Lab coverage, WCAG browser audit and independent grading of 336 target Labs. All `sale_ready` flags remain off until purchase/delivery proves correct; the site and guided beta teaching can still be continuously published.
- **Owner-only exclusion:** LIVE payment testing and transactions remain untouched. No user decision is required for continued engineering. Members see “Founding Members”; the numerical 600-place capacity remains internal.

No global “NO-GO” banner or blanket stop-work is justified by the existence of unfinished assessments. Evidence states reflect each individual system.
