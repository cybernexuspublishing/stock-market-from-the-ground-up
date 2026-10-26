# Production Member Authentication Acceptance Attempt — 2026-10-26

**Document ID:** SMFGU-QA-AUTH-2026-10-26-01
**Project:** The Stock Market: From the Ground Up
**Version:** 1.1
**Status:** ATTEMPT 2 PASSED — genuine Supabase password authentication and protected production API contracts PROVEN; browser CAPTCHA challenge and save/logout/resume NOT PROVEN
**Google Drive location:** Not configured or created
**Repository location:** `docs/qa/2026-10-26_PRODUCTION_AUTHENTICATED_QA_ATTEMPT.md`
**Environment:** Yahoo Cloudflare Pages production, `https://stock-market-from-the-ground-up-d1r.pages.dev`
**Supabase project:** `oxihglyfgzywsupnyicb`
**Test workflow:** `.github/workflows/live-lab-qa.yml`
**Test source:** `tests/live-lab-qa.mjs`
**Source commit under test:** `4192eb40aa4e613ad8d0f3a6f9936e46150c48a0`
**GitHub Actions run:** https://github.com/cybernexuspublishing/stock-market-from-the-ground-up/actions/runs/40347586489
**Runner jobs:** attempt 1 `121658534642` (FAIL); attempt 2 `121686906721` (PASS)
**Execution:** attempt 1 on 2026-10-26 15:15–15:17 UTC; attempt 2 finished 16:05 UTC

## Attempt 1 result and direct evidence

| Control | Observed result | Acceptance |
| --- | --- | --- |
| GitHub test uses encrypted existing LAB_QA_EMAIL/LAB_QA_PASSWORD Secrets | Job reached production Auth request; values are never printed | TESTED — configured |
| Playwright reached the live sign-in page | `PASS public sign-in fields present.` | TESTED |
| Real site's CAPTCHA verification control initialized | `PASS real Turnstile gate present; button remains locked before a human challenge.` | TESTED |
| GitHub runner's standalone Supabase password request | HTTP 400 `captcha_failed` | FAIL (correct fail-closed behavior) |
| Supabase Auth provider error classified in 15:15–15:20 UTC window | One `captcha_failed`: `no captcha_token found`; **not** `invalid-input-secret` for this run | PROVEN provider rejection |
| Genuine signed-in QA member session created in this run | No | NOT TESTED past CAPTCHA |
| Twenty B01 protected Lab content and context contracts | Not reached | NOT TESTED |
| Truth5 Academy authenticated GET/progress availability | Not reached | NOT TESTED |
| Paid-Founder membership/entitlements | Excluded from this noncharging test | NOT TESTED |

## Root cause and guardrails
The CI script deliberately sends credentials directly to the Supabase Auth password endpoint without a Turnstile token. GoTrue correctly rejects that request when CAPTCHA is enforced. This error **does not** establish that the password is wrong, and does not prove a mismatch in the current provider's Turnstile secret.

A genuine browser challenge must be completed through the signed-in production site's widget before using the resulting user session for authorized Lab and Academy tests. Do not substitute a fake captchaToken, Cloudflare/Supabase test key, disabled CAPTCHA, service-role RLS bypass, forged JWT, or manually manufactured session as a substitute for a real member login.

The project enforces a $0 budget. The available TinyFish live-browser automation is metered; it was not invoked. Browser context profile `Ground Up — QA Member Access` had no recorded signed-in website. The GitHub Actions runner is noninteractive and cannot personally complete a human challenge.

## Safe completion condition
Use a genuine QA member session obtained via the live Turnstile workflow in a connected authorized browser and execute:
1. Sign in; verify the provider Auth user identity and valid browser session.
2. Confirm member's current real entitlements. Provide the existing, auditable noncommercial QA entitlement through the authenticated Owner Member editor if required. Do not manufacture paid Founder records.
3. Visit dashboard and exact B01 Lab pages; verify all twenty protected content/context APIs according to the user's actual entitlements, without logging lesson bodies or rubrics.
4. Exercise Truth5 Academy read/persist/logout/resume with an explicitly designated disposable QA account and consent for reversible test records. Record exact response status, persistence evidence, role isolation, and error handling.
5. Run negative tests using separate genuine accounts. No live payment processing.
6. Attach browser/CI logs sanitized of credentials and personal data to this document. Only then change the verdict.

