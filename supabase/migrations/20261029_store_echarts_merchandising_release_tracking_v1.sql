-- Record Store merchandising progress in the existing Owner release ledger.
-- This changes no Store price, Cloudflare flag, wallet balance, entitlement or sale.
BEGIN;
INSERT INTO public.gu_release_acceptance_v1
 (code,area,title,phase,required_gates,next_action,source_path)
VALUES
 ('STORE_ECHARTS_MERCHANDISING','Commerce',
  'Store ECharts artwork, Founding-first navigation and Lumen footer',
  'implemented',
  ARRAY['source_review','github_ci','cloudflare_deploy','member_browser','owner_signoff']::text[],
  'Finish exact-commit production browser acceptance and Owner visual review; keep the release record open until evidence and sign-off are recorded.',
  'store.html')
ON CONFLICT(code) DO NOTHING;
COMMIT;