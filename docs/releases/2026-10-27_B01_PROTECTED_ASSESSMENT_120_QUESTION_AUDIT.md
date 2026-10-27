# Lab Batch B01 — Protected Assessment and Guided Remediation Audit

| Field | Value |
|---|---|
| Project | The Stock Market: From the Ground Up |
| Document ID | SMFGU-B01-120-QUESTION-AUDIT-20261027 |
| Date / version | October 27, 2026 / v1.0 |
| Repository / branch | `cybernexuspublishing/stock-market-from-the-ground-up` / `main` |
| Google Drive | No Drive file or document ID created |
| Status | Source IMPLEMENTED; isolated real-PostgreSQL TESTED; production SQL permission/installation PROVEN; editorial and human member acceptance OPEN |
| Scope | Existing 20 canonical B01 Labs, 120 v97 draft questions and existing protected training grade ledger only |

## Roles and control

Acting Owner technical representative; curriculum and independent assessment reviewer; stock-market teaching specialist; protected grading/PLpgSQL engineer; Supabase RLS engineer; Cloudflare member API engineer; accessible UX engineer; source/privacy auditor; QA/CI engineer. This work does **not** create a second grading engine, duplicate Labs, impersonate beta participants, change LIVE Stripe, activate purchases, approve historical market data, create credit/mastery, or relabel draft rubrics.

Source: the exact production Supabase `oxihglyfgzywsupnyicb` draft v97 question sets, existing twenty B01 author-created lessons, frozen owner rules, and existing v3.3 learning stages. The StocksToTrade research archives are reference material, not automatically redistributable market data or independent proof of source licensing.

## Findings, severity and corrections

**HIGH — invalid answers consume protected attempts:** The production `public.v014_training_answer` previously classified any non-empty multiple-choice string as a wrong response, including a value that was never listed in the reviewed choice set. A stale or tampered browser could consume a one-time graded step for a malformed choice. The original scorer now requires a selected option present in the **pinned reviewed question's** private `options`, casefolding and trimming valid submissions. For an unlisted value it raises SQLSTATE `22023` **before updating the attempt**. Unknown question kinds also fail rather than defaulting to multiple-choice comparison. Version CAS and entitlement checks remain unchanged.

**MEDIUM — misleading learner error:** Known numeric/choice validation exceptions previously appeared as generic 503 backend errors; recognized invalid responses now return HTTP 422 with a safe validation message, while a changed step or withdrawn review produces HTTP 409. No raw SQL details, answer keys, or private grading rows are included.

**MEDIUM — remediation disconnected from decision:** The existing reviewed Guided response now adds a correction instruction based on its authenticated feedback, distinguishing a locked graded response from further fictional, ungraded Talia practice. If another device submitted the next step, the learner can use a functioning `Refresh my saved assessment step` control to fetch the existing protected `resume` endpoint without another grade write.

**EDITORIAL — no partial or critical policy in B01:** Twenty numeric questions have no `partialTolerance` or `partialCreditPct` metadata. Nineteen use exact-only tolerance 0; one permits 0.02 rounding tolerance. Zero B01 questions explicitly mark a wrong choice as `criticalOnWrong`. Do not manufacture partial-credit or critical-error policy by inference from titles, and do not promote these draft versions without independently documented per-question risk review.

## Independent per-question evidence — exactly 120 records

`supabase/reviews/2026-10-27_B01_120_FIVE_SCENARIO_AUDIT_READ_ONLY.sql` runs on production without data changes and returns **no answer keys, options, prompts, user IDs, or user responses**. The companion `docs/qa/2026-10-27_B01_120_QUESTION_SCENARIO_REGISTER.csv` contains one record per v97 question: Lab ID, question ID, kind, correct/wrong shapes, boundary policy, zero unauthorized partial credit, invalid-option/number shape, corrective explanation presence, and outstanding editorial status.

A read-only source audit verified **120/120 question structures**: 100 choices have a uniquely matched key plus legitimate wrong distractor, and all 20 numerics meet the accepted decimal/tolerance format. All have substantive remediation explanations. Separately, the assessment reviewer independently recalculated the numeric results from the twenty actual B01 hypothetical prompts (time intervals, secondary trade value, candle bodies, market caps, quoted spreads, position gain/loss magnitude, trading-session duration, volume ratio, and after-hours percent change) and compared those privately inside Supabase: **20/20 match within the question's existing tolerance**. Those calculations were *not* copied into GitHub or disclosed as keyed answers.