## Revision history
| Version | Date | Change |
| --- | --- | --- |
| 1.0 | 2026-10-26 | GitHub production workflow run captured with real GoTrue error and corresponding Auth provider log classification. |

**Owner Acceptance Auditor decision:** Test run completed; production authentication **failed** under the unattended tokenless CI method. Member end-to-end PROVEN status is not awarded. This is an accurate test result, not a reason to disable the existing beta website or CAPTCHA.

## Attempt 2 — verified successful authenticated production QA

**Same source commit:** `4192eb40aa4e613ad8d0f3a6f9936e46150c48a0`. **GitHub Actions run:** [40347586489, attempt 2](https://github.com/cybernexuspublishing/stock-market-from-the-ground-up/actions/runs/40347586489). **Job:** `121686906721`. **Workflow status:** `completed/success`. **Timestamp:** 2026-10-26 16:05 UTC.

| Control | Exact evidence in GitHub Actions job log | Classification |
| --- | --- | --- |
| Real deployed sign-in form | `PASS public sign-in fields present.` | PROVEN accessible |
| Browser Turnstile adapter and pre-verification UI lock | `PASS real Turnstile gate present; button remains locked before a human challenge.` | PROVEN prechallenge UI; **not** a completed challenge |
| Supabase QA username/password grant (GitHub encrypted secrets) | `PASS Supabase QA password authentication (secret and token redacted).` | PROVEN password authentication |
| Provider correlation for rerun | Supabase `auth_logs` during 16:04:45–16:06:00 UTC recorded one `/token` HTTP 200, without an error code | PROVEN provider success for window, consistent with GitHub test |
| 20 canonical Batch B01 protected Lab content and context endpoint pairs | `Batch01 real signed-member authorized Lab API coverage: 20/20.` | PROVEN 20/20 access contracts for QA member |
| Five study days of authenticated Truth5 Academy | `PASS Truth5 five original authenticated study days; no official mastery claimed.` | PROVEN read-only lesson/teaching contract |
| Academy progress availability flag | CI source tests `data.progressAvailable===true` before allowing successful exit | TESTED API availability only; not persisted write/resume |
| Additional canonical Lab F2-C07-L01 | private=200; context=200 | PROVEN read access |
| Noncanonical/unknown SITE-001 probe | private=404/not_seeded; context=200 | Observed; not a zero-error claim |
| 5xx server errors | None reported; workflow exit 0 | PROVEN for these requests |
| Actual student answers, save/logout/resume, multi-user isolation, role-revocation, complete browser flow | No such operations are in `tests/live-lab-qa.mjs` | **NOT TESTED** |
| Human Turnstile success and CAPTCHA restored after testing | The successful CI password grant omitted `captchaToken`; cannot demonstrate real browser Turnstile completion or permanent provider CAPTCHA enforcement | **NOT PROVEN** |

**Important security qualification:** The Owner authorized temporarily turning off Supabase's CAPTCHA protection to permit unattended Auth testing. Successful authentication without a CAPTCHA token is consistent with relaxed provider protection; no user-facing claim is made that CAPTCHA remained enforced. **Restore Supabase CAPTCHA immediately and verify normal human Turnstile sign-in** using the [Auth protection console](https://supabase.com/dashboard/project/oxihglyfgzywsupnyicb/auth/protection). The Supabase integration available in this QA session does not expose that setting as an API write or read, so it was **not** programmatically verified or restored. Do not leave public authentication without bot protections.

**Accepted immediately:** real QA password authentication, the B01 20-of-20 read authorization contract and authenticated Truth5 read contract in the existing production environment, without LIVE billing.

**Remains separate:** full CAPTCHA-protected browser authentication; study persistence, logout/resume, per-member authorization separation; editorial approval of protected grading sets; full learning-quality acceptance.

## Revision history extension
- **Version 1.1 — 2026-10-26:** Verified successful #2 rerun, second GitHub job log, Supabase provider `/token` HTTP 200, exact 20/20 B01 and Truth5 acceptance boundaries; retained original failed attempt for provenance.
