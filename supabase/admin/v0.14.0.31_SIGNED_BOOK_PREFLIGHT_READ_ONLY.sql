-- v0.14.0.31 READ ONLY. Export one grid. No identities, addresses or secrets.
WITH expected(name) AS (VALUES('catalog_products'),('profiles'),('admin_user_roles'),
 ('admin_user_flags'),('admin_audit_log'),('account_private_identity'),('site_settings'))
SELECT 'required_table' AS category,name AS object,to_regclass(format('public.%I',name)) IS NOT NULL AS ready
FROM expected
UNION ALL SELECT 'required_rpc','gu_print_owner_guard_v01428',to_regprocedure('public.gu_print_owner_guard_v01428()') IS NOT NULL
UNION ALL SELECT 'security','anon_catalog_update_denied',NOT COALESCE(has_table_privilege('anon','public.catalog_products','UPDATE'),false)
UNION ALL SELECT 'security','member_catalog_update_denied',NOT COALESCE(has_table_privilege('authenticated','public.catalog_products','UPDATE'),false)
UNION ALL SELECT 'migration','signed_order_table_not_installed',to_regclass('public.gu_signed_book_orders_v01431') IS NULL
ORDER BY category,object;
