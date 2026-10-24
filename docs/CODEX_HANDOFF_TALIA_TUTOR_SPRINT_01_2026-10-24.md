# Codex Handoff — Talia Mercer AI Tutor, Sprint 01

## Document control
- **Project:** The Stock Market: From the Ground Up
- **Date:** 2026-10-24
- **Version:** 1.0
- **Status:** Ready for Codex implementation; not implemented or production-accepted
- **Repository:** `cybernexuspublishing/stock-market-from-the-ground-up`
- **Baseline:** `main` (inspect current HEAD before editing)
- **Timebox:** One focused 15-minute Codex development session
- **Scope:** Reusable Talia Mercer Tutor foundation for the 419 learning Labs and approved Boot Camps
- **Out of scope:** Stripe changes, live payments, pricing, unrelated redesign work
- **Dependencies:** Existing Lab engine, Tutor endpoint, authentication, entitlements, progress/assessment state; verify rather than assume readiness

## Codex — copy-ready task

Work in the existing `cybernexuspublishing/stock-market-from-the-ground-up` repository, starting by inspecting the current `main` branch. This is a focused 15-minute implementation sprint. The objective is **one tested reusable Talia Mercer Tutor integration**, demonstrated in one existing Lab, not a superficial change applied to hundreds of lessons.

1. Locate and inspect the current Talia Mercer frontend, Tutor API/backend, Lab learning-stage state, authentication, entitlement checks, and tests. Identify the relevant files and any already implemented functionality before modifying code.
2. Make Talia persistently accessible throughout the instructional journey without obscuring chart and practice controls. Improve the conversation area and responsive behavior. Preserve the approved premium instructor identity; do not falsely represent an AI as a human.
3. Pass only appropriate, verified instructional context to the existing backend: Lab identifier, concept, current stage, current exercise (if applicable), and learner question. Do not unnecessarily send personal information or confidential system state.
4. Support meaningful loading, streaming if already supported, completion, error, and retry states. Avoid fabricated AI responses or silent fallback presented as live generated tutoring.
5. Preserve **free** “Explain This Concept” and “Teach This in More Depth” educational assistance, including beginner-first definitions, worked steps, remediation, and follow-up practice. Do not move those features behind an entitlement wall.
6. Reuse the existing Tutor backend/API contracts where feasible. If a provider credential or approved endpoint is missing, document the blocker; never add secrets to the repository or invent deployment success.
7. Preserve existing authentication, permission enforcement, progress tracking, assessment integrity, grading, the 30-competency model, and read-only showcase restrictions.
8. Demonstrate and test the shared component in **one existing Lab**. Make the architecture reusable for the other 418 Labs and Boot Camp instructional units, but do not bulk-modify content as part of this sprint.
9. Run targeted existing tests and, where feasible, add a regression test for contextual Tutor invocation, free assistance, and error handling. Follow repository conventions.
10. If the change is safe and tested, report the appropriate deployment pathway. Do **not** deploy unverified changes. Do not touch Stripe, product prices, subscription settings, or initiate financial transactions.

### Production and source-control safeguards
- Treat prior approved/frozen project requirements as controlling; flag conflicts.
- Prefer a focused feature branch and reviewable pull request rather than making untested application changes directly on `main`. The owner requested the **handoff document** on `main`; that does not authorize bypassing production tests.
- Keep the scope limited to Tutor and shared instructional integration.
- Do not remove or alter unrelated functionality.
- Do not represent static scripted responses as an operational AI provider.
- Do not incur paid provider or infrastructure costs without explicit approval.

## Required 15-minute closeout
Report:
1. Baseline `main` commit and files inspected.
2. Precise feature implemented (or blocker preventing implementation).
3. Changed files and branch/PR or commit links.
4. Tests executed with actual pass/fail results.
5. Whether the Tutor actually contacted a configured backend, and whether the response was live, fallback, or unavailable.
6. Whether anything was deployed to production; evidence if yes.
7. Remaining steps to expand safely to 419 Labs and Boot Camps.

## Acceptance criteria
- Tutor survives instructional stage changes without losing relevant conversation context, unless intentionally reset.
- Current Lab and stage context are correct and authorized.
- Free explanations remain accessible where previously approved.
- Error handling and retry behavior are visible and truthful.
- Existing grading, progress, security, and entitlements are unaffected.
- At least one real existing Lab demonstrates the integration, with automated or reproducible manual checks.
- No claim of production acceptance without verified tests and deployment evidence.

## Continuity
Curriculum content production for 419 Labs and the approved Boot Camps continues in normal ChatGPT conversation. Codex is reserved for actual code implementation. This file is an instruction/handoff only; its existence does not mean the Tutor work is finished.
