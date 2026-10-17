-- Cyber Nexus | v0.14.0.50 | P0 exposed-role ACL | READ-ONLY POSTFLIGHT
-- Document ID GU-WEB-SUPABASE-ACL-POSTFLIGHT-014050-20261017
-- All 22 privilege checks MUST be PASS_DENIED; MISSING_TABLE or REVIEW_EXPOSED blocks acceptance.
BEGIN TRANSACTION READ ONLY;
WITH targets(role_name,table_name) AS (VALUES
    ('anon','forum_categories'),('anon','forum_posts'),('anon','forum_topics'),
    ('authenticated','forum_categories'),('authenticated','forum_posts'),('authenticated','forum_topics'),
    ('authenticated','decision_journal'),('authenticated','entitlements'),('authenticated','lab_attempts'),
    ('authenticated','lab_progress'),('authenticated','profiles')
), tested AS (
 SELECT t.role_name,t.table_name,pr.privilege,
        to_regclass(format('public.%I',t.table_name)) AS table_oid,
        COALESCE(has_table_privilege(t.role_name,to_regclass(format('public.%I',t.table_name)),pr.privilege),false) AS effective_privilege
 FROM targets t CROSS JOIN (VALUES ('TRUNCATE'),('TRIGGER')) pr(privilege)
)
SELECT role_name AS grantee,table_name,privilege,
       CASE WHEN table_oid IS NULL THEN 'MISSING_TABLE'
            WHEN effective_privilege THEN 'REVIEW_EXPOSED'
            ELSE 'PASS_DENIED' END AS status,
       table_oid IS NOT NULL AS table_exists,
       effective_privilege AS still_granted
FROM tested ORDER BY grantee,table_name,privilege;
ROLLBACK;
