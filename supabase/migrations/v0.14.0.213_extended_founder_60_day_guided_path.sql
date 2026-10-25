-- v0.14.0.213 Extended Founder 60-day guided competency learning route.
-- Reuses exactly the 30 canonical competencies. It creates no additional
-- competencies, unreviewed Lab references, study-only mastery or trading advice.
CREATE OR REPLACE FUNCTION public.gu_founder_extended_guided_path_v014213()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path=pg_catalog,pg_temp AS $path$
DECLARE uid uuid:=auth.uid();path_json jsonb;count_defs integer;
BEGIN
 IF uid IS NULL OR NOT public.gu_founder_commons_access_v014174('council')
 THEN RETURN jsonb_build_object('ok',false,'error','EXTENDED_FOUNDER_REQUIRED');END IF;
 SELECT count(*) INTO count_defs FROM public.competency_definitions WHERE active=true;
 IF count_defs<>30 THEN RETURN jsonb_build_object('ok',false,'error','CURRICULUM_VERSION_MISMATCH');END IF;
 WITH competencies AS (
 SELECT c.competency_code,c.name,c.description,c.category,c.sort_order,c.pass_score,
   (SELECT count(*) FROM public.competency_evidence e
     WHERE e.user_id=uid AND e.competency_code=c.competency_code) AS records,
   (SELECT count(*) FROM public.competency_evidence e
     WHERE e.user_id=uid AND e.competency_code=c.competency_code
       AND e.passed=true AND e.critical_error=false) AS passing_records
 FROM public.competency_definitions c WHERE c.active=true
 ), pathway AS (
 SELECT row_number() OVER(ORDER BY c.sort_order,x.pass)::integer AS day_number,
 c.competency_code,c.name,c.category,c.description,c.records,c.passing_records,x.pass,
 CASE WHEN x.pass=1 THEN 'Learn and Experiment' ELSE 'Predict, Practice, Assess and Review' END AS stage,
 CASE WHEN x.pass=1
 THEN 'Define every term, study a completed fictional example, identify chart evidence, and ask Talia to explain unclear steps.'
 ELSE 'Make an independent decision before seeing feedback, document risk or limitations, review mistakes, and seek valid assessment evidence.'
 END AS task
 FROM competencies c CROSS JOIN generate_series(1,2) x(pass)
 )
 SELECT coalesce(jsonb_agg(jsonb_build_object(
   'day',day_number,'competencyCode',competency_code,'name',name,
   'category',category,'description',description,'stage',stage,'task',task,
   'evidenceCount',records,'passingEvidenceCount',passing_records,
   'assessmentStatus',CASE WHEN records=0 THEN 'Not Yet Assessed' ELSE 'Evidence Recorded; Not Automatic Mastery' END
 ) ORDER BY day_number),'[]'::jsonb)
 INTO path_json FROM pathway;
 RETURN jsonb_build_object('ok',true,'days',path_json,
 'totalDays',60,'competencies',30,
 'guidance','Educational study plan; no simulated trade or questionnaire automatically grants competency mastery.');
END $path$;
REVOKE ALL ON FUNCTION public.gu_founder_extended_guided_path_v014213() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.gu_founder_extended_guided_path_v014213() TO authenticated;
