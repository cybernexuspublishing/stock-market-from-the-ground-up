-- Optional rollback only after server SEC_EDGAR_BETA_ENABLED=false and
-- confirming no dependent Cloudflare route still calls this RPC.
DROP FUNCTION IF EXISTS public.gu_sec_edgar_take_budget_v1();
DROP TABLE IF EXISTS public.gu_sec_edgar_rate_budget_v1;
NOTIFY pgrst, 'reload schema';
