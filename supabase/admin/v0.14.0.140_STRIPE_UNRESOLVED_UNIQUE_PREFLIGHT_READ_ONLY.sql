-- Cyber Nexus / The Stock Market: From the Ground Up | v0.14.0.140
-- EXECUTE ONLY in existing production Supabase SQL Editor, read-only.
-- Never changes payment records, memberships, locks, policies or product prices.
-- Proves that the reviewed v58 partial UNIQUE index is installed, VALID and READY.
-- Do not interpret code assertions as proof that migration was executed.
BEGIN TRANSACTION READ ONLY;
WITH state AS (
 SELECT t.oid AS table_oid,t.relrowsecurity AS rls_enabled,
        i.oid AS index_oid,x.indisunique,x.indisvalid,x.indisready,
        pg_get_indexdef(i.oid) AS index_ddl
 FROM (SELECT to_regclass('public.gu58_live_checkout_intents') AS oid) ref
 LEFT JOIN pg_class t ON t.oid=ref.oid
 LEFT JOIN pg_namespace n ON n.oid=t.relnamespace
 LEFT JOIN pg_class i ON i.relname='gu58_one_unresolved_per_member_sku'
   AND i.relnamespace=n.oid AND i.relkind='i'
 LEFT JOIN pg_index x ON x.indexrelid=i.oid AND x.indrelid=t.oid
), test AS (
 SELECT
  'GU58 protected LIVE checkout table installed' AS requirement,
  (SELECT table_oid IS NOT NULL FROM state) AS passing
 UNION ALL SELECT 'LIVE intent RLS enabled',
  (SELECT rls_enabled IS TRUE FROM state)
 UNION ALL SELECT 'Unresolved single-SKU unique index installed on correct table',
  (SELECT index_oid IS NOT NULL FROM state)
 UNION ALL SELECT 'Index UNIQUE and VALID and READY',
  (SELECT indisunique IS TRUE AND indisvalid IS TRUE AND indisready IS TRUE FROM state)
 UNION ALL SELECT 'Index keys use member + SKU type + SKU code',
  (SELECT position('(user_id, sku_kind, sku_code)' in coalesce(index_ddl,''))>0 FROM state)
 UNION ALL SELECT 'Index is partial for prepared + checkout_created only',
  (SELECT position('prepared' in coalesce(index_ddl,''))>0
      AND position('checkout_created' in coalesce(index_ddl,''))>0
      AND position(' WHERE ' in coalesce(index_ddl,''))>0 FROM state)
 UNION ALL SELECT 'Anonymous cannot write LIVE intents',
  NOT coalesce(has_table_privilege('anon',
   to_regclass('public.gu58_live_checkout_intents'),'INSERT,UPDATE,DELETE'),false)
 UNION ALL SELECT 'Authenticated members cannot write LIVE intents',
  NOT coalesce(has_table_privilege('authenticated',
   to_regclass('public.gu58_live_checkout_intents'),'INSERT,UPDATE,DELETE'),false)
 UNION ALL SELECT 'Service role can read/insert/update LIVE intents',
  coalesce(has_table_privilege('service_role',
   to_regclass('public.gu58_live_checkout_intents'),'SELECT'),false)
  AND coalesce(has_table_privilege('service_role',
   to_regclass('public.gu58_live_checkout_intents'),'INSERT'),false)
  AND coalesce(has_table_privilege('service_role',
   to_regclass('public.gu58_live_checkout_intents'),'UPDATE'),false)
)
SELECT requirement,
 CASE WHEN passing IS TRUE THEN 'PASS' ELSE 'HOLD' END AS status,
 CASE WHEN passing IS TRUE THEN 'No action' ELSE 'Review installed v58 schema before paid LIVE acceptance' END AS action
FROM test ORDER BY requirement;
ROLLBACK;
