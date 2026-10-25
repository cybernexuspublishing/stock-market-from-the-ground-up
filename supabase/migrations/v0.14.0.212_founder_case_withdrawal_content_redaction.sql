-- v0.14.0.212: Fix founder case-study withdrawal against 100-character
-- minimum scenario length; securely redact original member content.
CREATE OR REPLACE FUNCTION public.gu_founder_withdraw_case_v014190(p_id uuid)
RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path=pg_catalog,pg_temp AS $withdraw$
BEGIN
 IF auth.uid() IS NULL OR p_id IS NULL
 THEN RETURN jsonb_build_object('ok',false,'error','AUTH_REQUIRED');END IF;
 UPDATE public.gu_founder_case_submissions_v014190
 SET review_state='withdrawn',
 title='Withdrawn learning case proposal',
 scenario=repeat('Withdrawn by member. Original educational proposal has been removed from editorial review and may not be published. ',2),
 opted_in_attribution=false,staff_reply=NULL
 WHERE id=p_id AND user_id=auth.uid()
 AND review_state IN('submitted','under_review');
 IF NOT FOUND THEN RETURN jsonb_build_object('ok',false,'error','NOT_WITHDRAWABLE');END IF;
 RETURN jsonb_build_object('ok',true,'withdrawn',true,'contentRedacted',true);
END $withdraw$;
REVOKE ALL ON FUNCTION public.gu_founder_withdraw_case_v014190(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.gu_founder_withdraw_case_v014190(uuid) TO authenticated;