-- 2026-10-26 | Supabase B01 rubric/lesson approval migration drift audit.
-- Explicitly read-only. Do not re-apply v0.14.0.280/281 merely to make history agree.
-- Output contains no member identifiers, answers, lesson text, or grading rubrics.
BEGIN READ ONLY;
WITH checks(component,table_name,trigger_name,function_name,history_pattern) AS (
 VALUES
 ('B01 rubric review','lab_training_sets_v014','gu_v014280_rubric_review_audit','gu_v014280_audit_lab_rubric_review','%280%b01%'),
 ('B01 lesson review','lab_instruction_v014','gu_v014281_lesson_review_audit','gu_v014281_audit_lab_instruction_review','%281%b01%')
)
SELECT component,
 (SELECT count(*) FROM pg_trigger t WHERE t.tgrelid=to_regclass('public.'||table_name)
    AND t.tgname=trigger_name AND t.tgenabled='O')=1 AS active_trigger,
 (SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='public' AND p.proname=function_name AND p.prosecdef
      AND NOT has_function_privilege('anon',p.oid,'EXECUTE')
      AND NOT has_function_privilege('authenticated',p.oid,'EXECUTE'))=1 AS protected_definer,
 (SELECT count(*) FROM supabase_migrations.schema_migrations m WHERE m.name LIKE history_pattern)>0 AS migration_recorded
FROM checks ORDER BY component;
SELECT (SELECT count(*) FROM public.lab_training_sets_v014 WHERE review_state='reviewed') AS reviewed_rubric_sets,
 (SELECT count(*) FROM public.lab_instruction_v014 WHERE source_status LIKE 'editorially_reviewed_%') AS reviewed_lessons,
 (SELECT count(*) FROM public.lab_training_sets_v014) AS total_rubric_sets,
 (SELECT count(*) FROM public.lab_instruction_v014) AS total_private_lessons;
COMMIT;
