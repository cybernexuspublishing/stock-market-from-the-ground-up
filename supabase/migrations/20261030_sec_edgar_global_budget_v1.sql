-- Centralized SEC EDGAR request budget; additive, no member data changes.
-- At most one granted outbound SEC fetch per 500ms over all Cloudflare regions
-- using the same Supabase primary project. The route does not access SEC unless
-- this RPC succeeds and the separate environment flag + identified UA are valid.
CREATE TABLE IF NOT EXISTS public.gu_sec_edgar_rate_budget_v1 (
 id smallint PRIMARY KEY CHECK (id = 1),
 next_allowed_at timestamptz NOT NULL DEFAULT '-infinity'::timestamptz,
 updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO public.gu_sec_edgar_rate_budget_v1 (id,next_allowed_at)
VALUES (1,'-infinity'::timestamptz) ON CONFLICT (id) DO NOTHING;
ALTER TABLE public.gu_sec_edgar_rate_budget_v1 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.gu_sec_edgar_rate_budget_v1 FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.gu_sec_edgar_take_budget_v1()
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $body$
DECLARE due_at timestamptz;
BEGIN
 PERFORM pg_advisory_xact_lock(9172026);
 SELECT next_allowed_at INTO due_at
 FROM public.gu_sec_edgar_rate_budget_v1 WHERE id = 1 FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'SEC rate budget row missing'; END IF;
 IF due_at > clock_timestamp() THEN RETURN false; END IF;
 UPDATE public.gu_sec_edgar_rate_budget_v1
 SET next_allowed_at = clock_timestamp() + interval '500 milliseconds',
     updated_at = clock_timestamp()
 WHERE id = 1;
 RETURN true;
END;
$body$;
REVOKE ALL ON FUNCTION public.gu_sec_edgar_take_budget_v1() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.gu_sec_edgar_take_budget_v1() TO service_role;
COMMENT ON FUNCTION public.gu_sec_edgar_take_budget_v1() IS
'Global noncommercial SEC EDGAR outbound fetch budget; fail closed on denial. Not a standalone live data entitlement.';
NOTIFY pgrst, 'reload schema';
