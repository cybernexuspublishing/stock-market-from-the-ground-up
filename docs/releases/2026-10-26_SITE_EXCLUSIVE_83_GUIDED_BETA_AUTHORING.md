# 83 Site-Exclusive Labs — Original Guided Beta Authoring and Access

**Source baseline:** GitHub `main`, private Supabase project `oxihglyfgzywsupnyicb`, Owner's October 26 authorization for all 419 canonical IDs.  
**Status:** All 83 `SITE-018`–`SITE-100` have original nine-stage private teaching **AUTHORED**. Individual editorial review, protected assessment verification, authentic two-member progress and browser acceptance remain **OPEN**. Owner-authorized controlled beta testing may proceed with appropriate account rights.

## Scope and provenance

- Reuse the 419 canonical `platform_labs` entries and their existing `SITE_EXCLUSIVE` subject titles, modes, objectives and sort-order. No new or changed canonical IDs.
- Use the Owner-approved `StocksToTrade-Browser-Research (6).zip` research archive as a *private instructional reference*. Its topical batch indices are referenced inside the private records, not published as proprietary research files.
- Source research and terminology also reference SEC EDGAR, Investor.gov, NYSE official auction/trading material. The exact official URLs per Lab are stored in private `content.sourceURLs` and only filtered official links are allowlisted by the member teaching endpoint.
- All numerical scenarios, quoted prices, company examples, fills and times in the instructional drafts are **FICTIONAL educational constructs**, not real historical market data, verified broker fills or investment advice.
- Each of the 83 original instructional rows has `concept`, `objective`, `what`, `why`, `when`, `workedExample`, `commonError`, `limitation`, official source URLs, and nine substantial stage-specific steps: Start, Learn, Experiment, Predict, Practice, Assess (self-reflection only), Review, Transfer, Results. Fictional cases are topic-specific.
- `source_status='original_site_exclusive_guided_beta_unreviewed_v014294'`, `lessonBatch='2026-10-26-SITE-018-100-AUTHORED'`, `historicalEvidence='NOT_VERIFIED_NO_ACTUAL_MARKET_BARS'`, `reviewed_by=NULL`, `reviewed_at=NULL`. **Never mislabel as editorially reviewed.**
- No private official answers, protected assessment rubrics, grades, Crownlight Sparks, trading results, entitlement grants, or members' existing attempts were changed.

## Original authored lesson themes (21)

| Canonical IDs | Subject | Decision and worked-case focus |
|---|---|---|
| SITE-018–020 | Trading Journal & Performance Analytics | MFE/MAE, R-multiple accounting, documented plan versus hindsight |
| SITE-021–024 | Market Tutor | source check, observation versus inference, no personalized recommendations |
| SITE-025–028 | Market Discovery Lab | inclusive price/volume eligibility, no automatic trade |
| SITE-029–032 | Scanner Builder & Historical Scanner Replay | Boolean predicates, frozen as-of snapshots, no future volume |
| SITE-033–036 | Watchlist & Trade-Plan Workbench | source-backed shortlist, invalidation, decision gates |
| SITE-037–040 | Catalyst & Filing Research Lab | 8-K/10-Q/10-K and claim/publication chronology |
| SITE-041–044 | Float & Supply Lab | outstanding shares versus float, dilution and dates |
| SITE-045–048 | Market Structure Lab | swing structure, timeframe boundaries, failed breakout |
| SITE-049–052 | Multi-Timeframe Synchronizer | complete versus incomplete candle, no look-ahead |
| SITE-053–056 | Risk & Position Sizing Laboratory | risk/share, floor quantity, spread/slippage |
| SITE-057–060 | Execution Laboratory | acknowledgments, weighted-average partial fills, cancel uncertainty |
| SITE-061–064 | Liquidity & Spread Laboratory | bid/ask arithmetic, displayed depth limitations |
| SITE-065–068 | Order Flow & Tape Laboratory | time and sales, Level II observations versus intent |
| SITE-069–072 | Strategy Validation | expectancy, sample inclusion, trading costs and overfit |
| SITE-073–076 | News & Source Verification | issuer filings, rumor and first-availability uncertainty |
| SITE-077–080 | Corporate Actions & Adjustments | split/reverse split ratio, raw versus adjusted prices |
| SITE-081–084 | Extended-Hours Context | widened spread, venue/session eligibility |
| SITE-085–088 | Halts & Limit Up-Limit Down | halts, frozen quotes, reopening contingencies |
| SITE-089–092 | Opening, Closing & Reopening Auctions | indicative versus executed match, exchange rules |
| SITE-093–096 | Order Types & Execution Control | market, limit, stop, stop-limit and execution risk |
| SITE-097–100 | Trade Review & Analytics | win rate versus expected outcome and process quality |

