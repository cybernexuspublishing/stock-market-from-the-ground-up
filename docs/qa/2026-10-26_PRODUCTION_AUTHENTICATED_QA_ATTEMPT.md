# Production Member Authentication Acceptance Attempt — 2026-10-26

**Document ID:** SMFGU-QA-AUTH-2026-10-26-01
**Project:** The Stock Market: From the Ground Up
**Version:** 1.0
**Status:** TEST EXECUTED — FAILED at genuine CAPTCHA boundary; authenticated member acceptance NOT YET PROVEN
**Google Drive location:** Not configured or created
**Repository location:** `docs/qa/2026-10-26_PRODUCTION_AUTHENTICATED_QA_ATTEMPT.md`
**Environment:** Yahoo Cloudflare Pages production, `https://stock-market-from-the-ground-up-d1r.pages.dev`
**Supabase project:** `oxihglyfgzywsupnyicb`
**Test workflow:** `.github/workflows/live-lab-qa.yml`
**Test source:** `tests/live-lab-qa.mjs`
**Source commit under test:** `4192eb40aa4e613ad8d0f3a6f9936e46150c48a0`
**GitHub Actions run:** https://github.com/cybernexuspublishing/stock-market-from-the-ground-up/actions/runs/40347586489
**Runner job:** `121658534642`
**Execution:** 2026-10-26 15:15–15:17 UTC

## Result and direct evidence

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
