-- Disposable acceptance fixture for GitHub CI only; NEVER execute in Supabase SQL Editor.
-- Mirror Supabase's actual service_role BYPASSRLS attribute in isolated PostgreSQL.
\set ON_ERROR_STOP on
CREATE SCHEMA IF NOT EXISTS auth;
DO $$BEGIN
 IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='anon') THEN CREATE ROLE anon NOLOGIN; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN CREATE ROLE authenticated NOLOGIN; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='service_role') THEN CREATE ROLE service_role NOLOGIN BYPASSRLS; END IF;
END $$;
CREATE TABLE auth.users(id uuid PRIMARY KEY);
INSERT INTO auth.users(id) VALUES
 ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),
 ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb');
GRANT USAGE ON SCHEMA public TO service_role,anon,authenticated;
\i supabase/migrations/v0.14.0.144_BOOTCAMP_PROGRESS_OWNER_REVIEW_REQUIRED.sql
DO $$
BEGIN
 IF has_table_privilege('authenticated','public.gu_bootcamp_progress_v014144','SELECT') OR
    has_table_privilege('anon','public.gu_bootcamp_progress_v014144','SELECT') OR
    has_function_privilege('authenticated','public.gu_bootcamp_save_progress_v014144(uuid,integer,text,text)','EXECUTE') OR
    NOT has_function_privilege('service_role','public.gu_bootcamp_save_progress_v014144(uuid,integer,text,text)','EXECUTE')
 THEN RAISE EXCEPTION 'Unauthorized SQL rights / missing service-only grant'; END IF;
END $$;
SET ROLE service_role;
SELECT public.gu_bootcamp_save_progress_v014144('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',1,'start',null,null);
SELECT public.gu_bootcamp_save_progress_v014144('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',1,'save_reflection',
 'I can distinguish a timestamped public filing from a later market observation, and neither predicts a trading result.',1);
SELECT public.gu_bootcamp_save_progress_v014144('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',1,'start',null,null);
SELECT public.gu_bootcamp_save_progress_v014144('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',1,'start',null,null);
DO $
DECLARE result jsonb;
BEGIN
 result:=public.gu_bootcamp_save_progress_v014144(
 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',1,'save_reflection',
 'My earlier record was updated in another browser tab. I must reload its current revision and reconsider the source rather than overwrite it.',1);
 IF result->>'conflict' IS DISTINCT FROM 'false' AND result->>'conflict' IS DISTINCT FROM 'true' THEN
   RAISE EXCEPTION 'Unexpected revision validation shape';
 END IF;
 IF result->>'conflict' IS DISTINCT FROM 'true' THEN
   RAISE EXCEPTION 'Stale overwrite was permitted';
 END IF;
END $;
DO $$
DECLARE count_one integer;count_two integer;record_one text;
BEGIN
 SELECT count(*) INTO count_one FROM public.gu_bootcamp_progress_v014144 WHERE user_id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
 SELECT count(*) INTO count_two FROM public.gu_bootcamp_progress_v014144 WHERE user_id='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
 SELECT status INTO record_one FROM public.gu_bootcamp_progress_v014144 WHERE user_id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' AND day_number=1;
 IF count_one<>1 OR count_two<>1 OR record_one<>'reflection_saved' THEN
   RAISE EXCEPTION 'Idempotent save or independent member state broken'; END IF;
 BEGIN
  PERFORM public.gu_bootcamp_save_progress_v014144('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',31,'start',null,null);
  RAISE EXCEPTION 'Expected day validation exception';
 EXCEPTION WHEN others THEN IF SQLERRM='Expected day validation exception' THEN RAISE; END IF; END;
END $$;
RESET ROLE;
SELECT 'PASS: private SQL atomic member bootcamp reflections, idempotency and service-only rights' AS result;
