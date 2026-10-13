# SQL Status — v0.14.0.0 Preview

**YES, this release introduces an optional-but-required-for-new-features additive migration.** It has not been run in your existing Supabase project. None of the new features are guaranteed to work until the deployed schema is reconciled and migration is reviewed/applied.

- **1. Read only:** `supabase/admin/v0.14.0.0_PREFLIGHT_READ_ONLY.sql` (inventory requirements without writes). Verify existing `platform_plans.checkout_enabled`, `forum_reports`, `admin_audit_log`, `user_has_tool_access(uuid,text)`, plan grants/subscriptions, and staff RLS/grants. This script may fail if core historic tables are missing; stop and reconcile.
- **2. Review and apply once:** `supabase/migrations/v0.14.0.0_OWNER_PLANS_AND_INTERACTIVE_TRAINING.sql` (new OWNER plan flag RPC; two inactive/invisible founding plans; service-role-only instruction, answer bank, attempts; atomic forum reporting RPC; private GWS drafts).
- **3. PRIVATE seeds, separate from public GitHub:** `v0.14.0.0_OWNER_PRIVATE_LAB_CONTENT_SEED_DO_NOT_UPLOAD_TO_GITHUB.sql` (94 authored Foundation Labs), then `v0.14.0.0_OWNER_PRIVATE_F2_C07_L01_REVIEWED_ANSWER_SEED_DO_NOT_UPLOAD_TO_GITHUB.sql` (one six-question calculation rubric). Keep answer keys private and independently review the source math.
- **4. Read only:** `supabase/admin/v0.14.0.0_POSTFLIGHT_READ_ONLY.sql`.

Do not rerun previous migrations, do not generate new encryption keys, and do not execute the private seeds before the new schema exists. Existing historical v0.13.5.4/5 scripts are not available; verify live schema before replacing any RPC or other contract. See `docs/SQL_AND_RELEASE_INSTRUCTIONS.md`.
