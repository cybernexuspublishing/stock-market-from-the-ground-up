# Gate 0 — Grading integrity, B01 readiness and Founding 600 pre-beta continuation
**Project:** The Stock Market: From the Ground Up / Cyber Nexus / Crown & Lantern Press
**Date:** 2026-10-26 · **Branch:** `main`
**Document ID:** GU-GRADE-G0-B01-20261026-V1
**Document version:** 1.0
**Filename/type/location:** `docs/releases/2026-10-26_GRADING_INTEGRITY_GATE0_B01.md` (Markdown, GitHub authoritative)
**Google Drive ID/location:** Not assigned; no file created there.
**Status:** Grading source and guarded DB migration IMPLEMENTED; verified DB guards PROVEN; authenticated member/Lab acceptance NOT YET PROVEN.
**Purpose:** Establish a defensible grading baseline without renaming Labs, approving unpublished answer sets or pretending Founding members have completed testing.
**Dependencies:** Existing shared Engine v3.2 design / v3.3 modes, canonical 419 Labs, 30 original competencies, v97 B01 private authored content, `v014_training_answer` and v105 reviewed Knowledge RPCs, authenticated Supabase, Cloudflare Pages Functions, existing member entitlement engine.

## 1. Roles applied
Owner/technical acceptance representative; assessment and curriculum architect; instructional designer; stock-market structure and execution-risk educator; frontend/API engineer; database/SQL migration engineer; security/RLS/privacy reviewer; accessibility and QA engineer; SRE/release manager; project and consumer-compliance reviewer.

## 2. Assumptions, source authority and conflicts
- Latest accessible website implementation is connected GitHub `cybernexuspublishing/stock-market-from-the-ground-up` `main`. Four uploaded ZIPs are StocksToTrade *research* archives, not the website repository. The Owner-designated archive `StocksToTrade-Browser-Research (6).zip` contains research on order instructions, execution costs and data rights. It **does not** confer a market data redistribution license or replace direct verification of primary sources.
- `README_START_HERE.md` describes an older v0.14.0.40 overlay; use the actual GitHub commit as source, not this obsolete review-candidate baseline. The prompt's asserted deployed SHA `d90bcdd...` was not independently corroborated as the current Yahoo master deployment.
- The Owner reports account sign-in and Turnstile are currently working. Do not reopen a claimed historical captcha defect without real current evidence.
- No LIVE Stripe keys, charges, refunds, new products or feature activations were used.

## 3. Critical findings and decisions
| ID | Severity | Proven source problem | Resolution / tradeoff |
|---|---|---|---|
| GR-01 | HIGH | Grader RPC stored correct keys in final reports and old member API forwarded the report directly; UI displayed the protected answer | Allowlist a member feedback DTO for completed and resumed attempts; keep full private audit inside service-only Supabase; preserve diagnostics without returning the correct key |
| GR-02 | HIGH | Competency status could report Proficient after a latest complete critical-error assessment if historical mean was high | Latest complete assessment must itself pass without critical error; recovery requires a newer complete assessment |
| GR-03 | HIGH | Binary numeric scoring did not support partial credit or independently flagged critical decision errors | Add optional reviewed metadata, server-defined fractional scoring, verified critical flags and Knowledge evidence block; legacy rubrics retain unchanged full/zero scoring |
| GR-04 | MEDIUM | Owner rubric choice options allowed duplicate case/whitespace distractors and awkward untrimmed keys | Reject ambiguous choice sets and strictly type-check optional grading metadata before Owner review |
| GR-05 | HIGH | Shared route-policy omitted five founder-only HTML routes from its protected/uncacheable classification | Add all five existing founder routes centrally; no new login or entitlement system |
| GR-06 | RELEASE BLOCKER | 419 active Labs and 20 B01 v97 source drafts are NOT independently reviewed, authenticated or member-tested | Do not bulk promote; each Lab requires exact Owner-editor approval, verified mathematics, error feedback, cross-account access and browser tests |

**Alternative rejected:** A second grading service or external paid AI grader would duplicate ledger/entitlement architecture, add privacy and cost risks, and would not independently validate historical data. The existing protected PL/pgSQL grader remains authoritative.

## 4. Deliverables (actual source paths)
- `functions/api/interactive-training.js`: member-only report allowlist, no answer-key fields, partial/critical feedback, Knowledge sync status.
- `assets/js/interactive-training.js`: key-safe instructional feedback, partial-credit and risk-error notices, correction-oriented result text.
- `functions/api/competencies.js`: latest-complete critical-error proficiency gate.
- `functions/api/training-editor.js`: Owner rubric duplicate-choice, unambiguous key and optional partial/critical metadata validation.
- `assets/js/route-policy.js`: private founder page classification shared by HTML middleware and service worker.
- `supabase/migrations/20261026_grading_partial_credit_critical_errors.sql`: guarded `CREATE OR REPLACE` of three service-only RPCs; transactional, no schema/table or member-row changes.
- `supabase/rollbacks/20261026_grading_partial_credit_critical_errors_ROLLBACK.sql`: exact pre-upgrade function definitions; refuses rollback when reviewed rubrics/completed attempt reconciliation would be required.
- `supabase/admin/20261026_grading_partial_credit_postflight_READ_ONLY.sql`: repeatable evidence query, no private answer keys returned.
- `tests/v014_api_contracts.mjs`, `tests/test_v014099_curriculum_contract.mjs`, `tests/test_v014117_lab_topic_gate.mjs`, `tests/test_grading_partial_credit_critical_guard.mjs`, `tests/test_founder_private_route_policy.mjs`, and existing workflow definitions: key boundary, owner review, policy, score-risk and route regression cases.

