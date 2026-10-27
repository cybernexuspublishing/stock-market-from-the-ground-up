# Free Membership Phase A — Teaching Quality Implementation

| Field | Value |
|---|---|
| Project | The Stock Market: From the Ground Up |
| Document ID | SMFGU-FREE-PHASE-A-001 |
| File / type | docs/releases/2026-10-27_FREE_TEACHING_PHASE_A_001.md / Markdown |
| Google Drive location / ID | Not created / none; GitHub main is authoritative |
| Date / Version | October 27, 2026 / v1.0 |
| Owner decision | Phase A teaching improvements approved |
| Status | Source implemented; exact-head CI, deployed browser and editorial acceptance open |
| Dependencies | Existing five-day Free Foundations, Academy API, authenticated private reflection, shared v3.x teaching engine |
| Purpose | Improve learning depth, alternative explanations and remediation without weakening entitlement or grading boundaries |

## Phase A source implementation

- All five **existing** Free Foundations lessons now include four explained terms and four guided worked steps.
- Each lesson has at least two distinct misconception remediation choices. Each identifies the false assumption, explains why it is false, teaches the concept another way, provides a new original FICTIONAL case and offers a worked review in an optional disclosure.
- Supplemental material is integrated into the existing public Academy curriculum and displayed through the existing Free workspace, not a duplicate engine.
- Existing private reflections, Free access decisions, journal/weekly limits and protected assessment ledgers are unchanged. The public worked reviews do not contain private keys and never award grades, mastery or fictitious trade results.
- Accessible native details/summary, keyboard focus and mobile layouts are included.

## Verification and outstanding Phase A acceptance

New contract test: tests/test_free_phase_a_teaching_v1.mjs. Existing Free Foundations GitHub Actions workflow now runs the additional test and module syntax check alongside the original Auth, entitlement and browser contracts.

**Still required:** completed exact-head CI; confirmed Cloudflare production deployment; actual authenticated Free-member responsive, keyboard and screen-reader journeys; independent editorial review of new wording; learner comprehension testing. Only then can the end-to-end Phase A release be accepted.

Existing protected Lab/B01 question sets remain Draft/Not Assessment Verified. Further rubric-by-rubric review and protected learning-remediation acceptance are separate Phase A tasks and must not be bypassed.

## Rollback / revision

Revert the scoped source commit after checking for subsequent dependent changes. No data deletion or SQL rollback is needed because this adds no tables or member writes.

v1.0 — 2026-10-27: supplemental lesson depth, misconception pathways, interface, QA and release control.


## Version 1.1 — Additional Free formative coaching and protected audit (October 27, 2026)

A conservative on-device wording aid now offers Free learners focused follow-up questions for each of the five existing lessons. Recognized terms are not evidence of comprehension. Undetected concepts may be paraphrased. A small set of potentially misleading phrases triggers careful, non-graded clarification rather than a claim of error. It does not score, certify, transmit free-text answers, use a private rubric, or change member progress.

Current live Supabase B01 draft v97 audit: 20 Labs, 120 questions, 100 choices and 20 numeric items; zero reviewed items, three criticalOnWrong=true choice items and zero configured partial-credit policies. Unlike an earlier same-day report recording zero critical flags, the current database explicitly flags F1-C02-L01 / question 5, F1-C02-L02 / question 5, and F1-C12-L01 / question 5. The intervening authorship/provenance is not yet verified. The first two assess blind decision chronology and independent information boundaries; the third addresses NO TRADE in the presence of execution-risk and incomplete chart evidence. These were inspected against their private answer and explanation internally, with no keys or prompts published. The first question's exact 09:45 boundary needs an explicit check that the completed candle was actually final and delivered by the pause; a clock label alone is insufficient. All three remain draft and require independent policy signoff; 97 other choice keys remain individually unapproved.

The Free/Truth5 production Academy progress table presently has no rows. Thus no genuine signed-in member journey has been evidenced by those records. Chromium fixture tests, even with full lesson interaction and reload, must not be described as genuine member sessions.

Acceptance still open: exact-head CI, production deployment, signed-in real-member responsive and assistive-technology checks, and individually approved critical/partial policy. No Supabase DML, membership changes, private keys, Stripe, or live transactions were performed.

Change history: v1.1 — extended formative feedback, conservative text cues, live risk-policy reconciliation, CI/browser regression.