## Existing architecture changed, NOT duplicated

1. Schema migration `supabase/migrations/v0.14.0.294_site_exclusive_private_instruction_book6.sql` broadens the **existing** `lab_instruction_v014` book-number check from 1–3 to 1–6. It does not weaken RLS; `anon` and `authenticated` have no SELECT on the private instruction table.
2. All 83 original rows were created directly in service-role-only `lab_instruction_v014`, in five transactions. The stored set was postflight verified: **83 rows, 83 source statuses, 83 nine-stage instruction arrays, 83 source-linked rows, zero reviewed rows**.
3. `functions/_lib/site-exclusive-private-lesson-v014294.js` validates the ID, source batch, original fictional-case labeling, content density, nine ordered stages, and official reference links.
4. The **existing** member `functions/api/lab-content.js`, `lab-player-context.js`, and public IDs-only `lab-release-availability.js` are integrated. Server-side membership, active-account status, `ONDEMAND_TRAINING` entitlement and authored-source checks must succeed before private guided lesson text is released. Only safe teaching fields are returned. Official grading remains separately reviewed and denied for unreviewed SITE sets.
5. The existing `/labs.html` registry consumes the validated `guidedBetaIds`, and the original shared Lab player receives nine stage-specific instruction steps. Incomplete or inaccessible records still fail closed.
6. Secondary `assets/js/lab-registry.js` renderer accepts SITE IDs ONLY when independently identified as guided-eligible, preserving the separate canonical 336/83 list.
7. Founders Commons, Lab Registry copy and tests are updated without any parallel learning systems, Store transactions, entitlement bypass, Auth bypass or Live Stripe modifications.
8. A source regression suite (`tests/test_site_exclusive_guided_beta_v014294.mjs`) covers membership, access control, allowed teaching, protected-answer exclusion, official grading rejection and IDs-only release enumeration. The existing Boot Camp workflow runs it with the other member security checks.

## Release verification and rollback

- Database postflight query evidence: **83 original nine-stage records**, all in the private RLS table, 83 linked official-source arrays, **zero** reviewed/graded.
- Admin audit entry `admin_audit_log.id=74`: `curriculum.site_exclusive_original_instruction_import`, actor intentionally NULL (does not forge an authenticated Owner action), original 83 count, no grade/payment/entitlement change.
- Source tests/CI and real deployed Founder-member experience should be reported individually with exact SHA. No mocked or queued run qualifies as authentic production member acceptance.
- Reversal: `supabase/rollbacks/v0.14.0.294_site_exclusive_private_instruction_book6_rollback.sql` is a **guarded, documentation-only** path that requires approved backup, absence of member progress/attempts, unchanged original unreviewed records and explicit authorization. It MUST NOT run as part of normal rollout.
- If first-person Founder feedback or editorial corrections identify defects, update the respective Lab independently and rerun its tests. Do not bulk-promote `source_status` to reviewed without attributed review evidence.

## Content release decision

Owner-authorized beta catalog test scope: **419/419 Labs**. Newly **AUTHORED** private instructional records: **83/83 Site-Exclusive Labs**. Individual independent editorial reviews: **0/83** at import. Official assessments reviewed in this release: **0**, unchanged. Authentic production member tests for the 83: **not established by private record insertion**.
