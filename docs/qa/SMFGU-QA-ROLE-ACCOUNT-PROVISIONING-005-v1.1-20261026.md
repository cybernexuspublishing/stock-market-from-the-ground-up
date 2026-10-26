# QA Role Account Provisioning — Verified Completion Record

**Project:** The Stock Market: From the Ground Up  
**Document ID:** SMFGU-QA-ROLE-005  
**Version:** 1.1 (supersedes Version 1.0 without removing historical planning)  
**Filename:** `docs/qa/SMFGU-QA-ROLE-ACCOUNT-PROVISIONING-005-v1.1-20261026.md`  
**File type:** Markdown  
**Status:** **PROVISIONING ACCEPTED (7/7); authenticated browser and member-entitlement testing still open**  
**Date of execution:** October 26, 2026, approximately 21:47 UTC  
**Branch:** `main`  
**Production Supabase project:** `oxihglyfgzywsupnyicb`  
**Google Drive location / file ID:** Not assigned; this is a new repository-controlled document and no Google Drive copy was created.  
**Dependencies:** Owner's chat authorization, connected Supabase administration, project Auth Admin API, existing profile/role/audit tables, Gmail account's plus-address alias capability.  
**Purpose:** Document precisely which test accounts exist, their actual production role assignments, security boundary, noncommercial status, and unresolved login acceptance requirements.

## Owner authorization and execution method

The Owner explicitly authorized creating seven dedicated QA identities without using Work Mode, TinyFish, or requiring the Owner to fill seven forms. Creation was performed entirely through connected GitHub and Supabase plugins.

A temporary Supabase Edge Function used the existing Supabase service-role environment to invoke **GoTrue Auth Admin create-user**; it did not write to `auth.users` or `auth.identities` through direct SQL. An independently generated 256-bit, one-time token was verified by SHA-256 inside an atomic, pending-only status transition. Postgres initiated the single HTTPS invocation using temporary `pg_net`.

The result returned **HTTP 200, 7/7 created**, with seven matching Admin audit events. Passwords were cryptographically generated and **never persisted in source, database QA metadata, artifacts or chat**. No invitation emails or LIVE transactions were sent.

## Verified production records

| QA username | Account kind | Effective staff-role assignment | QA purpose |
|---|---|---|---|
| QaAdmin26 | member | ADMIN | Authorized admin and Owner-only denial |
| QaMod26 | member | MODERATOR | Moderation scope |
| QaSupport26 | member | SUPPORT | Support scope without ADMIN privileges |
| QaFree26 | member | NONE | Unpaid/Free entitlement baseline |
| QaPaid26 | member | NONE | Future separately issued noncommercial paid-access test |
| QaRestricted26 | member | NONE | Future suspend/reactivate/revocation tests |
| QaShowcase26 | showcase | SHOWCASE_VIEWER | Presentation-only synthetic authority and isolation |

Verified facts, using production joins against `auth.users`, `profiles` and `admin_user_roles`:
- Exactly **7** Auth user rows carry `raw_app_meta_data.qa_batch='SMFGU-QA-7-20261026'` and `smfgu_qa_only=true`.
- Exactly **7** matching profile rows, with the expected account kinds.
- All **7** have Auth confirmed-email timestamps, set through administrative QA provisioning. This is **not** evidence that a human confirmed receipt of mail.
- Exactly **7** distinct account targets in `admin_audit_log` with action `qa.noncommercial_account_provisioned`; actor is null because the operation was service-executed under explicit Owner chat authorization, rather than falsely attributed to an authenticated Owner session.
- Exactly **0** manual plan grants, **0** site orders, **0** tool passes, **0** library books and **0** legacy entitlements for these accounts at verification.
- Exactly **1** SHOWCASE_VIEWER role on a showcase account, which has no production entitlements.

The one-time batch completion record reported `status='complete'`, count 7, and no commercial grants. After reconciling the Auth and audit evidence, both the temporary outbound networking extension and the consumed-token table were removed. The Edge Function was redeployed as a deny-all (HTTP 410) stub with **`verify_jwt=true`** and its source committed to the repository. It can no longer create identities.

## Acceptance limits — important

1. **Authenticated UI login not yet tested.** The initial passwords were intentionally discarded. For interactive sign-in, each controlled QA identity must later go through the existing secure password-recovery/reset mechanism. No session tokens or passwords were supplied to the assistant.
2. **Age qualification was not fabricated.** No `account_private_identity` DOB or verified age was inserted for these nonhuman test identities. Member journeys that legally or operationally require age verification must remain blocked until an appropriate QA-specific policy is approved; an invented DOB must not be treated as human evidence.
3. **Paid-Access QA is not a paid subscription.** `QaPaid26` has no active purchase, grant or paid entitlement. Its test rights must be explicitly issued and verified using the audited noncommercial mechanism, without claiming a successful commercial transaction.
4. **Restricted QA is not yet suspended.** `QaRestricted26` is initially an ordinary unprivileged QA member. Restriction and restoration must be tested through the authorized Admin workflow with audit logging.
5. **QA identities are not real customers.** They carry authenticated `app_metadata.smfgu_qa_only=true`. KPI reports that indiscriminately count all profile rows will include these fixtures until explicitly separated. Member KPIs therefore require QA exclusion before final reporting acceptance.
6. **The staff-role login matrix and every Admin module lifecycle remain NOT ACCEPTED.** Correct database role records are not a replacement for legitimate authenticated browser evidence.
7. **No LIVE payment, subscription, member acquisition, founding-place consumption, SMTP invite, or storefront toggle was initiated.**

## Versioned technical sources

- `supabase/migrations/20261026_qa_identity_single_use_control.sql` — temporary, service-only one-use gate.
- `supabase/functions/smfgu-qa-provision-once-20261026/index.ts` — current deny-all retired implementation (Version 2 deployed).
- `supabase/migrations/20261026_qa_network_transport_cleanup.sql` — temporary outbound transport removed after confirmed completion.
- `supabase/migrations/20261026_qa_provision_nonce_cleanup.sql` — consumed token table removed after Auth and audit reconciliation.
- `tests/test_admin_account_creation_least_privilege_v1.mjs` — API staff-role mapping, invalid-role denial, and delegated staff isolation.
- `.github/workflows/deployment16-admin-shell.yml` — mandatory Admin role-creation test.

## Next engineering priorities

1. Exclude `smfgu_qa_only` identities from customer/member acquisition and occupancy KPIs while preserving separate test-account reporting.
2. Implement repeatable, noninteractive, legitimate QA session testing from the Auth API without disabling Cloudflare Turnstile or claiming that unattended Auth tests prove a human CAPTCHA pass.
3. Use signed and audited Owner-only noncommercial rights to exercise member-access boundaries, then reverse all QA-specific entitlements.
4. Execute Administrator, Moderator, Support, Free, paid-access and Showcase deny/allow matrices, including account restriction, mutation auditing and login/logout/resume evidence.
5. Complete an exact-SHA uncancelled CI run and all ten Admin module lifecycle gates.

## Revision history

| Version | Date | Revision | Decision |
|---|---|---|---|
| 1.0 | 2026-10-26 | Provisioning plan, risk guardrails, required seven identities | Planning only |
| 1.1 | 2026-10-26 | Seven production Auth accounts created and reconciled; one-time machinery retired; acceptance limits documented | QA provisioning accepted; end-to-end browser work outstanding |

**Footer — SMFGU-QA-ROLE-005 v1.1 — Noncommercial QA only — LIVE payments excluded**
