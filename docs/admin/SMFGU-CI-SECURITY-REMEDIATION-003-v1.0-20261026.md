# CI Regression Recovery and Supabase Security Hardening — Remediation Record

**Project:** The Stock Market: From the Ground Up  
**Controlling specification:** SMFGU-ADMIN-MASTER-001 v1.0  
**Document ID:** SMFGU-CI-SECURITY-REMEDIATION-003  
**Filename:** docs/admin/SMFGU-CI-SECURITY-REMEDIATION-003-v1.0-20261026.md  
**File type:** Markdown (.md)  
**Version:** 1.0  
**Status:** Partial remediation; automated and authenticated acceptance not complete  
**Created:** October 26, 2026  
**Repository and branch:** cybernexuspublishing/stock-market-from-the-ground-up / main  
**Google Drive location / Drive document ID:** Unassigned. This new file is repository-controlled; no Google Drive copy exists.  
**Production:** https://stock-market-from-the-ground-up-d1r.pages.dev  
**Dependencies:** GitHub Actions, Cloudflare Pages production, Supabase project oxihglyfgzywsupnyicb; authenticated Owner and delegated-user test identities.  
**Purpose:** Maintain an evidence-based record of the reported six failures, newer concurrent regressions, production security findings, fixes and remaining release blockers.

## Investigated CI failures (logs, not assumptions)

| CI area | Observed error | Resolution / disposition |
|---|---|---|
| Deployment 08 source contracts | Advanced beta-workspace test expected HTTP 403, received 200; mock had two identical role-lookup matchers, one returning an empty list before the actual test role. | Fixed conflicting fixture in tests/test_v014110_advanced_tool_access_and_workspace.mjs (d874b91). Authorization checks retained. |
| Market Tutor / Member Learning | Test expected HTTP 200, received 503 because the new mandatory admin_user_roles lookup was not included in the fixture. | Added explicit empty-role response only for eligible test member in tests/test_v014100_free_competency_tutor.mjs (a2442a9). Server still fails closed on missing/malformed real role information. |
| Canonical Curriculum | Expected validated Owner-issued noncommercial QA access, received null because the fake user-role response ignored the Owner issuer selector. | Fixed targeted role fixture in tests/test_founder_beta_scoped_learning_access.mjs (3ca0b1a), preserving real issuer verification. |
| Locked LIVE Membership / Store browser | Legacy Store test expected an independently visible standard Memberships tab despite release policy hiding non-offered standard plans. | Updated tests/test_v014084_store_pages_and_categories.py (4cb924e) to assert the three actual public tabs and hidden standard membership tab. No checkout or hidden offer was activated. |
| Owner Store acceptance | Test required Admin's existing all-products directory link, absent from production Admin source. | Restored link to existing store-all-products.html in admin.html (c2918ea). No product visibility or payment activation changed. |
| Sitewide Playwright | Repeated cancellations and pending results during rapid main commits. | NOT ACCEPTED until the complete run for a stable target revision finishes and reports success. |
| New Free Membership and Journal regression work | Other active project commits independently modified Free tool access, JSON shape, Journal and historical studies. | Separate owners must reconcile their failures with current main, not assume those failures stem from the Admin fixes. |

## Production database security changes

**Applied and verified:** Source file `supabase/migrations/20261026_restrict_anon_my_platform_access.sql` committed in c599c40; Supabase migration `restrict_anon_my_platform_access_20261026` applied successfully. Anonymous EXECUTE of `public.my_platform_access()` is now **false**; `authenticated` and `service_role` EXECUTE are **true**. The existing signed-out navigation never requests this privileged RPC.

**Security Advisor observed after patch (2026-10-26):**
- 7 anonymous-executable SECURITY DEFINER warnings, down from 8.
- 85 authenticated-executable SECURITY DEFINER warnings.
- 137 RLS-enabled tables without policies, informational.
- 1 leaked-password-protection warning.

**Direct database policy verification:** All 137 unpoliced RLS tables have zero direct SELECT, INSERT, UPDATE or DELETE grants to both `anon` and `authenticated`. Therefore these are consistent with intentionally service-only tables. Creating permissive policies would weaken those barriers. Reusable read-only test: `supabase/admin/20261026_SECURITY_ADVISOR_POSTFLIGHT_READ_ONLY.sql`.

