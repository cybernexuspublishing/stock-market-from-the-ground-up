# Talia Market Tutor — Research-to-Guided Teaching Handoff V1
Document ID: SMFGU-TALIA-RESEARCH-HANDOFF-001
Project: The Stock Market: From the Ground Up
Version: 1.0
Date: 2026-10-31
Status: Source implementation; CI, deployment and member-browser acceptance unverified until separately observed
File type: Markdown
GitHub: docs/releases/2026-10-31_TALIA_RESEARCH_GUIDED_HANDOFF_V1.md
Google Drive: Not created
Purpose: Connect existing source-researched Tutor answers to original guided lessons and deeper zero-cost teaching.
Dependencies: Market Tutor response API, source-only guide catalogs, 134 published guided-practice modules; no SQL, payment or member-entitlement changes.

## Change
- Preserve 30 official competency guides, all optional original research catalogs and 134 existing ungraded visual lesson modules; never promote unvalidated source candidates to historical or regulatory facts.
- Expose an exact code/title lesson resolver for published ungraded modules, with optional validated URL selection and on-page navigation.
- Surface a matching lesson button with current-session source-code support; saved older exchanges match by exact source title only.
- Add Teach this in more depth (source-only), pre-filling the next question without automatic submission and clearing its optional paid-AI toggle.
- Deep response returns first principles, observable procedure, limitations, falsification, common trading error, reflection and ungraded review criteria. The existing server accepts only the existing Tutor modes; there is no new privileged endpoint.
- Preserve rate limiting, server entitlement checks, learning status, 419 Lab IDs, 252 Academy/Free positions, private answer keys and no-future data boundaries.

## Evidence and limitations
Source contract test: tests/test_tutor_research_guided_handoff_v1.mjs, wired into Market Tutor Trust workflow. The 419/252 research crosswalks are source candidates, NOT 671 independently accepted teaching units. No new live trade data, third-party transcript redistribution, historical execution claims, database migrations or paid-model enablement.
Release acceptance additionally requires exact-commit CI, build and browser checks, deployed asset confirmation and real signed-in member verification. Roll back the specific commit if the new lesson navigation fails. Do not claim production approval from passing source tests alone.
