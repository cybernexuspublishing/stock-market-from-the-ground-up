# Install and acceptance procedure (no deployment performed)

The ZIP contains **complete source files**, but **not the full website repository**. Work on a backed-up checkout at the current GitHub SHA; do not delete preexisting project files.

1. Verify exact Git blob baselines for `assets/js/site.js` (`26f1ce478f9593b0d493d7e4293253a4310da2b7`), `functions/api/commons-report.js` (`84abeae799910c320641fb6e63d19901fbaf0378`) and `learn/index.html` (`feea6364c67a98412ce4fd364007c1c52a7d0ef3`). If different, stop and reconcile instead of force-overwriting.
2. Extract files from ZIP into repo root with nested directories intact. GitHub Desktop should show three modified runtime files and three new runtime files. SQL/admin, tests and docs are additional development files.
3. For local release tests: `node tests/test_reporting_policy_api.mjs`, `node tests/test_report_failures.mjs`, `python tests/test_reporting_policy_ui.py`, `python tests/test_release_contract.py`, `python scripts/audit_frontend.py .`, `bash scripts/build-pages.sh` (build output `public`). Tests depend on Python Playwright/Chromium where available.
4. Review read-only `supabase/admin/v0.14.0.17_REPORT_POLICY_PREFLIGHT_READ_ONLY.sql` with real database. The preceding v0.14.0.7 A/B lockdown must remain intact. Do NOT rerun it.
5. After SQL contract review/staging dry run, Owner may separately apply `supabase/migrations/v0.14.0.17_OWNER_REPORTING_POLICY_REVIEW_REQUIRED.sql` once. It creates a new restricted table and two SQL functions, replaces only the matching report RPC signature, and adds supporting indexes. No existing reports are modified.
6. Run `supabase/admin/v0.14.0.17_REPORT_POLICY_POSTFLIGHT_READ_ONLY.sql`. Confirm anon/authenticated lack execution, service_role execute only; verify Owner writes record audit history, and ADMIN/MODERATOR cannot change it. Verify both legacy and Commons report submissions.
7. Deploy Cloudflare preview, verify changed version of `site.js` loads UI within Admin Control Center under Market Commons Reports. Confirm the Site Settings shortcut, Owner enabled/disabled combinations, business and mandatory safety-limit behavior, content moderation queue, and browser navigation. No production deployment from this package was performed.
8. Perform whole-frontend QA per `docs/FRONTEND_AUDIT_REPORT.md`, then consider production promotion. If production fails, reverting source does not undo SQL data or policy settings; plan an independent database rollback before any schema change.

If the Owner wishes to move to *backend-focused* development, the first prerequisite is proving the current frontend works against a known, stable backend contract. The included policy UI is not a complete sitewide policy registry and should not be mislabeled as such.
