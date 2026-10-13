# SQL required for v0.13.5.7.6

**New migrations required to install this frontend release: NONE.** Do not rerun all historical Supabase migrations. This release adds static illustrations, client-side navigation/UI and query pagination against the **existing** `commons_posts` table and existing CMS API. Its thread pagination relies on a PostgREST `select(...,{count:'exact'}).range(...)` query, not on a new SQL function.

**Optional SELECT-only inspection:** `supabase/admin/database-contract-audit-read-only.sql` — paste into the existing Supabase SQL Editor and run only if you want to inventory tables, RLS policies and server function signatures. This SQL explicitly uses read-only transactions and ends with ROLLBACK. It may report missing optional tables; those results must be reconciled rather than blindly installing guessed SQL.

**Unresolved historical database sources:** original migrations `v0.13.5.4_INTELLIGENT_CONTROL_CORE.sql` and `v0.13.5.5_OWNER_MANUAL_ENTITLEMENTS.sql` are absent from available repository history. Their absence does not mean they were not executed in the existing Supabase project. Before any DB changes, compare the read-only report against deployed RPC signatures, columns, roles, grants and policies.

**Not enabled**: payment checkout, KDP Select digital-book direct sales, mandatory staff MFA, mandatory CAPTCHA, QR activation, provisioning of real Showcase entitlements.
