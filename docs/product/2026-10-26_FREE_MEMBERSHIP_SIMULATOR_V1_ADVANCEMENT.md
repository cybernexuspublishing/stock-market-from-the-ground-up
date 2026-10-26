# Free Membership Learning Experience + Market Simulator Advancement
**Document ID:** SMFGU-FREE-SIM-V1-20261026  
**Project:** The Stock Market: From the Ground Up  
**Owner / publisher:** Crown & Lantern Press / Cyber Nexus  
**Branch:** `main`  
**Date:** October 26, 2026  
**Version:** 1.0  
**Location:** `docs/product/2026-10-26_FREE_MEMBERSHIP_SIMULATOR_V1_ADVANCEMENT.md` in GitHub (no external Drive copy or ID)  
**Status:** Fictional starter and Free access source IMPLEMENTED; exact-commit browser, production account and journal-persistence acceptance require independent evidence.

## Roles and source-of-truth
Owner delegate; UX/UI and graphic design lead; full-stack engineer; Supabase/RLS and plan-grants architect; Trading and market-data evidence specialist; trading-education instructional designer; accessible interaction engineer; curriculum reviewer; QA lead; consumer-compliance, privacy and entitlement auditor. Required controlling documents: `AGENTS.md`, `README_START_HERE.md`, `PROJECT_SITEWIDE_RULES.md`, `PROJECT_ADVANCED_ENGINEERING_RULES.md`, `PROJECT_INSTRUCTIONS_FOR_CHATGPT.txt`, and `docs/sitewide`.

## Before change: actual observations
1. `platform_plans.FREE` is active at $0 but `public_visible=false` (Owner-configured storefront setting). No Free `plan_tool_access` entries; existing simulator JavaScript therefore withheld its entire CSV panel unless `MARKET_SIMULATOR` was purchased or bundled. This contradicted the established Free CSV saving policy.
2. The Free plan authorizes **15 Journal records** per UTC Monday-Sunday week and **10 simulator-linked Journal records** inside that 15. Live `enforce_free_journal_limits` trigger is enabled; `gu_free_weekly_usage_v014121` exists. Local browser practice itself is not an authenticated paid feature; durable Journal writes still require real member auth and RLS.
3. `market_datasets` has 419 published OHLCV rows, 10,056 replay-bar rows. ALL 419 are explicitly labeled `original_synthetic=true`, first-party FICTIONAL, `historical_evidence_verified=false`. `verifiedHistoricalDataset()` correctly excludes all 419. Thus the current default secure historical route has **no qualifying real source-verified rights-cleared datasets**; a nonfunctional-looking empty selector is expected. Never change this gate merely to make the widget appear busy.
4. Existing browser CSV replay (`simulator.js`) already supports candle chart, next/play, plan/invalidation, simulated manual entry/exit, ambiguous stop-target handling, and Journal integration. It is **ungraded and client-inspectable**, not broker executions or independently blind replay. The correct fix is a Free onboarding path to reuse that engine; do NOT introduce a duplicate simulated brokerage or expose protected grader.
5. Original `simulator.html` opened server mode by default, and the local CSV view required both a manual mode change and a separate file upload. This makes valid Free practice appear to do nothing for a beginner.

## Implemented source scope
- `assets/js/fictional-simulator-starter-v1.js`: deterministic 36 five-minute OHLCV bars, with original 2040 FICTIONAL timestamps and symbol GUSIM. No third-party market feed or claim of historical trading; all future bars are browser-inspectable and forbidden for grading.
- `simulator.html`: above-the-fold first-run **Start Free Practice** CTA, explicit source and limitation disclosure, free/premium mode distinction and secondary upload-from-file choice. Correct defer script order.
- `assets/js/simulator-mode-v014112.js`: `?practice=free` onboarding deep link and event-based switch to existing CSV mode while retaining approved server default and replay-only internal engine.
- `assets/js/simulator.js`: instant starter load and initial five visible bars. Stop/reveal/next uses the existing educational engine. Free members no longer require premium `MARKET_SIMULATOR` tool grants for local CSV; however user must be authenticated as eligible member and the server's `/api/member-tool-access` policy check must succeed. A restricted, Showcase or other ineligible profile must not inherit local Free practice because it lacks a tool pass. Failed authorization endpoint is fail-closed. Connected-provider market data still requires premium tool pass.
- `assets/css/simulator.css`: compact, responsive premium onboarding, visible keyboard focus, sensible layout for 390px through 1440px.
- `tests/test_free_simulator_starter_v1.mjs`, `tests/test_free_simulator_browser.mjs`: deterministic source and browser-based Free access, genuine candle-advance behavior, restricted/guest denial, canonical historical gate untouched.
- `.github/workflows/free-simulator-starter.yml`: no-charge Node and pinned Chromium regression on exact source commits.

