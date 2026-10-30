-- Prevent Stripe TEST event IDs being replayed across different QA orders/actions.
BEGIN;
DO $repair$
DECLARE d text;
DECLARE old_fragment text :=
 E'IF EXISTS(SELECT 1 FROM public.gu_mixed_qa_events_v1 WHERE event_id=p_event)\n'
 || E' THEN RETURN jsonb_build_object(''ok'',true,''duplicate'',true,''status'',i.status);END IF;';
DECLARE replacement text :=
 E'IF EXISTS(SELECT 1 FROM public.gu_mixed_qa_events_v1 WHERE event_id=p_event AND (intent_id<>p_id OR action<>p_action))\n'
 || E' THEN RETURN jsonb_build_object(''ok'',false,''error'',''SIGNED_EVENT_REUSED_FOR_DIFFERENT_ORDER'');END IF;\n'
 || E' IF EXISTS(SELECT 1 FROM public.gu_mixed_qa_events_v1 WHERE event_id=p_event AND intent_id=p_id AND action=p_action)\n'
 || E' THEN RETURN jsonb_build_object(''ok'',true,''duplicate'',true,''status'',i.status);END IF;';
BEGIN
 SELECT pg_get_functiondef(oid) INTO d FROM pg_proc
 WHERE pronamespace='public'::regnamespace AND proname='gu_mixed_qa_reconcile_v1'
 AND pg_get_function_identity_arguments(oid)=
 'p_id uuid, p_event text, p_action text, p_session text, p_pi text, p_paid integer';
 IF d IS NULL THEN RAISE EXCEPTION 'QA reconciliation RPC absent';END IF;
 IF strpos(d,'SIGNED_EVENT_REUSED_FOR_DIFFERENT_ORDER')>0 THEN RETURN;END IF;
 IF strpos(d,old_fragment)=0 THEN RAISE EXCEPTION 'QA reconciliation source changed';END IF;
 EXECUTE replace(d,old_fragment,replacement);
END $repair$;
COMMIT;