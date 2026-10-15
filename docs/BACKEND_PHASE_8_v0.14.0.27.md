# v0.14.0.27 — Backend Phase 8: Supabase Evidence-Based Security Triage + CI Repair

| Control | Value |
| --- | --- |
| Owner | Cyber Nexus — The Stock Market: From the Ground Up |
| Baseline | GitHub `main` `18b0624fda0c7b18dcc29d84c66da3583b922ec5` (v0.14.0.26) |
| Evidence | Owner-uploaded Supabase SQL export, UTC `2026-10-15 17:29:16` |
| Document | GU-WEB-BE-20261015-008; Revision 1 |
| Release | Direct-upload source overlay, not an archive of the entire repository |
| Staging migrations executed by this package | **NONE** |
| Production SQL executed by this package | **NONE** |
| Production signoff | NO-GO: functional, role-negative, payments, and historical-learning acceptance pending |

## 1. Audited 230-row Supabase export (supplied by Owner)

- **191 PASS** metadata checks; **1 SECURITY_RISK**, **1 REVIEW**, **7 PENDING**, **8 NOT_TESTED**, **22 INFO**.
- SQL installed-object and privilege checks are useful, but cannot establish end-to-end functionality or actual RLS predicates.
- `my_platform_access()` is anonymous-executable. The v0.11 source explicitly grants `EXECUTE` to `anon` and returns only an unauthenticated FREE-tier response if `auth.uid()` is null. This is an **intentional compatibility contract**, not on its own proof of access to member data. DO NOT revoke without an anonymous-client impact test. Review the 14 anonymousexecutable SECURITY DEFINER functions individually for privilege and information disclosure.
- Reporting-limit / duplicate-report administration **has not been installed**: `community_report_policy_v01417` and `gu_owner_report_policy_save_v01417` are absent in this database export (7 related PENDING checks). The old `supabase/migrations/v0.14.0.17_OWNER_REPORTING_POLICY_REVIEW_REQUIRED.sql` remains present in GitHub. It changes `v014_community_report` behavior, so a staged compatibility/role/concurrency test is required before any authorized production run. DO NOT treat it as safe to run merely because this audit detects absence.
- `gu_report_status_audit_v01426()` function and trigger installed, both anon and member EXECUTE denied. **The previous exact string check for `search_path` returned FALSE**, despite the reviewed source declaring `SET search_path=pg_catalog,pg_temp`. This is UNRESOLVED until inspecting `pg_proc.proconfig`; whitespace or formatting could explain a false-negative, but we must not assume. A normalized comparison is now supplied.
- `guarded_status_audit_rows=0`, `v01424_transactional_case_audit_entries=0`: indicates *no matching recorded events*, not a broken trigger and not proof that an audit failure rolls back a report update. This requires disposable staging records plus controlled failure-injection.
- Database RLS policy-count observations with 0 policies are not automatically insecure; inspect actual table GRANTs, forced RLS, owner access and service-role use. Do not add permissive policies just to make a count positive.

## 2. Reproducible CI failure in v0.14.0.26

`Backend Contract v0.14.0.25` workflow displayed a GitHub failure without any runnable jobs. The source contains an invalid unquoted colon in a YAML scalar:

```
- name: Isolated browser: moderation and safe history rendering
```

It is replaced with a quoted string, preserving all test steps and installing Playwright/Chromium. This is an actual syntax fix, not a disabled regression gate. The release includes a YAML parser test and a new CI guard that checks for future malformed workflows.

## 3. Added (all read-only, no migrations)

- `v0.14.0.27_ANON_FUNCTION_EXPOSURE_READ_ONLY.sql`: lists the actual 14 or however many currently accessible `SECURITY DEFINER` functions with exact signatures and their active privileges, plus the actual normalized audit-guard search path. It does not dump source or member data.
- `v0.14.0.27_REPORT_POLICY_PREFLIGHT_READ_ONLY.sql`: identifies required installation prerequisites, plus direct reporting INSERT privileges and service RPC. Its `installed` field is factual and **not** an expected PASS for permission rows — compare to the `expected_type` (`must_be_false` vs `must_be_true`).
- `v0.14.0.27_REPORT_POLICY_POSTFLIGHT_READ_ONLY.sql`: only for future reviewed `v0.14.0.17` migration; verifies `policy_table_installed=true`, `owner_save_rpc_installed=true`, `policy_rls_enabled=true`, `server_may_save=true`, and all four anonymous/member direct access / save fields `false`.
- `v0.14.0.27_REPORT_AUDIT_SEARCH_PATH_READ_ONLY.sql`: shows actual `pg_proc.proconfig` and a formatting-normalized check.

## 4. Release gates before v0.14.0.28

1. All GitHub CI, including newly repaired v0.14.0.25 and added v0.14.0.27, must pass on the exact v0.14.0.27 SHA.
2. Review the new anon SECURITY DEFINER inventory. Do not globally revoke or rewrite a public function without a contract test; alert if a public callable function accepts a user ID or exposes protected data without verifying actor identity.
3. Review catalog evidence for v0.14.0.26 trigger search path, not just a fragile raw text comparison.
4. Test reporting-policy migration v0.14.0.17 in an isolated Supabase staging project, including admin/owner, suspended/showcase, duplicates/quotas, `v014_community_report` method compatibility, and non-disablable abuse ceiling. No production migration is bundled or authorized by v0.14.0.27.
5. Audit auth/RLS, finance webhook and refunds, entitlement grants, private historical answer sets, all 419 labs, market data no-lookahead, Admin/GWS ownership, and real notification delivery. Existing unit tests and object presence do NOT satisfy these gates.

**No previously approved customer-book curriculum, KDP Select restrictions, platform entitlements, moderation statuses, settings, or production records are altered by this source release.**
