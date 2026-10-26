-- v0.14.0.291 rollback. Remove only these eight performance indexes.
-- Does not delete or alter data, constraints or policies. Index removal may decrease performance.
BEGIN;
SET LOCAL lock_timeout='3s'; SET LOCAL statement_timeout='30s';
DROP INDEX IF EXISTS public."gu_v014291_role_permission_code";
DROP INDEX IF EXISTS public."gu_v014291_commons_topic_author";
DROP INDEX IF EXISTS public."gu_v014291_lesson_reviewer";
DROP INDEX IF EXISTS public."gu_v014291_grading_reviewer";
DROP INDEX IF EXISTS public."gu_v014291_market_provider";
DROP INDEX IF EXISTS public."gu_v014291_lab_editor";
DROP INDEX IF EXISTS public."gu_v014291_founder_test_event";
DROP INDEX IF EXISTS public."gu_v014291_report_reporter";
COMMIT;
