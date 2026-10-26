-- v0.14.0.292 | Isolated negative-control regression.
-- TEMPORARY DATA ONLY. No canonical IDs, answer keys, real Owner approvals or member rows.
-- The role identity below is explicitly invalid and never inserted in production.
-- All test records and trigger bindings are rolled back unconditionally.
BEGIN;
CREATE TEMP TABLE gu_v014292_fixture (
 lab_id text NOT NULL, version integer NOT NULL, review_state text NOT NULL,
 title text NOT NULL, source_status text NOT NULL, questions jsonb NOT NULL,
 answer_key jsonb NOT NULL, reviewed_by uuid, reviewed_at timestamptz,
 review_frozen_at timestamptz
) ON COMMIT DROP;
CREATE TRIGGER gu_v014292_fixture_trigger BEFORE INSERT OR UPDATE
 ON gu_v014292_fixture FOR EACH ROW
 EXECUTE FUNCTION public.gu_v014292_guard_graded_revision();
DO $fixture$
DECLARE denied boolean:=false; stored timestamptz;
BEGIN
 INSERT INTO gu_v014292_fixture(lab_id,version,review_state,title,source_status,questions,answer_key,review_frozen_at)
 VALUES ('QA-TEMP-NOT-CANONICAL',1,'draft','synthetic test','test','[]'::jsonb,'{}'::jsonb,now());
 SELECT review_frozen_at INTO stored FROM gu_v014292_fixture;
 IF stored IS NOT NULL THEN RAISE EXCEPTION 'FAIL_DRAFT_MUST_NOT_BE_FROZEN';END IF;
 BEGIN
  INSERT INTO gu_v014292_fixture(lab_id,version,review_state,title,source_status,questions,answer_key)
  VALUES ('QA-TEMP-NOT-CANONICAL',2,'reviewed','synthetic test','test','[]'::jsonb,'{}'::jsonb);
 EXCEPTION WHEN others THEN
   denied:=SQLERRM LIKE '%V014292_REVIEW_REQUIRES_DRAFT_TO_REVIEWED_TRANSITION%';
 END;
 IF NOT denied THEN RAISE EXCEPTION 'FAIL_DIRECT_REVIEWED_INSERT_ACCEPTED'; END IF;
 denied:=false;
 BEGIN
  UPDATE gu_v014292_fixture SET review_state='reviewed',
   reviewed_by='00000000-0000-4000-8000-000000000000'::uuid,
   reviewed_at=now() WHERE version=1;
 EXCEPTION WHEN others THEN
   denied:=SQLERRM LIKE '%V014292_REVIEW_REQUIRES_ATTRIBUTABLE_ACTIVE_OWNER%';
 END;
 IF NOT denied THEN RAISE EXCEPTION 'FAIL_UNAUTHORIZED_APPROVAL_ACCEPTED';END IF;
 -- Exercise immutable-content path on TEMP table only.
 ALTER TABLE gu_v014292_fixture DISABLE TRIGGER gu_v014292_fixture_trigger;
 UPDATE gu_v014292_fixture SET review_state='reviewed',review_frozen_at=now(),
   reviewed_by='00000000-0000-4000-8000-000000000000'::uuid,
   reviewed_at=now() WHERE version=1;
 ALTER TABLE gu_v014292_fixture ENABLE TRIGGER gu_v014292_fixture_trigger;
 denied:=false;
 BEGIN
  UPDATE gu_v014292_fixture SET answer_key='{"fixture":"changed"}'::jsonb WHERE version=1;
 EXCEPTION WHEN others THEN
   denied:=SQLERRM LIKE '%V014292_GRADED_CONTENT_IMMUTABLE_CREATE_NEW_VERSION%';
 END;
 IF NOT denied THEN RAISE EXCEPTION 'FAIL_REVIEWED_ANSWER_KEY_MUTABLE';END IF;
END $fixture$;
ROLLBACK;
