-- v121: actual trigger, owner-scoped weekly quota RPC and concurrent-safe
-- monotonic usage counters in isolated PG16. NEVER in production.
\set ON_ERROR_STOP on
DO $v121$
DECLARE
 a uuid:='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
 b uuid:='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
 i integer;
 j bigint;
 k bigint;
 z jsonb;
 c integer;
BEGIN
 PERFORM set_config('app.paid_journal','no',true);
 PERFORM set_config('app.paid_simulator','no',true);
 IF (SELECT name FROM public.platform_plans WHERE plan_code='FULL_MONTHLY')<>'Full Platform — Monthly' OR
   (SELECT price_cents FROM public.platform_plans WHERE plan_code='FULL_MONTHLY')<>6999 OR
   (SELECT metadata->>'journal_limit_week' FROM public.platform_plans WHERE plan_code='FREE')<>'15' THEN
  RAISE EXCEPTION 'Free and Monthly catalog contract not updated';
 END IF;
 -- 10 free CSV saves in 15 Journal creations, then 5 regular records.
 FOR i IN 1..15 LOOP
  INSERT INTO public.decision_journal(user_id,ticker,trade_date,journal_type,status,simulator_source)
   VALUES(a,'TEST',CURRENT_DATE,'paper','draft',
    CASE WHEN i<=10 THEN 'csv_upload' ELSE NULL END);
 END LOOP;
 SELECT used_count INTO c FROM public.gu_free_weekly_usage_v014121
 WHERE user_id=a AND usage_kind='journal';
 IF c<>15 OR (SELECT used_count FROM public.gu_free_weekly_usage_v014121
 WHERE user_id=a AND usage_kind='simulator_save')<>10 THEN
   RAISE EXCEPTION 'First member journal / simulator usage must equal 15 / 10';
 END IF;
 BEGIN
  INSERT INTO public.decision_journal(user_id,ticker,trade_date,journal_type,status)
   VALUES(a,'TEST',CURRENT_DATE,'paper','draft');
  RAISE EXCEPTION 'FAIL: sixteenth Journal record permitted';
 EXCEPTION WHEN others THEN
  IF SQLERRM='FAIL: sixteenth Journal record permitted' THEN RAISE; END IF;
  IF SQLERRM<>'FREE_WEEKLY_JOURNAL_LIMIT_REACHED' THEN RAISE; END IF;
 END;
 -- Deleting a Journal record does not refund a consumed save.
 SELECT id INTO j FROM public.decision_journal WHERE user_id=a ORDER BY id DESC LIMIT 1;
 DELETE FROM public.decision_journal WHERE id=j;
 BEGIN
  INSERT INTO public.decision_journal(user_id,ticker,trade_date,journal_type,status)
  VALUES(a,'TEST',CURRENT_DATE,'paper','draft');
  RAISE EXCEPTION 'FAIL: delete and recreate evaded weekly limit';
 EXCEPTION WHEN others THEN
  IF SQLERRM='FAIL: delete and recreate evaded weekly limit' THEN RAISE;END IF;
  IF SQLERRM<>'FREE_WEEKLY_JOURNAL_LIMIT_REACHED' THEN RAISE;END IF;
 END;
 -- Test simulator-source update path cannot bypass save quota.
 FOR i IN 1..11 LOOP
  INSERT INTO public.decision_journal(user_id,ticker,trade_date,journal_type,status)
   VALUES(b,'TEST',CURRENT_DATE,'paper','draft') RETURNING id INTO j;
  IF i<=10 THEN
   UPDATE public.decision_journal SET simulator_source='csv_upload' WHERE id=j;
  ELSE
   k:=j;
  END IF;
 END LOOP;
 BEGIN
  UPDATE public.decision_journal SET simulator_source='csv_upload' WHERE id=k;
  RAISE EXCEPTION 'FAIL: 11th simulator save allowed via update';
 EXCEPTION WHEN others THEN
  IF SQLERRM='FAIL: 11th simulator save allowed via update' THEN RAISE;END IF;
  IF SQLERRM<>'FREE_WEEKLY_SIMULATOR_LIMIT_REACHED' THEN RAISE;END IF;
 END;
 PERFORM set_config('app.member',b::text,true);
 z:=public.gu_v014121_my_free_week_usage();
 IF (z->>'journalUsed')::int<>11 OR (z->>'journalLimit')::int<>15 OR
   (z->>'simulatorSavesUsed')::int<>10 OR
   (z->>'simulatorSaveLimit')::int<>10 OR
   (z->>'journalUnlimited')::boolean IS DISTINCT FROM false THEN
  RAISE EXCEPTION 'Member weekly usage RPC values do not match durable counters: %',z;
 END IF;
 PERFORM set_config('app.member',a::text,true);
 z:=public.gu_v014121_my_free_week_usage();
 IF (z->>'journalUsed')::int<>15 THEN
  RAISE EXCEPTION 'Deleted weekly use must not be refunded';
 END IF;
 -- Paid Journal may create unlimited Journal records while an unpaid
 -- Simulator save remains independently limited.
 PERFORM set_config('app.paid_journal','yes',true);
 PERFORM set_config('app.member',a::text,true);
 FOR i IN 1..2 LOOP
  INSERT INTO public.decision_journal(user_id,ticker,trade_date,journal_type,status)
  VALUES(a,'TEST',CURRENT_DATE,'paper','draft');
 END LOOP;
 z:=public.gu_v014121_my_free_week_usage();
 IF (z->>'journalUnlimited')::boolean IS DISTINCT FROM true THEN
  RAISE EXCEPTION 'Paid Journal entitlement did not exempt free cap';
 END IF;
 PERFORM set_config('app.paid_simulator','yes',true);
 INSERT INTO public.decision_journal(user_id,ticker,trade_date,journal_type,status,simulator_source)
 VALUES(a,'TEST',CURRENT_DATE,'paper','draft','csv_upload');
 RAISE NOTICE 'PASS v121: 15 Journal/week, 10 saved simulator/week, update bypass denial, deletion persistence, per-tool paid exemptions and owner meter';
END $v121$;
-- Role tests are read only (still ONLY run disposable).
DO $acl$
BEGIN
 IF has_table_privilege('authenticated','public.gu_free_weekly_usage_v014121','SELECT') OR
    has_table_privilege('authenticated','public.gu_free_weekly_usage_v014121','UPDATE') OR
    has_function_privilege('authenticated','public.gu_v014121_take_free_week_slot(uuid,text,integer)','EXECUTE') OR
    has_function_privilege('anon','public.gu_v014121_my_free_week_usage()','EXECUTE') THEN
  RAISE EXCEPTION 'Free weekly usage grants expose counters or privileged writes';
 END IF;
END $acl$;
