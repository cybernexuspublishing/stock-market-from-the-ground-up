# Codex Handoff — Talia Mercer AI Tutor, Sprint 01

## Document control
- **Project:** The Stock Market: From the Ground Up
- **Date:** 2026-10-24
- **Version:** 1.0
- **Status:** Ready for Codex implementation, with acting-owner authority; not implemented or production-accepted
- **Repository:** `cybernexuspublishing/stock-market-from-the-ground-up`
- **Baseline:** `main` (inspect current HEAD before editing)
- **Timebox:** One focused 15-minute Codex development session
- **Scope:** Reusable Talia Mercer Tutor foundation for the 419 learning Labs and approved Boot Camps
- **Out of scope:** Stripe changes, live payments, pricing, unrelated redesign work
- **Dependencies:** Existing Lab engine, Tutor endpoint, authentication, entitlements, progress/assessment state; verify rather than assume readiness

## Delegated acting-owner authority (controlling for this sprint)
The website owner explicitly appoints Codex as **acting project owner and implementation lead** for this authorized 15-minute sprint. Codex may independently inspect, decide, implement, test, approve its own non-financial technical decisions, and deploy eligible tested changes to production through the project's existing controls. Do not stop for routine owner confirmation when a decision falls within the approved website, Tutor, Labs, Boot Camps, UI, database, or operational scope. Preserve approved/frozen project decisions unless a documented conflict requires escalation. Record material decisions and evidence in the closeout.

**Sole reserved category — live payments and financial transactions:** Codex must **not** initiate, simulate as live, capture, refund, void, or otherwise execute real-money payments or transfers; must not conduct live Stripe checkouts or change live billing prices, subscription charges, payouts, or production payment credentials without a separate explicit instruction from the owner. Existing Stripe integrations may be read or inspected without modifying live financial configuration. Sandbox/no-charge testing is permissible only where no actual charge or live transaction can occur.

Acting-owner authority does **not** override platform permissions, legal restrictions, branch protections, security requirements, source licenses, or mandatory checks. Never falsely claim that deployment, security review, or payment authorization was verified. No new paid vendor expenditure without explicit owner consent.

## Source material and professional responsibilities
Operate as senior full-stack engineer, AI systems engineer, instructional technology architect, frontend UX/accessibility engineer, QA/test engineer, and production deployment engineer. The current repository and frozen approved project documentation are authoritative for implementation. Consult project Library, approved books, StocksToTrade research ZIP archives, and other educational source files **only if truly available in the Codex environment and relevant to the current feature**. Conversation attachments and Library files are not automatically present in Codex; report unavailable sources rather than assume access. Do not spend the entire sprint unpacking archives. Respect third-party intellectual-property rights and use original educational explanations.

## Codex plugin and connected-app guidance
Use available **installed and authorized** plugins/apps where supported in the actual Codex surface. Do not assume that a plugin accessible in ordinary ChatGPT is automatically usable in Codex, and never claim an integration is connected unless verified.

- **GitHub (required):** inspect repo, create/update code, run the established review and release workflow.
- **Supabase (use if present and connected):** inspect Tutor schema, row-level security, Edge Functions, migrations, and learner context. Restrict writes to approved non-payment changes.
- **Cloudflare (use if present and connected):** inspect Worker/Pages deployment configuration, Tutor endpoint, logs, environment variable names, and safe non-payment deployments; never expose secret values.
- **Stripe (read-only for this sprint):** inspect relevant entitlement or billing integration only if necessary; absolutely no live charges, refunds, payout or price edits.
- **Research/source and project-file access (only if actually available):** inspect approved course source files and research archives as needed; lack of access is not a blocker for a narrowly scoped reusable Tutor integration.
- **Playwright/testing:** use existing repository test tooling; if a testing plugin is unavailable, use installed scripts instead of assuming the plugin exists.

In Codex desktop task UI, use **Sources → Use plugins** to select installed plugins where supported. On a supported Codex CLI, `/plugins` opens the plugin browser; installing or connecting may require the account owner's action. For a new session, verify connections and permissions first. Do **not** install speculative plugins or spend the limited sprint on unnecessary marketplace setup.

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
10. If the change is safe and tested, report the appropriate deployment pathway. With delegated acting-owner authorization, production deployment of **tested non-payment changes** is permitted through established deployment controls. Do **not** deploy unverified changes. Live-payment operations remain reserved as defined above.

### Production and source-control safeguards
- Treat prior approved/frozen project requirements as controlling; flag conflicts.
- The owner has delegated acting-owner approval for tested non-financial implementation and production deployment. Prefer a feature branch and reviewable pull request when project controls require it; direct main changes are permitted only when authorized by repository rules and adequately validated. Never bypass mandatory checks.
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
