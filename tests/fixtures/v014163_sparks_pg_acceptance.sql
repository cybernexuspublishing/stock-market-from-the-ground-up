-- Disposable database acceptance for existing v163+v164 Sparks SQL. No real identities or charges.
DO $$
DECLARE
 member uuid:='11111111-1111-4111-8111-111111111111';
 owner_id uuid:='22222222-2222-4222-8222-222222222222';
 attempt uuid:='33333333-3333-4333-8333-333333333333';
 res jsonb;
 qty integer;
 reason text:='Controlled, isolated ledger integration acceptance test';
BEGIN
 INSERT INTO public.groundup_question_pass_buckets
 (user_id,source,origin_key,initial_credits,remaining_credits,billing_period_ends_at,expires_at)
 VALUES (member,'included','qa-included-earlier',1,1,now()+interval '1 day',now()+interval '61 days'),
        (member,'included','qa-included-later',1,1,now()+interval '5 days',now()+interval '65 days');
 INSERT INTO public.groundup_question_pass_buckets
 (user_id,source,origin_key,initial_credits,remaining_credits)
 VALUES (member,'purchased','qa-paid-purchased',2,2);
 IF (public.groundup_question_pass_summary(member)->>'available')::int<>4 THEN
   RAISE EXCEPTION 'Expected initial balance 4'; END IF;
 IF has_function_privilege('anon',
   'public.groundup_question_pass_spend(uuid,uuid,text,text,text,uuid)','EXECUTE')
 OR has_function_privilege('authenticated',
   'public.groundup_question_pass_spend(uuid,uuid,text,text,text,uuid)','EXECUTE') THEN
   RAISE EXCEPTION 'Non-service role could execute protected spender'; END IF;
 res:=public.groundup_question_pass_spend(member,attempt,'F2-C07-L01','body','reveal',
   '44444444-4444-4444-8444-444444444444');
 IF res->>'ok'<>'true' OR res->>'alreadyUsed'<>'false' THEN
   RAISE EXCEPTION 'First spend failed: %',res;END IF;
 IF (SELECT remaining_credits FROM public.groundup_question_pass_buckets
   WHERE origin_key='qa-included-earlier')<>0 THEN
   RAISE EXCEPTION 'Earliest expiring included credit must spend first';END IF;
 res:=public.groundup_question_pass_spend(member,attempt,'F2-C07-L01','body','reveal',
   '44444444-4444-4444-8444-444444444444');
 IF res->>'alreadyUsed'<>'true' THEN RAISE EXCEPTION 'Idempotent spend retry failed'; END IF;
 SELECT count(*) INTO qty FROM public.groundup_question_pass_spends WHERE user_id=member;
 IF qty<>1 THEN RAISE EXCEPTION 'Duplicate spend created'; END IF;
 res:=public.groundup_question_pass_spend(member,attempt,'F2-C07-L01','body','skip',
   '55555555-5555-4555-8555-555555555555');
 IF res->>'ok'<>'false' THEN RAISE EXCEPTION 'Conflicting action accepted'; END IF;
 res:=public.groundup_question_pass_spend(member,attempt,'F2-C07-L01','range','skip',
   '66666666-6666-4666-8666-666666666666');
 IF res->>'ok'<>'true' THEN RAISE EXCEPTION 'Second spend failed';END IF;
 IF (SELECT remaining_credits FROM public.groundup_question_pass_buckets
   WHERE origin_key='qa-included-later')<>0 THEN
   RAISE EXCEPTION 'Later included credit must precede purchased credit'; END IF;
 res:=public.groundup_question_pass_spend(member,attempt,'F2-C07-L01','percent','reveal',
   '77777777-7777-4777-8777-777777777777');
 IF res->>'ok'<>'true' OR (SELECT remaining_credits FROM public.groundup_question_pass_buckets
   WHERE origin_key='qa-paid-purchased')<>1 THEN
   RAISE EXCEPTION 'Purchased-credit fallback failed';END IF;
 res:=public.groundup_question_pass_adjust(owner_id,member,'add',3,reason,
   '88888888-8888-4888-8888-888888888888');
 IF res->>'ok'<>'true' OR res->>'alreadyApplied'<>'false' OR
   (res->'balance'->>'available')::int<>4 THEN
   RAISE EXCEPTION 'Audited addition failed: %',res;END IF;
 res:=public.groundup_question_pass_adjust(owner_id,member,'add',3,reason,
   '88888888-8888-4888-8888-888888888888');
 IF res->>'alreadyApplied'<>'true' OR (res->'balance'->>'available')::int<>4 THEN
   RAISE EXCEPTION 'Duplicate adjustment incorrectly changed balance';END IF;
 res:=public.groundup_question_pass_adjust(owner_id,member,'remove',2,reason,
   '99999999-9999-4999-8999-999999999999');
 IF res->>'ok'<>'true' OR (res->'balance'->>'available')::int<>2 THEN
   RAISE EXCEPTION 'Audited removal failed: %',res;END IF;
 SELECT count(*) INTO qty FROM public.admin_audit_log WHERE actor_user_id=owner_id;
 IF qty<>2 THEN RAISE EXCEPTION 'Expected two audited changes, got %',qty; END IF;
 res:=public.groundup_question_pass_adjust(owner_id,member,'remove',200,reason,
   'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
 IF res->>'ok'<>'false' OR
   (public.groundup_question_pass_summary(member)->>'available')::int<>2 THEN
   RAISE EXCEPTION 'Invalid excessive removal must fail without mutation';END IF;
 IF (SELECT expires_at FROM public.groundup_question_pass_buckets
   WHERE origin_key='qa-paid-purchased') IS NOT NULL THEN
   RAISE EXCEPTION 'Purchased credits unexpectedly expire'; END IF;
 RAISE NOTICE 'PASS: FIFO included, purchased lifetime, idempotent spend, corrections, audit and rejection';
END $$;
