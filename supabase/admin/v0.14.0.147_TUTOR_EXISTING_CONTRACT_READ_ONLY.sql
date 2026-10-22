-- Deployment 07/08 v0.14.0.147 — existing Tutor schema and privilege diagnostic.
-- READ ONLY. No migration, grants, RPC execution, data writes or service keys.
-- Apply through existing Supabase SQL Editor only if Owner wants DB evidence.
WITH expected(rel,required) AS (
 VALUES
 ('public.gu_member_tutor_exchanges_v014102',true),
 ('public.gu_ai_service_requests_v014103',true),
 ('public.gu_tutor_rate_bucket_v014107',false)
),
tables AS (
 SELECT e.rel,e.required,to_regclass(e.rel) AS oid
 FROM expected e
),
columns AS (
 SELECT
   EXISTS(SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='gu_member_tutor_exchanges_v014102'
    AND column_name='feedback') AS feedback_available,
   EXISTS(SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='gu_member_tutor_exchanges_v014102'
    AND column_name='feedback_note') AS feedback_note_available,
   EXISTS(SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='gu_member_tutor_exchanges_v014102'
    AND column_name='feedback_at') AS feedback_time_available
)
SELECT 'D07_EXISTING_TUTOR_SCHEMA_AND_ACL' AS diagnostic,
 jsonb_agg(jsonb_build_object(
  'object',t.rel,
  'required',t.required,
  'installed',t.oid IS NOT NULL,
  'rls',CASE WHEN t.oid IS NULL THEN NULL ELSE (SELECT c.relrowsecurity FROM pg_class c WHERE c.oid=t.oid) END,
  'anon_select',CASE WHEN t.oid IS NULL THEN NULL ELSE has_table_privilege('anon',t.oid,'SELECT') END,
  'authenticated_select',CASE WHEN t.oid IS NULL THEN NULL ELSE has_table_privilege('authenticated',t.oid,'SELECT') END,
  'service_select',CASE WHEN t.oid IS NULL THEN NULL ELSE has_table_privilege('service_role',t.oid,'SELECT') END
 ) ORDER BY t.rel) AS tables,
 (SELECT to_regprocedure('public.gu_v014102_save_member_tutor_exchange(uuid,uuid,text,text,text,text,text,text[])') IS NOT NULL) AS v102_save_rpc_signature_candidate,
 (SELECT to_regprocedure('public.gu_v014103_reserve_ai_request(uuid,uuid,integer,integer,integer)') IS NOT NULL) AS v103_meter_rpc_signature_candidate,
 (SELECT to_regprocedure('public.gu_v014107_take_tutor_request(uuid)') IS NOT NULL) AS v107_throttle_rpc_installed,
 (SELECT jsonb_build_object('feedback',feedback_available,'feedback_note',feedback_note_available,'feedback_at',feedback_time_available) FROM columns) AS optional_feedback_columns,
 'STRUCTURE_AND_GRANTS_ONLY_NOT_MEMBER_E2E_OR_PAID_PROVIDER_ACCEPTANCE' AS evidence_scope
FROM tables t;
-- Function signature candidates may be false when actual installed argument
-- names/types differ: inspect pg_proc for independent confirmation before edits.
