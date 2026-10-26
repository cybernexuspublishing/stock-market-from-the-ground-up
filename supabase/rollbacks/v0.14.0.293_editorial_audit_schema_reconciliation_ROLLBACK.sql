-- v0.14.0.293 rollback policy: NO-OP.
-- Migration performs only catalog checks and does not mutate user/schema objects.
-- Preserve migration history as an accurate record that this gate ran on 2026-10-26.
-- Do not replay historical v280 or v281 migrations.
BEGIN READ ONLY;
SELECT 1 AS no_data_or_schema_rollback_needed;
COMMIT;
