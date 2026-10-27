-- Migration superseded before application by 20261027_founding_sparks_10_15_20_constraint_v2.sql.
-- The original direct UPDATE would violate the legacy 5/5/15 fixed-benefit CHECK constraint.
-- Keep this historical filename harmless; v2 updates the constraint and amounts atomically.
SELECT 1;
