-- 2026-10-26 | Read-only Gate 0 / Gate 1 grading release postflight.
-- Never returns any private answer, grading prompt, member data or token.
BEGIN READ ONLY;
SELECT 'canonical_labs' AS metric,count(*)::bigint AS value FROM public.platform_labs WHERE active=true
UNION ALL SELECT 'reviewed_rubric_versions',count(*) FROM public.lab_training_sets_v014 WHERE review_state='reviewed'
UNION ALL SELECT 'draft_rubric_versions',count(*) FROM public.lab_training_sets_v014 WHERE review_state='draft'
UNION ALL SELECT 'completed_member_attempts',count(*) FROM public.lab_training_attempts_v014 WHERE completed_at IS NOT NULL
UNION ALL SELECT 'approved_knowledge_mappings',count(*) FROM public.gu_lab_competency_knowledge_map_v014105 WHERE review_state='approved'
UNION ALL SELECT 'competency_evidence_rows',count(*) FROM public.competency_evidence;
SELECT p.proname,p.prosecdef AS security_definer,
 has_function_privilege('anon',p.oid,'EXECUTE') AS anonymous_execute,
 has_function_privilege('authenticated',p.oid,'EXECUTE') AS member_execute,
 has_function_privilege('service_role',p.oid,'EXECUTE') AS service_execute,
 position('creditFraction' IN pg_get_functiondef(p.oid))>0 AS supports_partial_credit,
 position('criticalOnWrong' IN pg_get_functiondef(p.oid))>0 AS supports_critical_error,
 position('critical_error_unresolved' IN pg_get_functiondef(p.oid))>0 AS blocks_critical_knowledge_evidence,
 position('assessment_mode_required' IN pg_get_functiondef(p.oid))>0 AS assessment_gate
FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
WHERE n.nspname='public' AND p.proname IN
 ('v014_training_answer','gu_v014105_sync_reviewed_knowledge','gu_v014105_sync_member_reviewed_knowledge')
ORDER BY p.proname;
WITH b01(lab_id) AS (VALUES
('F1-C02-L01'),('F1-C02-L02'),('F1-C04-L01'),('F1-C06-L01'),('F1-C07-L01'),
('F1-C07-L02'),('F1-C08-L01'),('F1-C08-L02'),('F1-C08-L03'),('F1-C09-L01'),
('F1-C10-L01'),('F1-C10-L02'),('F1-C12-L01'),('F1-C13-L01'),('F1-C13-L02'),
('F2-C01-L01'),('F2-C02-L01'),('F2-C02-L02'),('F2-C02-L03'),('F2-C03-L01'))
SELECT b.lab_id,s.version,s.review_state,
 jsonb_array_length(s.questions) AS question_count,
 (SELECT count(*) FROM jsonb_array_elements(s.questions) q WHERE s.answer_key ? (q->>'id')) AS protected_key_count,
 (SELECT count(DISTINCT q->>'id') FROM jsonb_array_elements(s.questions) q) AS distinct_ids
FROM b01 b LEFT JOIN public.lab_training_sets_v014 s ON s.lab_id=b.lab_id AND s.version=97 ORDER BY b.lab_id;
COMMIT;