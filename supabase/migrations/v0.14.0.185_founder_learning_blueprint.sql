-- v0.14.0.185 — Founder Learning Blueprint built from 30 canonical competencies
-- and the signed-in user's actual evidence; no fabricated mastery or unreviewed Lab recommendations.
CREATE OR REPLACE FUNCTION public.gu_founder_learning_blueprint_v014185()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $blue$
DECLARE uid uuid:=auth.uid(); extended boolean; max_count integer; result jsonb;
BEGIN
 IF uid IS NULL OR NOT public.gu_founder_commons_access_v014174('shared')
 THEN RETURN jsonb_build_object('ok',false,'error','FOUNDER_ACCESS_REQUIRED');END IF;
 extended:=public.gu_founder_commons_access_v014174('council');
 max_count:=CASE WHEN extended THEN 6 ELSE 3 END;
 WITH evidence AS (
  SELECT c.competency_code,c.name,c.category,c.description,c.sort_order,
   (SELECT count(*) FROM public.competency_evidence e WHERE e.user_id=uid AND e.competency_code=c.competency_code) AS evidence_total,
   (SELECT count(*) FROM public.competency_evidence e WHERE e.user_id=uid AND e.competency_code=c.competency_code AND e.passed IS TRUE AND e.critical_error IS DISTINCT FROM true) AS passed_count
  FROM public.competency_definitions c WHERE c.active=true
 ), prioritized AS (
  SELECT competency_code,name,category,description,evidence_total,passed_count,sort_order
  FROM evidence
  ORDER BY
   CASE WHEN evidence_total=0 THEN 0 WHEN passed_count=0 THEN 1 ELSE 2 END,
   CASE WHEN evidence_total=0 THEN 0 ELSE passed_count::numeric/evidence_total END ASC,
   sort_order ASC LIMIT max_count
 )
 SELECT coalesce(jsonb_agg(jsonb_build_object(
  'competencyCode',competency_code,'name',name,'category',category,
  'description',coalesce(description,''),'evidenceCount',evidence_total,
  'passedCount',passed_count,
  'evidenceStatus',CASE WHEN evidence_total=0 THEN 'not_yet_assessed' ELSE 'assessment_evidence_recorded' END)
 ORDER BY sort_order),'[]'::jsonb) INTO result FROM prioritized;
 RETURN jsonb_build_object('ok',true,'enhanced',extended,'recommended',result,
 'limitations','These are evidence-priority suggestions, not competency mastery ratings or trade recommendations.');
END $blue$;
REVOKE ALL ON FUNCTION public.gu_founder_learning_blueprint_v014185() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.gu_founder_learning_blueprint_v014185() TO authenticated;
