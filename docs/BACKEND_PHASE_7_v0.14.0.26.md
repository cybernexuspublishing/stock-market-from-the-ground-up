# v0.14.0.26 — Backend Phase 7: Fail-Closed Report Status Audit Backstop

| Control | Value |
| --- | --- |
| Project | The Stock Market: From the Ground Up |
| Publisher | Cyber Nexus |
| Version | v0.14.0.26 |
| Owner-controlled baseline | GitHub `main` at `7c03889561979cc67b28ec280449311e2493d40d` (v0.14.0.24), as last independently confirmed |
| Source package strategy | **Cumulative direct-upload overlay: v0.14.0.25 + v0.14.0.26**, because v0.14.0.25 was reported deployed in SQL but was not visible on GitHub `main` at packaging |
| Release type | Backend integrity control + source verification; no production SQL executed |
| Status | Candidate; staging and role-negative acceptance required; NOT production certified |
| Document ID | GU-WEB-BE-20261015-007 |
| Date | October 15, 2026 |
| Storage | ZIP attachment; Google Drive ID not supplied |

## Verified gap addressed

The legacy `/api/admin?action=report_resolve` and `/api/admin-v0133?action=commons_report_resolve` use independent service-role UPDATE and separate best-effort audit calls. Therefore reports can change status without an audit record if the second operation fails. The more recent v0.14.0.24 `gu_mod_case_transition_v01424` already guarantees same-transaction business logging, but cannot enforce atomicity of the legacy endpoints by itself.

The v0.14.0.26 migration adds **one narrow PostgreSQL AFTER UPDATE OF status trigger** on `public.forum_reports`. Every change to `status` writes a corresponding `admin_audit_log` record in the **same transaction**. If the audit INSERT fails, PostgreSQL rolls back the status UPDATE. This covers both existing and current status-writing API paths **without replacing their HTTP contracts or changing report states**.

**Distinguish two audit entries:** For v0.14.0.24 case transitions, the database trigger logs an integrity event (`forum.report.status.guard.v01426`) and the v0.14.0.24 RPC separately logs the staff decision (`forum.report.case.*`). The two entries have different purposes and are *not duplicates to delete*. Existing v0.14.0.25 case-decision history intentionally shows only the staff-decision entries. General Admin Audit Log can show the integrity marker. It is not proof of administrator identity: legacy service-role requests may not carry `auth.uid()`; a `resolved_by` value is not independently verified in this trigger, so the audit includes an explicit provenance field and never claims authenticated attribution. Actual staff decision authorization still depends on the existing API/RPC checks.

## Migration gates

1. The **v0.14.0.25 source files and its reviewed DB function are prerequisites**. Because the GitHub branch was still at v0.14.0.24 at packaging, this ZIP includes those complete v0.14.0.25 files again, not just v0.14.0.26 changes. This makes the overlay safe whether v0.14.0.25 was committed or only the SQL was installed. Do not execute previous migrations again just because their files are in the repository.
2. Review `supabase/admin/v0.14.0.26_AUDIT_GUARD_PREFLIGHT_READ_ONLY.sql` in staging: all prerequisites true, including `admin_audit_log.actor_user_id` NULLABLE and `details` JSONB. STOP if any required column or constraint is incompatible. Inspect existing `admin_audit_log` triggers/check constraints; the migration does not disable them.
3. Test migration **on disposable STAGING reports** with: status open -> reviewing; reviewing -> resolved; no-op update open -> open; two concurrent status changes; rollback simulation by rejecting `admin_audit_log` INSERT. Confirm that an audit failure aborts the report update and that `GU_*` authorization is unchanged. Check legacy API requests with owner/moderator JWT. NEVER perform these write tests on live reports.
4. Apply SQL to production **only after explicit approval and staging success**. Source ZIP upload does NOT execute SQL. Run the read-only postflight and confirm guard_function_installed=true, status_trigger_enabled=true, security_definer=true, hardened_search_path=true, anon_can_execute=false, member_can_execute=false. `guarded_status_audit_rows` initially 0 is expected until a real status transition occurs.
5. Re-run the v0.14.0.24/25 CI browser/API tests and record all GitHub workflows. Cloudflare production SHA parity and signed-in role E2E remain unverified until checked.

## Known limitations (not represented as fixed)

- The trigger covers **report status changes only**, not changes to topic/post bodies, pin/lock decisions, membership/commerce, general Site Settings, or other administrative writes. These need separate same-transaction auditing and role-negative testing.
- Authorization of original calls is still enforced by the existing API and v0.14.0.24 SQL; this trigger **does not replace permissions** or prevent an unauthorized service-role caller from changing a report. It only guarantees a durable record for the status transition.
- All legacy report-status changes before migration remain historically unauditable if no audit entry was recorded at that time. Never retroactively fabricate a decision record.
- No end-to-end notification/mention delivery, checkout sandbox and refund reconciliation, 419 lab provenance/no-hindsight validation, simulator/journal/Tutor/GWS tenant segregation was certified by this increment.
- The public `main` branch protection is still absent. GitHub source checks alone do not prove Cloudflare deployment parity or PostgreSQL execution.

## Acceptance requirements

CI/source syntax PASS + installation objects PASS are **not sufficient**. Approval requires staging failure-injection acceptance, anonymous/standard/expired staff authorization negative tests, production SHA parity and one authorized browser moderation workflow. Keep the website frozen curriculum, book-sale exclusivity controls and all previously approved features unchanged.
