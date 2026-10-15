-- v0.14.0.29 STAGING READ ONLY — no changes to customer or payment records
BEGIN TRANSACTION READ ONLY;
WITH dep(label,installed) AS (VALUES
 ('catalog_products',to_regclass('public.catalog_products') IS NOT NULL),
 ('admin_audit_log',to_regclass('public.admin_audit_log') IS NOT NULL),
 ('v01428_owner_role_guard',to_regprocedure('public.gu_print_owner_guard_v01428()') IS NOT NULL),
 ('auth_jwt',to_regprocedure('auth.jwt()') IS NOT NULL),
 ('catalog_product_metadata_jsonb',EXISTS(SELECT 1 FROM information_schema.columns
   WHERE table_schema='public' AND table_name='catalog_products' AND column_name='metadata' AND udt_name='jsonb')),
 ('anon_direct_update_denied',NOT has_table_privilege('anon','public.catalog_products','UPDATE')),
 ('member_direct_update_denied',NOT has_table_privilege('authenticated','public.catalog_products','UPDATE'))
) SELECT label,installed FROM dep ORDER BY label;
ROLLBACK;
