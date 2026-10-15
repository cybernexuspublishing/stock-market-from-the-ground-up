-- v0.14.0.28 | READ-ONLY prerequisite check. Export CSV if any false.
BEGIN TRANSACTION READ ONLY;
WITH expected(name) AS (VALUES ('catalog_products'),('profiles'),('admin_user_roles'),
 ('admin_user_flags'),('admin_audit_log'))
SELECT name,to_regclass(format('public.%I',name)) IS NOT NULL AS installed FROM expected;
WITH required(t,c) AS (VALUES
 ('catalog_products','product_code'),('catalog_products','product_type'),
 ('catalog_products','title'),('catalog_products','metadata'),
 ('catalog_products','direct_physical_enabled'),('catalog_products','updated_at'),
 ('admin_audit_log','actor_user_id'),('admin_audit_log','action'),
 ('admin_audit_log','target_type'),('admin_audit_log','target_id'),('admin_audit_log','details'))
SELECT t,c,EXISTS(SELECT 1 FROM information_schema.columns i
 WHERE i.table_schema='public' AND i.table_name=t AND i.column_name=c) AS installed
FROM required;
SELECT to_regprocedure('public.gu_owner_print_catalog_get_v01428()') IS NOT NULL AS already_installed,
  coalesce(has_table_privilege('anon',to_regclass('public.catalog_products'),'UPDATE'),false) AS anon_can_directly_update_catalog,
  coalesce(has_table_privilege('authenticated',to_regclass('public.catalog_products'),'UPDATE'),false) AS member_can_directly_update_catalog;
-- Direct UPDATE should be FALSE for both browser roles before migration review.
ROLLBACK;
