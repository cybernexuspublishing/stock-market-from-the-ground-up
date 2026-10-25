-- v0.14.0.233: Accurate server-observed sponsor delivery caps.
-- Metrics remain informational (not automatic CPC/CPM billing).
CREATE OR REPLACE FUNCTION public.gu_ad_campaign_counts_v014233(p_campaigns bigint[])
RETURNS TABLE(campaign_id bigint, impressions bigint, clicks bigint)
LANGUAGE sql STABLE SECURITY INVOKER
SET search_path=pg_catalog,pg_temp
AS $metrics$
 SELECT c.id AS campaign_id,
 coalesce(count(e.id) FILTER(WHERE e.event_type='impression'),0)::bigint,
 coalesce(count(e.id) FILTER(WHERE e.event_type='click'),0)::bigint
 FROM public.ad_campaigns c
 LEFT JOIN public.ad_events e ON e.campaign_id=c.id
 WHERE c.id=ANY(p_campaigns) GROUP BY c.id
$metrics$;
REVOKE ALL ON FUNCTION public.gu_ad_campaign_counts_v014233(bigint[]) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.gu_ad_campaign_counts_v014233(bigint[]) TO service_role;