## Free learning UX — approved recommendation queue, NOT claimed implemented
### Free dashboard first screen (3 high-value areas)
1. **Continue learning:** a 5–7 day absolute-beginner mini journey with Talia's authored explanations, glossary, example, checkpoint, diagnostic feedback and review. Nine shared-engine stages only when the lesson actually supports them; never claim assessed mastery from ungraded coaching.
2. **Practice now:** one visible **Start Free Practice** CTA to original FICTIONAL candle scenario, a step count, source-label bar, record observation/no-trade decision, then private Journal save within current quota.
3. **Your learning record:** truthful skill categories: Knowledge, Recognition, Decision, Process with `Not Yet Assessed` where independent evidence is missing; recorded learning steps, unlocked personal bookmarks, honest weekly 15/10 allowance with UTC reset label.

Under those cards: beginner glossary, publicly released source-research guide, moderated member community links, contextual help. Do not grant the paid Market Tutor AI service under a misleading label or charge Sparks for core teacher explanations.

### Simulator roadmap on ONE architecture
- **Tier A — Free Fictional Practice (implemented source):** deterministic original candles, client-inspectable ungraded learning, manual CSV, existing Journal quota.
- **Tier B — Server-Controlled Fictional Exercises (design, not implemented):** reuse existing `gu_replay_sessions_v01492` cursor/owned progress semantics with a *separate explicit fictional policy* and narrow entitlement. Always label synthetic; do not weaken `verifiedHistoricalDataset`; no future bar to client; never award unreviewed grades.
- **Tier C — Rights-Verified Historical Replay (existing design, zero released authentic datasets):** publish only after source SHA, timestamps, venue scope, corporate-action handling, licensing, legal display rights and independent editorial review; no future bars or broker fills.
- **Tier D — Advanced Execution Laboratory (future):** simulated order state machine (draft/submitted/pending/partial/cancel-requested/cancelled/filled/rejected), spreads, session boundaries, slippage, liquidity ambiguity, stop/limit constraints, buying power/risk and paper-position ledger, reproducible simulation assumptions, journal evidence. It is NOT a broker connection and must never masquerade as a real market fill.
- **External thinkorswim OnDemand:** link to the authorized Schwab platform and openly distinguish it from our onsite hypothetical teaching practice. Do not advertise an onsite professional brokerage simulator today.

### Visual/interaction requirements
Full-width labeled chart FIRST; compact contextual controls (not a cramped desktop sidebar) and Talia instructor panel AFTER chart; accessible status messages, text alternatives to candles, stepper for Start → Learn → Experiment → Predict → Practice → Assess → Review → Transfer → Results where substantively supported; show source classification always; responsive 390/900/1280/1440; keyboard and screen-reader tests consistent with WCAG 2.2 AA.

### Free-to-paid boundary / offer discipline
- Never reveal private Labs/answer keys, source-rights-restricted bars, protected grader or personal data to the Free client.
- Avoid dark patterns and deceptive trial promises. Help, guided examples and explanations without Sparks remain core teaching functions. Purchased Sparks never expire; included allocations follow established ledger policy; do not change pricing.
- Store still respects the Owner-configured `public_visible=false` for FREE. If the Owner wishes Free to be a public customer acquisition offer, publish the Free card using existing **Owner-audited** plan controls. Do not silently bypass the visibility toggle or modify Founding 30/60 pricing or LIVE Stripe.
- Growth metrics should be concrete and non-financial: % who reach first chart candle, % who explain a valid no-trade choice, first valid reflection save, week-1 return, support failures and inaccessible navigation. Never measure “profitable trade” as educational qualification.

## Acceptance requirements and evidence slots
- Source/static audit: exactly one Free CTA, usable fictional starter, every generated candle OHLC consistent, chronological, deterministic, obviously FICTIONAL.
- Browser: four viewport widths, keyboard Enter/Tab, next-bar change, Free permitted vs Showcase/restricted denied, connected-provider option disabled for Free.
- API security: signed-in Free membership validates server-side account status, no direct premium tool access; unauthenticated and restricted member denied; no client-provided uid trusted.
- Journal quota: genuine separate QA accounts with Free entitlements, 15/10 use, limit 15+1 and 10+1, ISO UTC reset, concurrent saves, null-to-simulator-source updates. Test against disposable authorized data, never overwrite member records.
- Premium replay: authentic datasets still only pass `verifiedHistoricalDataset`; synthetic GUSIM must never qualify. Server forward-only and source-rights regression.
- Operational: GitHub exact-commit checks, Cloudflare matching deployment SHA, Supabase policy and quote counts, no LIVE Stripe activity.
- Content: authored lessons individually editorially reviewed; fictional sample is an ungraded demonstration and alone does NOT establish Beta Ready for 419 Labs.

