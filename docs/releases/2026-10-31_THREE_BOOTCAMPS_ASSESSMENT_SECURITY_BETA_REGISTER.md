# Three New Boot Camps — Protected Assessment and Beta Acceptance Register

**Document ID:** SMFGU-ACADEMY-THREE-001
**Project:** The Stock Market: From the Ground Up — Boot Camp Academy
**Version:** 1.0
**Created:** October 31, 2026
**Last reviewed:** October 31, 2026
**File type:** Markdown (.md)
**Filename:** 2026-10-31_THREE_BOOTCAMPS_ASSESSMENT_SECURITY_BETA_REGISTER.md
**Repository location:** `docs/releases/` on GitHub `main`
**Google Drive location:** Not created; repository is current source of record
**Google Drive document ID:** Not assigned
**Status:** Implemented source and private assessment drafts; editorial and authenticated acceptance BLOCKED
**Purpose:** Reconcile every new Academy day, protected case, access boundary and release evidence without inventing successful assessments.
**Dependencies:** `AGENTS.md`; `functions/_lib/academy-three-camps-v1.js`; `functions/_lib/bootcamp-academy-v014168.js`; `functions/api/bootcamp-academy.js`; `functions/api/academy-protected-assessment-v1.js`; `functions/api/assessment-v0135.js`; `public.competency_cases_v135`; `public.gu_academy_protected_cases_v1`; `ACADEMY_THREE_CAMPS_ENABLED`; existing single grading RPC.

## Owner-approved controls

- Direct work on `main` only; do not branch or overwrite unrelated work.
- Preserve original seven programs, Free Foundations, 419 Labs, 30 competencies, private member records and existing course access.
- Do not activate `ACADEMY_THREE_CAMPS_ENABLED` until complete editorial, assessment, billing-access, actual member and deployment acceptance.
- Prohibit paid test charges, unlicensed market data, third-party course-text copying and fabricated historical outcomes.
- Unreviewed instructional explanations do not award mastery. The 10-stage Academy journey remains formative; separate official assessments use the existing server-owned competency RPC.

## Current source and database findings

- Three course definitions: `tape10` (10), `indicators10` (10), `filings7` (7); 27 days total; existing seven still account for 247.
- The feature flag defaults disabled; public Academy catalog continues to expose seven programs when disabled.
- Supabase progress program-code migration already applied; original private progress table retained.
- Protected case routing migration applied to `public.gu_academy_protected_cases_v1`, with RLS enabled, no SELECT to `anon` or `authenticated`, service-role access only.
- As checked October 31, **54 provisional protected cases** exist, exactly two mapped per new study day. Each has four scored dimensions: knowledge, recognition, decision and process.
- **Zero cases are active or independently reviewed.** Initial generated candidates require individual technical, editorial and quantitative assessment review; many distractors need expert refinement for plausible difficulty and true unseen transfer.
- 27 version-two retake prompts have been differentiated from the first version. Distinct case codes plus immutable first grades ensure a prior scored case cannot be used for reassessment.
- Server route enforces course flag, active entitled account, specific enrollment, approved case routing, actual reviewer fields and first-submission history. Existing general competency endpoint now excludes all `BC3_` course cases and denies direct submission outside the Academy route.
- Talia stage-specific evidence uses fictional tapes, quote/depth facts, indicator ECharts and SEC-source evidence. It does not assert live/historical market replay.
- Source and browser acceptance are separate from actual beta-member acceptance.

## Per-day acceptance register

