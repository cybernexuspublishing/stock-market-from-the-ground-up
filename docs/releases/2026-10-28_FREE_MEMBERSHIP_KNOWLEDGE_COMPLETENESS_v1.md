# Free Membership Learning Experience — Foundational Knowledge Completeness Review

**Company / imprint:** Cyber Nexus / Crown & Lantern Press
**Project:** The Stock Market: From the Ground Up
**Document ID:** SMFGU-FREE-COMPLETE-001
**Filename:** `docs/releases/2026-10-28_FREE_MEMBERSHIP_KNOWLEDGE_COMPLETENESS_v1.md`
**Version:** 1.0 · **Date:** 2026-10-28
**Authoritative location:** GitHub `main`; no Google Drive ID assigned.
**Status:** Curriculum/source implementation complete, exact-head CI and authenticated production member acceptance tracked separately.

## Purpose

Make the Free Membership genuinely useful for an absolute beginner while transparently demonstrating the full platform's educational method. The Free teaching journey must not become a feature-locked advertisement, an uncertified grade, or a copy of the enrolled ebook.

## Audit and evidence

At audit start, the production canonical Cloudflare Pages deployment and GitHub main both pointed to `82b906edb2fb5d55b9e4d29c6a9d5f4640531d57`. All 25 triggered workflows for that commit passed, including Sitewide Playwright and its noncharging regression. The targeted Free Foundations workflow separately passed at the prior feature commit; it must rerun for this knowledge-library change. Production-authenticated account acceptance is not implied by either.

The Free Foundations program is **five guided, ungraded Academy lessons**: stock ownership and quote mechanics; candlesticks; primary research and evidence chronology; research watchlists; and execution-risk planning with NO TRADE. It preserves a nine-stage teaching sequence, five topic-specific interactive fictional demos and a Lab-style replay-setup rehearsal. The Free Dashboard, Watchlist, Market Simulator and Journal are separate practice resources.

Curriculum gaps verified against official SEC Investor.gov introductory curricula: saving/investing goals and time horizons; stocks/bonds/funds and diversification; primary and secondary market structure; orders and fills; brokerage cash/margin accounts; T+1 settlement; sessions, liquidity and halts; technical-indicator limitations; financial fundamentals/dividends; fees/taxes; SIPC market-loss limitations; independent process journaling.

## Supplemental teaching library (included with Free)

The twelve original, standalone reference topics appear inside the Free Foundations Academy, not as an eighth Boot Camp, a separate fee, or a change to the Free `free5` Academy schema.

| Topic ID | Teaching focus | Linked guided lesson |
|---|---|---:|
| goals | saving, investing, goals, risk tolerance and time horizons | 5 |
| instruments | stocks, bonds, mutual funds, ETFs and indexes | 1 |
| venues | primary/secondary markets, brokers and quotes | 1 |
| orders | market, limit, stop and stop-limit instructions | 5 |
| accounts | cash, margin, T+1 settlement and available funds | 5 |
| hours | sessions, spreads, liquidity, volume and halts | 2 |
| charts | completed OHLC, timeframes, VWAP/averages and indicator limits | 2 |
| fundamentals | revenue, earnings, EPS, P/E, dividends and corporate actions | 3 |
| diversify | asset allocation, correlation and concentration | 5 |
| costs | net outcomes, fees, spread and tax considerations | 5 |
| protection | broker protections, SIPC and fraud | 3 |
| process | fictional replay, decision-before-outcome, journaling and NO TRADE | 5 |

Each topic follows the owner-approved teaching sequence: define and explain; why it matters; repeatable method; original **fictional** worked case; independent written observation; a locally gated Talia comparison; correction of a common misunderstanding; a relevant regulatory-source link and a return to guided Free practice. Standard assistance and retries cost no Sparks. Learning notes entered into this reference library are **not stored**, scored or counted as mastery. Existing separately authenticated Academy private reflections are unchanged.

## Provenance and original sources

- SEC Investor.gov: `https://www.investor.gov/introduction-investing`
- SEC investment products: `https://www.investor.gov/introduction-investing/investing-basics/investment-products`
- SEC order types (updated August 18, 2026): `https://www.investor.gov/introduction-investing/general-resources/news-alerts/alerts-bulletins/investor-bulletins-14`
- SEC T+1 (applies to most US equity trades since May 28, 2024): `https://www.investor.gov/introduction-investing/general-resources/news-alerts/alerts-bulletins/investor-bulletins/new-t1-settlement-cycle-what-investors-need-know-investor-bulletin`
- SEC risk and diversification: `https://www.investor.gov/introduction-investing/getting-started/asset-allocation`
- SEC SIPC limitation: `https://www.investor.gov/introduction-investing/general-resources/news-alerts/alerts-bulletins/investor-bulletins/investor-bulletin-sipc-protection-part-1-sipc-basics`
- FINRA frequent intraday trading risks: `https://syndication.finra.org/content/frequent-intraday-trading-understanding-basics`

These are source references, not copied regulator articles. Verify time-sensitive rules against the member's broker and regulator before making decisions. Do not represent fictional cases as actual SEC market observations.

## Changes / boundaries

- Added `assets/js/free-foundations-knowledge-v1.js`: the twelve source-grounded, ungraded teaching modules and independent review interactions.
- Added `assets/css/free-foundations-knowledge-v1.css`: responsive/keyboard-accessible display.
- Updated `bootcamp-academy.html`: the knowledge-library section and registered assets.
- Added `tests/test_free_foundations_knowledge_v1.mjs`: coverage of all 12 topics, teach-first pedagogical contract, regulatory links, and no privileged APIs or payment.
- Updated `tests/test_free_membership_browser_v1.mjs`: responsive browser check of all topics and gated review.
- Updated `.github/workflows/free-foundations-watchlist-v1.yml`: syntax, curriculum and browser gates.
- Existing `functions/_lib/free-foundations-v1.js`, `functions/api/bootcamp-academy.js` and all related RPC/RLS/entitlement definitions **unchanged**.
- No changes to five-lesson progress, Founder entitlements, paid plans, real or fictional OHLCV data, assessments, wallet balances, or payments.

## Acceptance criteria and limits

1. All twelve topics have original explanatory and worked examples, corrective feedback, regulator sources and free practice paths.
2. The review remains disabled until the member enters an explanation (minimum 25 characters); local responses do not establish competence, and member data is not transmitted.
3. Desktop/tablet/mobile browser checks render the library without breaking Free Foundations; key navigation works at 390/900/1280/1440 viewports.
4. Exact final `main` revision passes targeted Free Foundation CI, Sitewide Playwright and Cloudflare deployment; audit records final SHA.
5. Real signed-in Free account enrollment, cross-session private reflection continuity, website navigation and access boundaries remain **member-acceptance gates**. A mocked browser fixture does not close them.
6. This is an essential beginner foundation, **not** the 40-chapter Foundations book or a guarantee that all possible investing topics are covered. Advanced technical analysis, trading execution, full book narratives and official competency assessment remain separately scoped.

**Revision history:** v1.0 — 2026-10-28 — live-source audit, foundational knowledge crosswalk, free micro-lessons and CI checks. Exact accepted commit to be added after CI and production verification.

**Footer:** SMFGU-FREE-COMPLETE-001 · v1.0 · Educational only · Main branch.