## Owner sign-off
**Accept as implemented:** Free entry-point and fictional starter source code; intentionally retain existing paid rights boundary.  
**Condition acceptance on:** exact-commit CI, browser behavior, deployed runtime, real Free member authorization and Journal save quota.  
**Carried forward:** the complete free onboarding journey, server-fictional simulation, advanced execution lifecycle, publication-verified historical datasets and genuine beta testing.


## Owner-selected Free Membership V1 controlling experience — 2026-10-26

**Decision status:** Owner-selected design standard. This governs future Free member work but **does not** by itself certify production member acceptance or unlock premium features.

**Owner-selected priorities, in controlling order:**

1. **Personalized beginner journey.** Talia welcomes beginners, obtains an optional, ungraded starting-knowledge choice, uses independently saved Academy progress to recommend a genuine next lesson, and never infers certified mastery from preferences.
2. **Functional Free fictional simulator.** Immediate originally fictional candle practice with deliberate no-trade decisions, accessible revealed OHLCV and optional server-limited private Journal saving; no fabricated broker fills or false historical claims.
3. **Guided zero-knowledge foundation lessons.** Each lesson must include objective, what/why/when not, worked fictional example, guided check, misconception, retry/feedback and independent transfer; use the established Academy engine.
4. **Evidence-backed learning progress.** Knowledge, Recognition, Decision and Process distinguish guided practice from verified assessments; explicitly show `Not Yet Assessed` when qualifying evidence is absent.
5. **Manual research watchlist education.** Member-owned symbols, source classification, researched reasoning and no-trade options; never substitute verified live market prices when none exist.
6. **Weekly learning record.** Real account-scoped latest Journal entries, saved Free Foundations reflections, UTC usage quotas and a next recommended action; show `Unavailable` on provider error rather than invent usage.
7. **Moderated Market Commons onboarding.** Route into existing `START_HERE` and the live community guidelines; teach primary sources, timestamp verification and civil, non-advisory discussion.
8. **Contextual paid feature explanation.** Explain real entitlement differences clearly; never charge Crownlight Sparks for baseline explanations or lock essential free instruction.

**Visual and accessibility acceptance:** A professional, compact trading-terminal layout with the full-width educational chart first, instructor below, simple primary action, secondary actions progressively disclosed, accessible source labels, OHLCV table/text equivalents, keyboard operation, meaningful focus indicator, status announcements, contrast, and responsive QA at 390/900/1280/1440 px. Apply WCAG 2.2 AA as a tested target, not an unverified compliance assertion. Progressive-disclosure background: [Nielsen Norman Group](https://www.nngroup.com/articles/progressive-disclosure/). Normative accessibility criteria: [W3C WCAG 2.2](https://www.w3.org/TR/WCAG22/).

**2026-10-26 implementation reconciliation:** Current `main` already includes `bootcamp-academy.html?program=free5` (five additional ungraded Foundation lessons), `free-watchlist.html` (manual twenty-symbol research), Dashboard starting-level recommendation and four skill-evidence indicators, `simulator.html?practice=free`, private Journal usage, Commons onboarding links, and paid-boundary safeguards. Do not rebuild these as parallel systems. The `tests/test_free_owner_v1_scope.mjs` regression protects these eight intended user capabilities; it proves only source-level parity. 

**Open independent acceptance:** Supabase read-only evidence in this review shows zero `free5` enrollments and zero Free Foundations progress events. Production-signed-in Free-only cross-device enrollment, simulator planning/Journal save, watchlist persistence, account separation and real browser WCAG audit have not been demonstrated. These remain independently gated before `Production Member Tested` or `Beta Ready`. Stripe LIVE payment shutdowns and all fixed Founding 600 terms remain unchanged.

**Revision note:** 2026-10-26 · Owner-selected V1 scope and current-source reconciliation recorded; engineering release acceptance remains governed by `docs/releases/2026-10-26_FREE_MEMBERSHIP_ENTITLEMENT_RELEASE_GATE_v1.md`.
