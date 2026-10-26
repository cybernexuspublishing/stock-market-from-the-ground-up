# Gate 1 — Academy Persistence, Private Audit and B01 Assessment Continuation
**Document ID:** SMFGU-GATE1-2026-10-26-PROGRESS-V1  
**Project:** The Stock Market: From the Ground Up  
**Publisher:** Crown & Lantern Press / Cyber Nexus  
**Owner:** Authorized technical Owner delegate  
**Version:** 1.0  
**Date:** October 26, 2026  
**Branch:** `main`, repository `cybernexuspublishing/stock-market-from-the-ground-up`  
**Document format/location:** Markdown `docs/releases/2026-10-26_GATE1_ACADEMY_PERSISTENCE_B01_ASSESSMENT_CONTINUATION.md`  
**Google Drive document ID:** Not assigned; no Google Drive copy made.  
**Status:** IMPLEMENTED + simulated-contract TESTED + database migration PROVEN; *real authenticated production progress SAVE/REFRESH acceptance not proven.*

## Roles
Full-stack/API engineering, Supabase/PostgreSQL architect, Cloudflare Pages, security/RLS and privacy, SRE/CI/CD, Learning/Assessment architect, educational quality reviewer, authorized Owner acceptance auditor.

## Prior genuine member acceptance and new scope
Production GitHub Actions [40347586489 attempt #2](https://github.com/cybernexuspublishing/stock-market-from-the-ground-up/actions/runs/40347586489) authenticated a dedicated QA member, received 200 content+context for all 20 B01 Labs, and validated 5/5 Truth5 lesson read contracts. That test did NOT persist study notes, verify logout/resume, or grade an assessment. Its success does not certify the normal Turnstile challenge because it used an unattended password grant without a captcha token while Supabase CAPTCHA was evidently temporarily relaxed.

Current Supabase `oxihglyfgzywsupnyicb` has five accounts, 419 canonical Labs, 20 B01 v97 private grading sets, zero reviewed grading sets, one Academy enrollment, zero durable progress rows, zero protected grading attempts. The authorized 336 selected candidates and remaining 83 Upcoming status are unchanged. Existing account and completed attempt records are never overwritten by this QA.

## Architectural findings and decisions
1. The **existing** `/api/bootcamp-academy` is a genuine authenticated API backed by `gu_bootcamp_academy_save_v014168`: enrollment, started day, saved reflection, revision compare-and-set and fail-closed progress read. It reuses the authoritative entitlement engine. No second progress system needed.
2. `gu_bootcamp_academy_save_v014168`, `v014_training_start` and `v014_training_answer` are service-role-only EXECUTE, with ordinary `anon` and `authenticated` EXECUTE revoked. Their private storage relations have RLS on and no direct client read/write grants.
3. There was no dedicated append-only metadata event history for Academy write operations. Latest row state + revision alone is insufficient for incident reconstruction. Added a first-party audit trail without storing reflections, private answers, lesson bodies, credentials or market data. Existing progress remains authoritative.
4. No authenticated test may disable or circumvent CAPTCHA just to pass a test. GitHub Actions [40360013544](https://github.com/cybernexuspublishing/stock-market-from-the-ground-up/actions/runs/40360013544) genuinely ran the new production progress script but failed at `HTTP 400 captcha_failed` **before any write**. This is a correct fail-closed security outcome, not evidence that the Academy persistence API itself failed.

## New deliverables
- `tests/live-academy-progress-qa.mjs`: real Supabase-issued QA bearer, private enrollment, new unclaimed QA day only, idempotent start, fictional clearly marked reflection, fresh GET, stale revision HTTP 409, Origin 403, invalid day 400, guest denial, authentic refresh grant and new token read. Refuses to overwrite any existing QA member note; no live payment.
- `.github/workflows/live-academy-progress-qa.yml`: low-cost on-demand/changed-source QA using already stored LAB_QA_EMAIL/PASSWORD Secrets. Runs without paid browser tools; if CAPTCHA is enforced it must fail rather than bypass it.
- `tests/test_academy_progress_contract.mjs`: deterministic, real Academy handler mocked dependencies and separate synthetic member identities; tests enrollment, revision locking, user isolation, rejected writes, unavailable backend and absence of grade/money outcomes. **TESTED** in GitHub Actions.
- `.github/workflows/academy-progress-contract.yml`: runs Academy member contract, protected B01 versioning, Owner editorial review, withdrawal/no-key-leak tests and scoring guard fixtures. No production writes.
- `supabase/migrations/v0.14.0.295_academy_metadata_audit.sql`: additive service-only immutable-event history table plus AFTER INSERT/UPDATE triggers on existing Academy enrollment/progress relations. Each event is written atomically with the primary member update, containing only member identity, program/day, old/new status, revision and timestamp.
- `supabase/rollbacks/v0.14.0.295_academy_metadata_audit_ROLLBACK.sql`: disable new triggers/function while **preserving** any newly accrued audit events and all existing member records. Never DROP/TRUNCATE logs in a normal rollback.
- `supabase/reviews/2026-10-26_v014295_academy_audit_postflight.sql`: read-only verification. `supabase/reviews/2026-10-26_BACKEND_ZERO_TRUST_RELEASE_GATE.sql` extended to reject loss of audit RLS or hooks.
- `tests/test_academy_audit_schema_contract.mjs`: enforces no private study reflection or grading-answer fields in audit schema and non-destructive rollback requirements.

## Production database proof
Supabase applied `v0_14_0_295_academy_metadata_audit` successfully. Postflight read-only SQL independently confirmed:
- Audit table RLS is ON.
- `anon` and `authenticated` have no direct SELECT.
- `service_role` may append.
- Both progress/enrollment audit triggers are installed and enabled.
- Initial audit events = 0; private Academy progress = 0; one pre-existing enrollment untouched; canonical Labs still = 419.
- SQL read-only security gate returned PASS. Real event generation must still be proven by the protected member write path.

## Protected B01 assessment source review
The actual live service-role-only v97 draft rubric records for the twenty exact canonical B01 identifiers were inspected without publishing answer keys:
- 20/20 sets, 120/120 questions with corresponding private answer entries.
- 100/100 multiple-choice questions: correct key appears among options and options do not duplicate after case/trim normalization.
- 20/20 free-response numeric questions: valid finite numeric key and allowed tolerance. Independent mathematical check of the 20 described fictional cases found consistent results (not externally verified historical trading).
- 120/120 questions have substantive explanations (>=70 characters).
- 0/20 rubrics in `reviewed` status; 0/20 lesson sources recorded as editor-reviewed. Consequently **no official assessment or mastery may be awarded**. Authored guided study remains separately available to authorized beta members.

## Test execution / evidence
1. Real production authenticated Lab/Truth5 read contract (prior) — **PROVEN**: [GitHub workflow attempt #2](https://github.com/cybernexuspublishing/stock-market-from-the-ground-up/actions/runs/40347586489).
2. Live authenticated Academy write/resume workflow — **EXECUTED, BLOCKED AT AUTH**: [40360013544](https://github.com/cybernexuspublishing/stock-market-from-the-ground-up/actions/runs/40360013544), `captcha_failed`, no QA reflection inserted. Keep CAPTCHA enforced.
3. Deterministic Academy API fixture — **TESTED PASS**: [40360914993](https://github.com/cybernexuspublishing/stock-market-from-the-ground-up/actions/runs/40360914993), role-separated save/reload, CAS, deny-all failure and no mastery.
4. Combined protected Academy + grading regression — **TESTED PASS**: [40361120889](https://github.com/cybernexuspublishing/stock-market-from-the-ground-up/actions/runs/40361120889). Existing seven fixture tests passed, including private Owner review, version-pinned review withdrawal and answer-key redaction.
5. Private Academy audit migration and permissions — **PROVEN** in live Supabase; production authenticated write-event still OPEN.
6. Extended audit-schema CI [workflow on main](https://github.com/cybernexuspublishing/stock-market-from-the-ground-up/actions/workflows/academy-progress-contract.yml) — inspect exact final SHA status separately.

## Owner acceptance and progression
**Accepted:** successful v295 additive migration and read-only postflight, role restrictions, verified source + fixture regression coverage.  
**Needs rework / independent member verification:** human Turnstile-protected browser sign-in, successful durable production QA reflection (only on an explicitly disposable member day), refreshed-token/new-session resume, cross-account production isolation and WCAG/manual UX. No failed request is treated as a successful Academy save.
**Not accepted as Beta Ready:** Truth5 and twenty B01 assessments/lessons; technical source and structural QA do not substitute for signed editorial review, independent response-case verification, and real beta member sessions. The seven-program/336-Lab ambition is a staged release goal, not a fact proven by this change.

## Non-destructive operation and rollback
All schema changes additive; no historical SQL replay, private source/answer publishing, duplicate grade ledger or Stripe LIVE activity. Restore source with exact GitHub revert and observe deployment; if necessary use the v295 rollback (drops instrumentation only, never existing events or member records). Verify existing protected enrolment and progress data before and after any emergency action. No claim of tested restoration from backup is made.

## Revision history
2026-10-26 / v1.0 — Real progress QA probe with explicit CAPTCHA failure, dedicated test+CI, B01 private answer-shape assessment, append-only audit migration and live security postflight, honest release disposition.