| Program | Day | Subject | Private assessment inventory | Actual acceptance |
|---|---:|---|---|---|
| tape10 | 1 | Introduction to Market Microstructure | 2 staged cases | Editorial + authentic QA blocked |
| tape10 | 2 | Bid, Ask, Spread, and Quote Interpretation | 2 staged cases | Editorial + authentic QA blocked |
| tape10 | 3 | Level II Order Book Fundamentals | 2 staged cases | Editorial + authentic QA blocked |
| tape10 | 4 | Time & Sales and Executed Transactions | 2 staged cases | Editorial + authentic QA blocked |
| tape10 | 5 | Liquidity, Depth, and Order Execution | 2 staged cases | Editorial + authentic QA blocked |
| tape10 | 6 | NBBO, Market Centers, ECNs, and ATSs | 2 staged cases | Editorial + authentic QA blocked |
| tape10 | 7 | Order Flow, Imbalances, and Interpretation Limits | 2 staged cases | Editorial + authentic QA blocked |
| tape10 | 8 | Trading Halts, Volatility, and Execution Risk | 2 staged cases | Editorial + authentic QA blocked |
| tape10 | 9 | Integrated Level II and Time & Sales Practice | 2 staged cases | Editorial + authentic QA blocked |
| tape10 | 10 | Independent Market Microstructure Practicum | 2 staged cases | Editorial + authentic QA blocked |
| indicators10 | 1 | Understanding Indicators and Their Inputs | 2 staged cases | Editorial + authentic QA blocked |
| indicators10 | 2 | Price, Volume, and Mathematical Foundations | 2 staged cases | Editorial + authentic QA blocked |
| indicators10 | 3 | VWAP Calculation From First Principles | 2 staged cases | Editorial + authentic QA blocked |
| indicators10 | 4 | Session VWAP Interpretation and Limitations | 2 staged cases | Editorial + authentic QA blocked |
| indicators10 | 5 | Simple Moving Averages Versus Exponential Moving Averages | 2 staged cases | Editorial + authentic QA blocked |
| indicators10 | 6 | EMA 9 and EMA 20 Calculations | 2 staged cases | Editorial + authentic QA blocked |
| indicators10 | 7 | Indicator Relationships and Market Structure | 2 staged cases | Editorial + authentic QA blocked |
| indicators10 | 8 | VWAP Reclaims, Rejections, and Failures | 2 staged cases | Editorial + authentic QA blocked |
| indicators10 | 9 | Conflicting Indicators and False Signals | 2 staged cases | Editorial + authentic QA blocked |
| indicators10 | 10 | Independent Indicator Analysis Practicum | 2 staged cases | Editorial + authentic QA blocked |
| filings7 | 1 | Understanding SEC Filings and Primary Sources | 2 staged cases | Editorial + authentic QA blocked |
| filings7 | 2 | Reading Corporate Announcements and Form 8-K | 2 staged cases | Editorial + authentic QA blocked |
| filings7 | 3 | Earnings Reports and Financial Disclosures | 2 staged cases | Editorial + authentic QA blocked |
| filings7 | 4 | Share Offerings, Dilution, and Capital Structure | 2 staged cases | Editorial + authentic QA blocked |
| filings7 | 5 | Stock Splits, Reverse Splits, and Corporate Actions | 2 staged cases | Editorial + authentic QA blocked |
| filings7 | 6 | Catalysts, Market Expectations, and Verification | 2 staged cases | Editorial + authentic QA blocked |
| filings7 | 7 | Independent Corporate Disclosure Research Practicum | 2 staged cases | Editorial + authentic QA blocked |

## Release gates — do not bypass

1. **Editorial:** independently verify each of 54 case scenarios, correct answers, distractors, numeric units, primary references, evidence cutoff and separate retake originality; reject generic or memorized-answer cases. Record reviewer identity/date. Check complete 27 lesson bodies for zero-knowledge sequencing, correction and accessible experience.
2. **Database:** ensure mapping `source_status='approved'` only AFTER case review, then record `competency_cases_v135.reviewed_by`, `reviewed_at` and `active=true` transactionally for the approved cases. Never assign reviewer evidence without an actual reviewer.
3. **Authorization:** genuine authenticated enrolled member positive route and entitled denial; genuine cross-member isolation, role restrictions, immutable first grade, non-reusable case and fresh alternative. Preserve server-only keys and all existing grades.
4. **Browser:** validate each program first/middle/last day at mobile, tablet and desktop, ECharts/subject evidence, Talia prompts, accessibility (keyboard, screen-reader, contrast, hidden state), progress save/resume and cross-account state clearing.
5. **Deployment:** verify exact SHA GitHub Actions and Cloudflare Pages production deployment, public catalog seven until activated, no new payments or plan entitlements.
6. **Business release:** after independent acceptance, obtain deliberate Owner activation of the three-course flag and corresponding course visibility/entitlement policy. Do not infer authorization from working source.

## Deployment and test evidence

The companion CI gate is `.github/workflows/bootcamp-full-width-acceptance-v1.yml`. It executes source contract, simulated authenticated assessment lifecycle, seven-program regression, responsive Chromium and original 30-day program tests. Record final workflow IDs, conclusions and Cloudflare SHA in a later evidence-only revision. A test that is queued, cancelled or not run cannot be recorded as passed.

## Unresolved acceptance blockers

- No independently signed-off private question/answer pair among 54 staged candidates.
- The case authoring method includes program-related guidance but requires meaningful alternative distractors and non-memorization checks for every new day.
- No genuine enrolled QA member positive assessment attempt; no approved cases exist for such a test.
- Need full authenticated 27-day browser/accessibility evidence and commercial rights checks for any future real market feed.
- The separate Windows Codex attachment path is not available from this repository connector; owner-provided execution requirements and in-repository rules were used.

## Revision history

| Version | Date | Author | Change |
|---|---|---|---|
| 1.0 | October 31, 2026 | Project engineering | Established 27-day private assessment inventory and acceptance register without declaring editorial or member beta approval. |

**Status classification:** All three courses: IMPLEMENTED — TESTING PENDING; **not Beta Accepted and not Production Release Approved**.
