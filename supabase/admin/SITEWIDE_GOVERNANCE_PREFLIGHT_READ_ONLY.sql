-- SITEWIDE GOVERNANCE — READ-ONLY INSPECTION (NO SCHEMA OR DATA MODIFICATION).
-- Run only if auditing the actual target Supabase production/staging project.
-- Object presence alone does NOT prove permission enforcement or functionality.
WITH required(object_category,schema_name,object_name) AS (
 VALUES
 ('Identity','public','profiles'),('Staff','public','admin_user_roles'),
 ('Staff','public','admin_user_flags'),('Settings','public','site_settings'),
 ('Community','public','forum_topics'),('Community','public','forum_posts'),
 ('Community','public','commons_topics'),('Community','public','commons_posts'),
 ('Moderation','public','forum_reports'),('Learning','public','lab_training_sets_v014'),
 ('Learning','public','lab_training_attempts_v014'),('Commerce','public','platform_plans')
)
SELECT r.object_category,r.schema_name||'.'||r.object_name AS object_name,
 CASE WHEN c.oid IS NULL THEN 'MISSING' ELSE 'PRESENT' END AS table_status,
 CASE WHEN c.oid IS NULL THEN 'NOT APPLICABLE'
      WHEN c.relrowsecurity THEN 'ENABLED' ELSE 'DISABLED' END AS rls_status,
 CASE WHEN c.oid IS NULL THEN NULL ELSE
   (SELECT count(*) FROM pg_policies p WHERE p.schemaname=r.schema_name AND p.tablename=r.object_name)
 END AS policy_count
FROM required r
LEFT JOIN pg_namespace ns ON ns.nspname=r.schema_name
LEFT JOIN pg_class c ON c.relnamespace=ns.oid AND c.relname=r.object_name AND c.relkind IN ('r','p')
ORDER BY r.object_category,r.object_name;

WITH required(signature) AS (
 VALUES
 ('public.v014_community_report(uuid,text,text,text,text)'),
 ('public.user_has_tool_access(uuid,text)'),
 ('public.v014_owner_plan_visibility(uuid,text,boolean,boolean,boolean)'),
 ('public.v014_training_start(uuid,text,text)'),
 ('public.v014_training_answer(uuid,uuid,text,integer)')
)
SELECT signature, to_regprocedure(signature) IS NOT NULL AS installed,
 COALESCE(has_function_privilege('anon',to_regprocedure(signature),'EXECUTE'),false) AS anonymous_execute,
 COALESCE(has_function_privilege('authenticated',to_regprocedure(signature),'EXECUTE'),false) AS authenticated_execute,
 COALESCE(has_function_privilege('service_role',to_regprocedure(signature),'EXECUTE'),false) AS service_role_execute
FROM required ORDER BY signature;

-- Only policy keys; avoid displaying secret integration values or member identities.
SELECT setting_key, public_read, updated_at
FROM public.site_settings
WHERE setting_key LIKE 'community.%' OR setting_key LIKE 'forum.%'
ORDER BY setting_key;
