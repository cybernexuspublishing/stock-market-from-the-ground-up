-- Real v33 stored RPC against isolated RLS-protected PostgreSQL 16.
\set ON_ERROR_STOP on
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',false);
-- Construct one well-formed ungraded checkpoint in SQL, never client scoring.
CREATE TEMP TABLE checkpoints(mode text,stage int, prediction text, locked bool, practice text, practice_resolved bool, review text, reviewed bool, transfer text, transferred bool);
INSERT INTO checkpoints VALUES
('guided',2,'',false,'',false,'',false,'',false),
('practice',1,'',false,'',false,'',false,'',false);
CREATE TEMP VIEW sample AS SELECT mode,stage,
 jsonb_build_object(
  'version',1,'mode',mode,'stage',stage,'observations','Private fictional observation',
  'prediction',prediction,'predictionLocked',locked,
  'practice',practice,'practiceCount',0,'practiceResolved',practice_resolved,'practiceAssisted',false,
  'transfer',transfer,'transferCount',0,'transferResolved',transferred,
  'selfReview',reviewed,'reflection',review,'learnerReplies','[]'::jsonb
 ) checkpoint FROM checkpoints;
SELECT public.gu_v33_save_lab_journey(
 'F2-C06-L01',(SELECT checkpoint FROM sample WHERE mode='guided'),0);
DO $verify1$ BEGIN
 IF (SELECT responses->'learning_journey_v33'->>'rev' FROM public.site_lab_progress
     WHERE lab_id='F2-C06-L01')<>'1'
 THEN RAISE EXCEPTION 'Guided first save missing'; END IF;
END $verify1$;
SELECT public.gu_v33_save_lab_journey(
 'F2-C06-L01',(SELECT checkpoint FROM sample WHERE mode='practice'),1);
DO $verify2$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.site_lab_progress
  WHERE lab_id='F2-C06-L01'
   AND responses->'learning_journey_v33'->'modes'->'guided'->>'stage'='2'
   AND responses->'learning_journey_v33'->'modes'->'practice'->>'stage'='1'
   AND responses->'learning_journey_v33'->>'rev'='2')
 THEN RAISE EXCEPTION 'Guided and Practice not independently retained'; END IF;
END $verify2$;
DO $stale$ BEGIN
 BEGIN
  PERFORM public.gu_v33_save_lab_journey(
   'F2-C06-L01',(SELECT checkpoint FROM sample WHERE mode='guided'),1);
  RAISE EXCEPTION 'Stale revision silently accepted';
 EXCEPTION WHEN serialization_failure THEN NULL; END;
END $stale$;
-- Server rejects impossible stage-8 assertions, even if browser forges flags.
DO $invalid$ BEGIN
 BEGIN
  PERFORM public.gu_v33_save_lab_journey(
   'F2-C06-L01',
   (SELECT checkpoint || '{"stage":8,"predictionLocked":true,"practiceResolved":true,
   "selfReview":true,"transferResolved":true}'::jsonb FROM sample WHERE mode='guided'),2);
  RAISE EXCEPTION 'Ungraded stage eight without evidence was accepted';
 EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
END $invalid$;
-- RLS: another authenticated member cannot see the first member's responses.
SELECT set_config('request.jwt.claim.sub','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',false);
DO $isolation$ BEGIN
 IF EXISTS(SELECT 1 FROM public.site_lab_progress WHERE lab_id='F2-C06-L01')
 THEN RAISE EXCEPTION 'Private study data visible to another member'; END IF;
END $isolation$;
RESET ROLE;
-- Preserve an old flat v1 checkpoint when the member first uses Practice.
INSERT INTO public.site_lab_progress(user_id,lab_id,status,responses,updated_at)
VALUES('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','DT-C06-L03','in_progress',
 jsonb_build_object('learning_journey_v33',
  (SELECT checkpoint || '{"rev":9}'::jsonb FROM sample WHERE mode='guided')),now());
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',false);
SELECT public.gu_v33_save_lab_journey(
 'DT-C06-L03',(SELECT checkpoint FROM sample WHERE mode='practice'),9);
DO $legacy$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.site_lab_progress
 WHERE lab_id='DT-C06-L03'
  AND responses->'learning_journey_v33'->>'rev'='10'
  AND responses->'learning_journey_v33'->'modes'->'guided'->>'stage'='2'
  AND responses->'learning_journey_v33'->'modes'->'practice'->>'stage'='1')
 THEN RAISE EXCEPTION 'Legacy guided draft discarded during migration'; END IF;
END $legacy$;
-- A previous page's full JSON upsert must not remove a newer dual-mode record.
UPDATE public.site_lab_progress SET responses='{"legacy_site":true}'::jsonb
 WHERE lab_id='DT-C06-L03';
DO $legacy_update$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.site_lab_progress
 WHERE lab_id='DT-C06-L03'
  AND responses->'learning_journey_v33'->>'rev'='10'
  AND responses->>'legacy_site'='true')
 THEN RAISE EXCEPTION 'Legacy UI full overwrite destroyed v3.3 state'; END IF;
END $legacy_update$;
RESET ROLE;
DO $roles$ BEGIN
 IF has_function_privilege('anon',
   'public.gu_v33_save_lab_journey(text,jsonb,bigint)','EXECUTE')
 OR NOT has_function_privilege('authenticated',
   'public.gu_v33_save_lab_journey(text,jsonb,bigint)','EXECUTE')
 THEN RAISE EXCEPTION 'Incorrect RPC EXECUTE policy'; END IF;
 RAISE NOTICE 'PASS guided/practice isolation, legacy upgrade, strict CAS, stage integrity, own-row RLS, and legacy-update guard';
END $roles$;