**Function review evidence:**
- `gu_digital_book_can_download_v01430` checks authenticated identity, member status, suspension/Showcase exclusion, rights, private asset presence, paid ownership or Lifetime eligibility.
- `gu_digital_format_path_v014305` and `gu_digital_formats_v014305` call the guarded download entitlement routine.
- `gu_owner_digital_books_get_v01430`, `gu_owner_print_catalog_get_v01428`, `gu_owner_print_modes_get_v01429`, and `gu_signed_owner_offers_v01431` call dedicated Owner guard functions.
- `gu_mod_case_list_v01424` and `gu_mod_case_transition_v01424` call the moderation actor guard.
- `gu_founder_discount_eligibility_v014221` checks `auth.uid()` and prevents authenticated callers from querying other UUIDs; the service-role case is separate.
- Other function bodies need individual auditing; a SECURITY DEFINER warning is not automatically exploitable and should never be mass-resolved by unaudited GRANT/REVOKE or converting privileged reads to invoker mode.

**Remaining 7 anonymous routines:** `email_is_available`, `username_is_available`, `prepare_book_key_claim`, `gu_digital_offer_status_v01430`, `gu_digital_payment_route_get_v01432r2`, `gu_digital_public_catalog_v01430`, `gu_signed_quote_v01431`. These have public signup/preclaim or public price/availability responsibilities; rate limiting, enumeration, output and abuse controls need a documented product-specific design before changing public EXECUTE.

**Leaked password protection:** Supabase documentation indicates the native feature is limited to Pro or above; the linked organization `Cyber Nexus` was verified to be on the Free plan. Enabling it requires a paid-plan decision and Auth configuration access; no billing change was authorized or made. Interim password strength, CAPTCHA and sign-up rate limits should be reviewed separately.

## Acceptance decisions

| Gate | Decision |
|---|---|
| CI assertions: corrected fixtures / hidden Store rules | Source updates committed; rerun evidence required for stable main. |
| Cloudflare Pages deployment of specific Admin revision | Prior iteration deployed successfully; latest main commit requires independent check. |
| Public and authenticated member access isolation | Unit evidence present, full real-session role matrix outstanding. |
| Owner and delegated-staff browser acceptance (390/900/1280/1440 px) | **NOT ACCEPTED.** Existing TinyFish browser profiles do not have a verified sign-in for the production Admin domain, and no authenticated Owner session was supplied to this run. |
| All Admin modules and workflows | **NOT ACCEPTED.** Module-by-module source/role/function acceptance and visual QA remain. |
| Supabase service-only RLS | **Verified at ACL level**, not every application path. |
| Privileged RPC security | One confirmed anonymous privilege closure; 7 anonymous and 85 authenticated advisories remain for risk-tiered review. |
| Leaked-password setting | Blocked by Free-plan product capability and lack of approved billing upgrade. |
| LIVE payment transactions | Not performed or authorized by this task. |

## Next acceptance sequence

1. Confirm a stable `main` commit and finish all workflow conclusions; inspect failed job logs and fix actual root causes without disabling tests.
2. Verify 390, 900, 1280, and 1440 px production Admin as signed-in Owner, delegated Admin/Moderator, regular member and guest; collect timestamped evidence, permissions, navigation, module flows and mutations.
3. Prioritize SECURITY DEFINER functions with privileged mutations or cross-user parameters; prove callers' roles and guarded behavior, document each exception and update a migration only when existing product behavior can be preserved.
4. Evaluate account enumeration controls on public signup RPCs and book-key claim; preserve legitimate signup and claim functionality.
5. Complete controls for Store, products, labs, Sparks, memberships, community, support, site settings, audit log and payments TEST in separate documented gates.
6. Reconsider native leaked-password protection only with an explicit paid-plan decision, or document compensating controls on the Free plan.

## Revision history

| Version | Date | Description | Sign-off |
|---|---|---|---|
| 1.0 | 2026-10-26 | CI root causes and safe fixture corrections, production RPC privilege reduction, RLS/ACL evidence, outstanding gates | Implementation evidence only; not Owner release acceptance |

**No broad database policy grants, real payment transactions, live checkout toggles, or unauthorized member entitlement changes are part of this release.**
