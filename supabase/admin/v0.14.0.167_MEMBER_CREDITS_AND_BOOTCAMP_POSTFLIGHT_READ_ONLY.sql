-- v0.14.0.167: READ-ONLY production postflight. No member data or balances returned.
-- Execute as Owner in Supabase SQL Editor after source deployment.
-- Does NOT grant any credits, activate payment, alter policies or set pricing.
WITH dependencies(label, relation_name) AS (
 VALUES
 ('Boot Camp progress', 'public.gu_bootcamp_progress_v014144'),
 ('Crownlight credit buckets', 'public.groundup_question_pass_buckets'),
 ('Crownlight verified spends', 'public.groundup_question_pass_spends'),
 ('Crownlight Owner adjustments', 'public.groundup_question_pass_adjustments')
)
SELECT label, relation_name,
 CASE WHEN to_regclass(relation_name) IS NOT NULL THEN 'PRESENT' ELSE 'MISSING' END AS status
FROM dependencies ORDER BY label;
WITH functions(label, signature) AS (
 VALUES
 ('Boot Camp save', 'public.gu_bootcamp_save_progress_v014144'),
 ('Crownlight balance', 'public.groundup_question_pass_summary'),
 ('Crownlight atomic spend', 'public.groundup_question_pass_spend'),
 ('Crownlight Owner adjust', 'public.groundup_question_pass_adjust')
)
SELECT f.label, f.signature,
 CASE WHEN EXISTS (
 SELECT 1 FROM pg_proc p JOIN pg_namespace n ON p.pronamespace=n.oid
 WHERE n.nspname='public' AND p.proname=split_part(f.signature,'.',2)
 ) THEN 'PRESENT' ELSE 'MISSING' END AS status
FROM functions f ORDER BY f.label;
SELECT tablename, rowsecurity AS rls_enabled
FROM pg_tables
WHERE schemaname='public'
AND tablename IN ('gu_bootcamp_progress_v014144','groundup_question_pass_buckets',
'groundup_question_pass_spends','groundup_question_pass_adjustments')
ORDER BY tablename;
SELECT schemaname,tablename,policyname,roles,cmd
FROM pg_policies WHERE schemaname='public' AND tablename IN
('gu_bootcamp_progress_v014144','groundup_question_pass_buckets',
'groundup_question_pass_spends','groundup_question_pass_adjustments')
ORDER BY tablename,policyname;
-- For deeper authorization verification use authenticated test accounts and
-- the existing secure member API. SQL object presence is NOT API acceptance.