## 5. Verified evidence and limitations
**PROVEN on shared production Supabase:** 419 active Labs; 439 draft rubric versions; 0 reviewed rubrics; 0 saved member training attempts; 0 approved Knowledge mapping; 0 competency evidence rows. Exactly 20 B01 v97 private drafts were individually checked by ID for six distinct questions and six corresponding private answer-key entries; each passed its **structural** check, none was promoted.

**PROVEN database configuration:** forward guarded SQL migration applied successfully. Independent postflight of three functions confirms service-role EXECUTE=true, anon/member EXECUTE=false; core scorer remains SECURITY DEFINER; both Knowledge RPCs remain SECURITY INVOKER; the single Knowledge mapper rejects unresolved critical errors, preserving the Assessment-mode restriction.

**TESTED against read-only SQL fixture data:** five numeric-scoring cases passed: exact tolerance, partial tolerance, inclusive boundary, outside tolerance, unchanged legacy binary behavior. This validates the arithmetic model separately from full member RPC exercise.

**TESTED source in execution sandbox:** JS syntax checks and five isolated member-report/proficiency semantics cases passed. GitHub Actions jobs require a completed exact-source run; queued or cancelled jobs are NOT acceptance evidence. Real authenticated reviewed-Lab grading remains UNTESTED because no rubric is reviewed and no actual attempts are recorded. Cloudflare master deployment cannot be stamped PROVEN without a successful provider/public-runtime evidence chain.

**Do not mistake** a valid question/key count or migration installation for individually verified math, teaching, grading correctness, cross-session save/resume, WCAG or member readiness.

## 6. Editorial basis and technical references
- Owner-approved StocksToTrade research archive (6), `RESEARCH_001_300_BATCH_XI_ORDER_INSTRUCTIONS.md`, `BATCH_XII_EXECUTION_COSTS.md`, `BATCH_XIV_DATA_IDENTITY_RIGHTS.md`; reuse concepts and owner decisions, not copyrighted third-party course text or unlicensed market feeds.
- SEC Investor.gov [Understanding Order Types](https://www.investor.gov/introduction-investing/general-resources/news-alerts/alerts-bulletins/investor-bulletins-14): a stop trigger does not guarantee a fill price; use this distinction in risk-critical error rubrics.
- SEC Investor.gov [Stop, Stop-Limit, and Trailing Stop Orders](https://www.investor.gov/introduction-investing/general-resources/news-alerts/alerts-bulletins/investor-bulletins-15), updated August 2026: slippage and execution caveats.
- [W3C WCAG 2.2](https://www.w3.org/TR/WCAG22/) and [Error Identification](https://www.w3.org/WAI/WCAG22/Understanding/error-identification): textual errors, labels and accessible response feedback.
- Original source research is an editorial aid; specific B01 answers and market-history claims must still receive individual evidence-based approval. No trading profitability promises or broker-confirmed execution claims.

## 7. Release sequence and owner acceptance
**Gate 0 source protection:** IMPLEMENTED. Database setup and role grants: PROVEN. Source test runner/production/browser: awaiting exact-head successful evidence. **Gate 0 Owner sign-off: needs rework/remaining acceptance; do not certify sitewide readiness.**

**Gate 1:** Truth5 five-day and the existing twenty B01 Lab private drafts remain Authored, NOT Editorially Reviewed / Assessment Verified / Technical QA Passed / Production Member Tested / Beta Ready. Use authenticated Owner `training-editor` for *20 separate* rubric reviews; check each actual calculation, all distractors, a borderline/partial/invalid answer, limitation, historical-source labeling and risk/no-trade alternative. After review, test authorized Book I/II/Free/Showcase isolation, concurrent submissions, resume across devices, 390/900/1280/1440 layouts, keyboard and assistive tech, and real Yahoo master Functions.

**Dependent future gates:** Boot Camps 2–7 and B02–B17 preserve the Owner-defined 336-Lab target. Do not claim any complete until each individual evidence record passes the seven-stage content progression and Founding 600 member acceptance when recruited. No duplicate 31st competency.

**LIVE payment:** expressly outside scope and locked. Stripe TEST may be audited separately; no financial writes occurred in this grading batch.

## 8. Owner release decision and remaining blockers
- Grading integrity source changes: **ACCEPTED AS IMPLEMENTED**, not accepted as production member-complete.
- Applied additive grading logic: **ACCEPTED AS PROVEN DATABASE CONFIGURATION**, not accepted as member-scored acceptance.
- B01 technical shape: **TESTED/PASS structural inspection**, NOT editor-approved content.
- Production deploy, authenticated member journey, full QA/permissions and all six remaining Boot Camps: **BLOCKED or NOT YET TESTED**.
- Rollback: `git revert` of exact source commit(s) followed by re-deploy; DB rollback script only while guard permits and with required evidence, otherwise escalate for transaction-preserving reconciliation.

**Release sign-off:** NO-GO for the consolidated website Beta Ready decision. No attempted human signup, transaction, or private member impersonation is claimed.

## Revision history
| Version | Date | Change |
| --- | --- | --- |
| 1.0 | 2026-10-26 | Shared grading protection, partial credit, critical errors, founder route hardening and B01 structural audit. |

**Footer:** Crown & Lantern Press / Cyber Nexus. Internal evidence-led release record. Educational only; not investment advice or professional certification.
