-- v0.14.0.30 BEFORE staging migration. Read-only inventory and security controls.
BEGIN TRANSACTION READ ONLY;
WITH required(kind,name) AS (VALUES
 ('table','catalog_products'),('table','checkout_intents'),('table','site_orders'),
 ('table','site_order_items'),('table','site_settings'),('table','profiles'),('table','admin_user_roles'),
 ('table','admin_user_flags'),('table','admin_audit_log'))
SELECT 'prerequisite' AS category,kind||':'||name AS object,
 to_regclass(format('public.%I',name)) IS NOT NULL AS passed
FROM required
UNION ALL SELECT 'schema','storage.buckets',to_regclass('storage.buckets') IS NOT NULL
UNION ALL SELECT 'schema','storage.objects',to_regclass('storage.objects') IS NOT NULL
UNION ALL SELECT 'permission','anon.catalog_products.UPDATE.DENIED',
 NOT coalesce(has_table_privilege('anon','public.catalog_products','UPDATE'),false)
UNION ALL SELECT 'permission','authenticated.catalog_products.UPDATE.DENIED',
 NOT coalesce(has_table_privilege('authenticated','public.catalog_products','UPDATE'),false)
UNION ALL SELECT 'deployment','digital_title_table_not_yet_installed',
 to_regclass('public.gu_digital_books_v01430') IS NULL
ORDER BY category,object;
ROLLBACK;
