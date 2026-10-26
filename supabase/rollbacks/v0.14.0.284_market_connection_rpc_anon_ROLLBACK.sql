-- v0.14.0.284 rollback | Restore preceding PUBLIC executable grant.
-- No member data or stored connection records are affected.
BEGIN;
GRANT EXECUTE ON FUNCTION public.my_market_data_connections() TO PUBLIC;
COMMIT;