**Key distinction:** Mechanical validity and numeric arithmetic alone do not independently prove the pedagogical correctness of all 100 choices, the explanation's limitations, source license, independent transfer, or actual reviewed grading for each exact rubric version. Accordingly **all 20 remain Draft**, and **all 120 remain Not Assessment Verified**. This is not blanket approval.

## Executed real grading and API tests

`supabase/migrations/20261027_b01_reject_unlisted_answers.sql` is an additive `CREATE OR REPLACE` of the existing grader, with preflight and service-role-only postflight. Original function source is retained in `supabase/rollbacks/20261027_b01_reject_unlisted_answers_ROLLBACK.sql`. The rollback refuses to downgrade after any reviewed rubric or real attempts require reconciliation.

`tests/fixtures/b01_protected_grade_schema.sql` and `tests/fixtures/b01_protected_grade_scenarios.sql` execute the **actual guarded scorer** in disposable PostgreSQL 16, with invented question options and prices, not real private B01 keys. Tests include:
- exact correct and legitimate incorrect answers;
- partial tolerance and its inclusive boundary, full credit boundary and outside-zero-credit;
- empty/malformed numbers, unknown options, stale submissions, idempotence, completed attempts;
- critical-error flags on synthetic risk decisions, reviewed-set withdrawal, unrelated-member rejection;
- anonymous/authenticated inability to directly EXECUTE the protected grader.

`tests/test_b01_invalid_choice_and_remediation.mjs` runs the real Cloudflare handler with synthetic provider responses and confirms safe 422/409/503 mapping; existing `tests/test_b01_review_withdrawal_and_private_grading.mjs` checks **all 20 canonical B01 identifiers** for draft unavailability, withdrawn pinned grade versions, and omission of private question/answer content.

**Completed initial successful CI:** [GitHub Actions #40468980213](https://github.com/cybernexuspublishing/stock-market-from-the-ground-up/actions/runs/40468980213), both real PostgreSQL and API regression jobs passed. Later small 422 numeric-input regression must be read from its own exact-head CI outcome; a queued run is not counted as passed.

**Production provider postflight:** The guarded function source includes the option-membership validation; fractional scoring and CAS remain; `anon=false`, `authenticated=false`, `service_role=true` for direct EXECUTE; 439 total draft sets, 419 canonical Labs, zero reviewed sets and zero recorded attempts (at the moment checked). No member data or rubric was modified by the migration. Exact Cloudflare Pages `main` deployment should be checked separately.

## Owner technical decision

- **ACCEPTED at TESTED/PROVEN scope:** Invalid-option protection, safe input errors, existing Talia guided correction, recovery of pinned saved step, reproducible 120-question structural audit, 20 numeric independently recalculated source cases.
- **EDITORIAL REVIEW REQUIRED:** Individually verify all 100 keyed text choices and each question's rationale against approved teaching, determine which wrong risk decisions should be critical, configure any *explicitly justified* per-question partial-credit policy, verify the two non-generic transfer applications per Lab, and test protected scorer with B01-specific authored data without publishing answers.
- **MEMBER VERIFICATION REQUIRED:** Genuine signed-in beta account, member tool/book entitlement, 390/900/1280/1440 layout checks, cross-session saved attempt, wrong-response remediation, cancel/expiry case and no answer-key leakage during the browser journey.
- **DO NOT CLAIM:** 20 Beta Ready Labs, any Assessment Verified set, production user grading, market-history accuracy, trading certification, confirmed order fills or paid-tool purchase-to-entitlement.

The owner-approved beta learning experience remains accessible through existing eligible Guided/Practice study while protected unreviewed grading stays disabled. Exactly 83 currently Upcoming Labs retain their existing non-Start state. No LIVE Stripe action occurred.

## Rollback / version history

Preflight production verified no reviewed sets or attempts before the grader migration. Rollback is guarded by existing `lab_training_sets_v014.review_state` and `lab_training_attempts_v014` counts; if activity later exists, reconcile actual submissions and keys before any downgrade. Revert the exact browser/API source commits and inspect Cloudflare deployment separately. No destructive member-data migration, overwritten canonicals or grading ledger reset.

**v1.0** October 27, 2026 — 120-question safe scenario registry, independent 20-numeric calculation checks, strict server option validation, protected SQL lifecycle regression, actionable member remediation and version-pinned resume.
