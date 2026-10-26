-- v0.14.0.291 | Targeted low-volume FK indexes for next-stage growth.
-- Adds eight distinct nonunique btree indexes on existing database foreign keys.
-- Small existing tables; brief lock timeout and automatic transaction rollback.
-- No member data / payment state changed; see companion SQL for rollback.
BEGIN;
SET LOCAL lock_timeout='3s'; SET LOCAL statement_timeout='30s';
DO $guard$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.admin_role_permissions'::regclass AND conname='admin_role_permissions_permission_code_fkey' AND contype='f') OR EXISTS(SELECT 1 FROM pg_class WHERE relname='gu_v014291_role_permission_code' AND relnamespace='public'::regnamespace) THEN RAISE EXCEPTION 'V014291_FK_OR_INDEX_DRIFT:admin_role_permissions_permission_code_fkey'; END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.commons_topics'::regclass AND conname='commons_topics_author_user_id_fkey' AND contype='f') OR EXISTS(SELECT 1 FROM pg_class WHERE relname='gu_v014291_commons_topic_author' AND relnamespace='public'::regnamespace) THEN RAISE EXCEPTION 'V014291_FK_OR_INDEX_DRIFT:commons_topics_author_user_id_fkey'; END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.lab_instruction_v014'::regclass AND conname='lab_instruction_v014_reviewed_by_fkey' AND contype='f') OR EXISTS(SELECT 1 FROM pg_class WHERE relname='gu_v014291_lesson_reviewer' AND relnamespace='public'::regnamespace) THEN RAISE EXCEPTION 'V014291_FK_OR_INDEX_DRIFT:lab_instruction_v014_reviewed_by_fkey'; END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.lab_training_sets_v014'::regclass AND conname='lab_training_sets_v014_reviewed_by_fkey' AND contype='f') OR EXISTS(SELECT 1 FROM pg_class WHERE relname='gu_v014291_grading_reviewer' AND relnamespace='public'::regnamespace) THEN RAISE EXCEPTION 'V014291_FK_OR_INDEX_DRIFT:lab_training_sets_v014_reviewed_by_fkey'; END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.market_datasets'::regclass AND conname='market_datasets_provider_code_fkey' AND contype='f') OR EXISTS(SELECT 1 FROM pg_class WHERE relname='gu_v014291_market_provider' AND relnamespace='public'::regnamespace) THEN RAISE EXCEPTION 'V014291_FK_OR_INDEX_DRIFT:market_datasets_provider_code_fkey'; END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.platform_labs'::regclass AND conname='platform_labs_updated_by_fkey' AND contype='f') OR EXISTS(SELECT 1 FROM pg_class WHERE relname='gu_v014291_lab_editor' AND relnamespace='public'::regnamespace) THEN RAISE EXCEPTION 'V014291_FK_OR_INDEX_DRIFT:platform_labs_updated_by_fkey'; END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.gu_f600_sandbox_events_v014215'::regclass AND conname='gu_f600_sandbox_events_v014215_intent_id_fkey' AND contype='f') OR EXISTS(SELECT 1 FROM pg_class WHERE relname='gu_v014291_founder_test_event' AND relnamespace='public'::regnamespace) THEN RAISE EXCEPTION 'V014291_FK_OR_INDEX_DRIFT:gu_f600_sandbox_events_v014215_intent_id_fkey'; END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.forum_reports'::regclass AND conname='forum_reports_reporter_id_fkey' AND contype='f') OR EXISTS(SELECT 1 FROM pg_class WHERE relname='gu_v014291_report_reporter' AND relnamespace='public'::regnamespace) THEN RAISE EXCEPTION 'V014291_FK_OR_INDEX_DRIFT:forum_reports_reporter_id_fkey'; END IF;
END $guard$;
CREATE INDEX "gu_v014291_role_permission_code" ON public."admin_role_permissions" ("permission_code");
CREATE INDEX "gu_v014291_commons_topic_author" ON public."commons_topics" ("author_user_id");
CREATE INDEX "gu_v014291_lesson_reviewer" ON public."lab_instruction_v014" ("reviewed_by");
CREATE INDEX "gu_v014291_grading_reviewer" ON public."lab_training_sets_v014" ("reviewed_by");
CREATE INDEX "gu_v014291_market_provider" ON public."market_datasets" ("provider_code");
CREATE INDEX "gu_v014291_lab_editor" ON public."platform_labs" ("updated_by");
CREATE INDEX "gu_v014291_founder_test_event" ON public."gu_f600_sandbox_events_v014215" ("intent_id");
CREATE INDEX "gu_v014291_report_reporter" ON public."forum_reports" ("reporter_id");
COMMIT;
