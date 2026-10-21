-- v0.14.0.144 | ONE-RESULT OWNER READ-ONLY POSTFLIGHT.
-- Counts are anonymized; source installed != production authenticated QA.
WITH obj AS (
 SELECT to_regclass('public.gu_bootcamp_progress_v014144') IS NOT NULL table_installed,
        to_regprocedure('public.gu_bootcamp_save_progress_v014144(uuid,integer,text,text)') IS NOT NULL rpc_installed
),perms AS (
 SELECT has_table_privilege('anon','public.gu_bootcamp_progress_v014144','SELECT') anonymous_can_read,
        has_table_privilege('authenticated','public.gu_bootcamp_progress_v014144','SELECT') member_can_read,
        has_table_privilege('authenticated','public.gu_bootcamp_progress_v014144','INSERT') member_can_forge,
        has_function_privilege('authenticated','public.gu_bootcamp_save_progress_v014144(uuid,integer,text,text)','EXECUTE') member_can_call_rpc,
        has_function_privilege('service_role','public.gu_bootcamp_save_progress_v014144(uuid,integer,text,text)','EXECUTE') service_can_call_rpc
 WHERE (SELECT table_installed AND rpc_installed FROM obj)
)
SELECT 'GU_BOOTCAMP_V014144_READ_ONLY' AS diagnostic,
       obj.table_installed,obj.rpc_installed,
       coalesce(perms.anonymous_can_read,false) AS anonymous_can_read,
       coalesce(perms.member_can_read,false) AS authenticated_direct_read,
       coalesce(perms.member_can_forge,false) AS authenticated_can_write,
       coalesce(perms.member_can_call_rpc,false) AS authenticated_rpc_execute,
       coalesce(perms.service_can_call_rpc,false) AS service_rpc_execute,
       CASE WHEN obj.table_installed AND obj.rpc_installed AND
                 perms.anonymous_can_read=false AND perms.member_can_read=false AND
                 perms.member_can_forge=false AND perms.member_can_call_rpc=false AND
                 perms.service_can_call_rpc=true
            THEN 'SCHEMA_AND_GRANTS_PASS_NOT_END_TO_END_MEMBER_ACCEPTANCE'
            ELSE 'BLOCKED_INVESTIGATE_EXISTING_INSTALLATION'
       END AS acceptance_scope
FROM obj LEFT JOIN perms ON true;
