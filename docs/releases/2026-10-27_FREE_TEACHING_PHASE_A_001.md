# Free Membership Phase A — Teaching Quality Implementation

| Field | Value |
|---|---|
| Project | The Stock Market: From the Ground Up |
| Document ID | SMFGU-FREE-PHASE-A-001 |
| File / type | docs/releases/2026-10-27_FREE_TEACHING_PHASE_A_001.md / Markdown |
| Google Drive location / ID | Not created / none; GitHub main is authoritative |
| Date / Version | October 27, 2026 / v1.4 |
| Owner decision | Phase A teaching improvements approved |
| Status | Teaching source and CI/deployment verified; Founding 600 authentic member journeys assigned for controlled beta; graded B01 assessment approval separate |
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

**Owner-corrected sequencing:** source, CI and Cloudflare deployment evidence are recorded below. Real Turnstile-protected Free-member sign-in, responsive/mobile, keyboard/screen-reader, comprehension, remediation, persistence and cross-session tasks are assigned to Founding 600 testers during controlled beta. These real member journeys are mandatory for **beta exit/final member acceptance**, not an impossible pre-beta human-test prerequisite. The protected B01 grading release is a separate, rubric-specific Owner approval gate.

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


## Verification addendum — Version 1.2, October 27, 2026

**Exact implementation commit:** 69654b969156d4b0a2f678d73d3ca4baae86dc24 (Phase A feedback and B01 review).
**GitHub Actions evidence:** Free Foundations and Research Watchlist Security run 40525577242, successfully completed for that exact SHA. The run passed syntax, authorization and member entitlement contracts; Free Phase A partial-reasoning tests; and real Chromium tests at 390, 900, 1280, and 1440 pixels using simulated Auth/API fixtures.
**Cloudflare evidence:** Yahoo master production Pages project stock-market-from-the-ground-up, successful build and deployment id 1cbcb9c0-4377-4b11-9644-122b52878ea8, corresponding to exact SHA 69654b969156d4b0a2f678d73d3ca4baae86dc24.
**Status:** SOURCE IMPLEMENTED; CI TESTED; CLOUDFARE PRODUCTION DEPLOYMENT PROVEN; GENUINE AUTHENTICATED MEMBER ACCEPTANCE OPEN.
**Boundary:** CI browser sessions use fixture accounts, not real member credentials. The real Academy progress table showed no saved rows in the audited production snapshot. No protected B01 rubric has been promoted from Draft. No LIVE payment test, customer checkout, or billing change occurred.

**Revision history:** v1.2 — accepted exact-head Free Foundations CI and Cloudflare deployment evidence; genuine member and independent protected editorial signoff remain outstanding.


## v1.3 — B01 protected editorial correction status (October 27, 2026)

Free Phase A formative teaching remains local, ungraded and verified by the existing source/fixture QA. B01 protected editorial proof is not equivalent to a Free-member Auth browser session. The previously noted B01 clock-boundary ambiguity has been corrected in the original *private Draft v97* question with explicit finalized-and-delivered candle evidence and a guarded backup. Three existing critical decision-process flags have been individually re-reviewed, with no extra flags or partial percentages inferred. The documented 40+60 editorial checks cover 100 B01 choices; all formal reviewed rubric approvals and member assessment acceptance remain open. See `docs/releases/2026-10-27_B01_REMAINING60_AND_EIGHT_FULL_RUBRICS.md` v1.1. Google Drive copy and ID not created.


## v1.4 — Controlling Owner assignment: Founding 600 conducts real member acceptance

On October 27, 2026 the Owner assigned authentic Free-member and sitewide journeys to the **Founding 600 beta testing cohort**, rather than to Owner-run impersonated sessions or automation masquerading as a member.

**Entry into controlled beta** requires technically secure and correctly authorized functionality available to eligible testers, including Turnstile/Auth, entitlement isolation, safe private persistence, no access to Draft protected grading, CI and deployment verification and defect reporting. It does **not** require already-completed human beta participant sessions.

**During beta** Founding 600 testers using real eligible accounts verify onboarding, Talia teaching and guided feedback, fictional candles and no-trade decisions, Journal and watchlist usage and quota handling, accessibility and mobile behavior, save, sign-out, genuine subsequent sign-in, cross-session recovery, and member data isolation. Capture concise privacy-safe evidence, fixes and retests. A zero-progress snapshot before beta is a baseline, not evidence of failure or successful acceptance.

**Protected rubrics** remain Draft and blocked from official assessment grading unless each exact version is reviewed and authorized by a genuinely signed-in Owner through the existing guarded private approval interface. While grading is blocked, approved ungraded Guided/Practice experience can be tested. No fictitious mastery or score may be granted.

**Exit from beta** requires real participant evidence and issue resolution; neither test-fixture CI nor a beta program invitation substitutes for it.

Disposition: Teaching engineering IMPLEMENTED/TESTED; genuine human member journey ASSIGNED TO F600 BETA AND NOT YET ACCEPTED; B01 formal publication OWNER APPROVAL OPEN. No Stripe, account, quota, or access policy change. This section supersedes earlier generic pre-beta human-journey phrasing.

Revision history: v1.4 — Owner transferred member-journey execution to Founding 600 and clarified the distinct beta entry and exit gates.
