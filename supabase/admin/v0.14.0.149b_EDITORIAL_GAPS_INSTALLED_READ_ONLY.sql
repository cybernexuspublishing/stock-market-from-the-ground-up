-- D09 supplemental installation report. READ-ONLY; no mutations.
WITH expected(x) AS (VALUES
 ('public.gu_tutor_editorial_cases_v014149'),
 ('public.gu_tutor_editorial_audit_v014149'),
 ('public.gu_tutor_topic_gaps_v014149')
), details AS (
 SELECT x,to_regclass(x) AS obj FROM expected
)
SELECT
 'D09_149B_OWNER_EDITORIAL_AND_GAP_DIAGNOSTIC' AS diagnostic,
 jsonb_agg(jsonb_build_object(
  'table',x,'installed',obj IS NOT NULL,
  'rls',CASE WHEN obj IS NULL THEN NULL ELSE
   (SELECT relrowsecurity FROM pg_class WHERE oid=obj) END,
  'anon_select',CASE WHEN obj IS NULL THEN NULL ELSE has_table_privilege('anon',obj,'SELECT') END,
  'member_select',CASE WHEN obj IS NULL THEN NULL ELSE has_table_privilege('authenticated',obj,'SELECT') END,
  'service_select',CASE WHEN obj IS NULL THEN NULL ELSE has_table_privilege('service_role',obj,'SELECT') END
 ) ORDER BY x) AS tables,
 to_regprocedure('public.gu_v014149_review_tutor_case(uuid,uuid,text,text)') IS NOT NULL
  AS owner_review_rpc_installed,
 to_regprocedure('public.gu_v014149_record_tutor_gap(text)') IS NOT NULL
  AS anonymous_topic_gap_rpc_installed,
 'SCHEMA_ONLY_NOT_RUNTIME_ACCEPTANCE' AS evidence_scope
FROM details;
