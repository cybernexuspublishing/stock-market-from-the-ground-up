-- Deployment 09 v0.14.0.149 | Supabase Installed Contract Check
-- READ ONLY. It does not create, modify, grant, drop or execute mutations.
-- Safe to use after Owner reports v102/v103/v107/v149 installed.
-- None of the checks proves member end-to-end execution or production sign-off.
WITH expected(rel,required) AS (
 VALUES
 ('public.gu_member_tutor_exchanges_v014102',true),
 ('public.gu_ai_service_requests_v014103',true),
 ('public.gu_tutor_rate_bucket_v014107',true),
 ('public.gu_member_tutor_conversations_v014149',true)
), inspected AS (
 SELECT e.rel, e.required, to_regclass(e.rel) AS object_id
 FROM expected e
), role_access AS (
 SELECT rel,required,object_id,
 CASE WHEN object_id IS NULL THEN NULL ELSE
   (SELECT c.relrowsecurity FROM pg_catalog.pg_class c WHERE c.oid=object_id) END AS rls_enabled,
 CASE WHEN object_id IS NULL THEN NULL ELSE has_table_privilege('anon',object_id,'SELECT') END AS anon_can_read,
 CASE WHEN object_id IS NULL THEN NULL ELSE has_table_privilege('authenticated',object_id,'SELECT') END AS member_can_read,
 CASE WHEN object_id IS NULL THEN NULL ELSE has_table_privilege('service_role',object_id,'SELECT') END AS service_can_read
 FROM inspected
)
SELECT
 'D09_MARKET_TUTOR_INSTALLED_CONTRACT_READ_ONLY' AS diagnostic,
 coalesce((SELECT jsonb_agg(jsonb_build_object(
  'table',rel,'required',required,'installed',object_id IS NOT NULL,
  'rls_enabled',rls_enabled,
  'anon_select',anon_can_read,'authenticated_select',member_can_read,
  'service_select',service_can_read
 ) ORDER BY rel) FROM role_access),'[]'::jsonb) AS tables,
 (to_regprocedure('public.gu_v014102_save_member_tutor_exchange(uuid,uuid,text,text,text,text,text,jsonb)') IS NOT NULL)
  AS history_save_rpc_installed,
 (to_regprocedure('public.gu_v014103_reserve_ai_request(uuid,uuid,integer,integer,integer)') IS NOT NULL)
  AS ai_budget_rpc_installed,
 (to_regprocedure('public.gu_v014107_take_tutor_request(uuid)') IS NOT NULL)
  AS tutor_rate_rpc_installed,
 (to_regprocedure('public.gu_v014149_create_tutor_conversation(uuid,text)') IS NOT NULL)
  AS conversation_create_rpc_installed,
 EXISTS(
  SELECT 1 FROM information_schema.columns
  WHERE table_schema='public' AND table_name='gu_member_tutor_exchanges_v014102'
    AND column_name='conversation_id'
 ) AS conversation_link_column_installed,
 EXISTS(
  SELECT 1 FROM information_schema.columns
  WHERE table_schema='public' AND table_name='gu_member_tutor_exchanges_v014102'
    AND column_name='feedback'
 ) AS tutor_feedback_column_installed,
 'DATABASE_STRUCTURE_ONLY_NOT_RUNTIME_ACCEPTANCE' AS evidence_scope;
