-- Actual PostgreSQL acceptance in a disposable database.
-- Verifies the same mutex, bucket ledger, idempotency and audit as production.
DO $$
DECLARE
 owner_id uuid:='22222222-2222-4222-8222-222222222222';
 member_id uuid:='11111111-1111-4111-8111-111111111111';
 req uuid:='abababab-abab-4bab-8bab-abababababab';
 reason text:='Owner requested nonexpiring QA Sparks for an isolated disposable account';
 res jsonb; qty int;
BEGIN
 IF has_function_privilege('anon',
  'public.groundup_owner_self_sparks_add(uuid,integer,text,uuid)','EXECUTE')
 OR has_function_privilege('authenticated',
  'public.groundup_owner_self_sparks_add(uuid,integer,text,uuid)','EXECUTE')
 THEN RAISE EXCEPTION 'Public could execute Owner self credit RPC';END IF;
 res:=public.groundup_owner_self_sparks_add(member_id,7,reason,req);
 IF res->>'ok'<>'false' THEN RAISE EXCEPTION 'Non-Owner received free credits';END IF;
 res:=public.groundup_owner_self_sparks_add(owner_id,7,reason,req);
 IF res->>'ok'<>'true' OR res->>'alreadyApplied'<>'false'
 OR (res->'balance'->>'available')::int<>7
 THEN RAISE EXCEPTION 'Owner self credit failed: %',res;END IF;
 SELECT count(*) INTO qty FROM public.groundup_question_pass_buckets
 WHERE user_id=owner_id AND source='manual' AND remaining_credits=7
  AND expires_at IS NULL AND billing_period_ends_at IS NULL;
 IF qty<>1 THEN RAISE EXCEPTION 'Nonexpiring manual bucket missing';END IF;
 res:=public.groundup_owner_self_sparks_add(owner_id,7,reason,req);
 IF res->>'alreadyApplied'<>'true'
 OR (res->'balance'->>'available')::int<>7
 THEN RAISE EXCEPTION 'Duplicate request credited twice: %',res;END IF;
 res:=public.groundup_owner_self_sparks_add(owner_id,9,reason,req);
 IF res->>'ok'<>'false' THEN RAISE EXCEPTION 'Same request ID reused with different amount';END IF;
 res:=public.groundup_owner_self_sparks_add(owner_id,10001,reason,gen_random_uuid());
 IF res->>'ok'<>'false' THEN RAISE EXCEPTION 'Exceeded per-credit limit';END IF;
 UPDATE public.admin_user_roles SET expires_at=now()-interval '1 minute' WHERE user_id=owner_id;
 res:=public.groundup_owner_self_sparks_add(owner_id,1,reason,gen_random_uuid());
 IF res->>'ok'<>'false' THEN RAISE EXCEPTION 'Expired role credited wallet';END IF;
 UPDATE public.admin_user_roles SET expires_at=NULL WHERE user_id=owner_id;
 INSERT INTO public.admin_user_flags(user_id,status) VALUES(owner_id,'restricted');
 res:=public.groundup_owner_self_sparks_add(owner_id,1,reason,gen_random_uuid());
 IF res->>'ok'<>'false' THEN RAISE EXCEPTION 'Restricted Owner credited wallet';END IF;
 SELECT count(*) INTO qty FROM public.groundup_question_pass_adjustments
 WHERE actor_user_id=owner_id AND user_id=owner_id AND operation='add';
 IF qty<>1 THEN RAISE EXCEPTION 'Exactly one self adjustment expected, got %',qty;END IF;
 SELECT count(*) INTO qty FROM public.admin_audit_log
 WHERE action='learning.lantern_sparks.owner_self_add';
 IF qty<>1 THEN RAISE EXCEPTION 'Exactly one self-credit audit expected, got %',qty;END IF;
 RAISE NOTICE 'PASS Owner self-credit: restricted RPC, 7 manual nonexpiring, once-only, audit, expired/restricted denial, limit';
END $$;
