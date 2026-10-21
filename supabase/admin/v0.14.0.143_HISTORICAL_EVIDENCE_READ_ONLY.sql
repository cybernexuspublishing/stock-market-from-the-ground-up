-- v0.14.0.143 | OWNER READ ONLY | one-result snapshot.
-- Do NOT run a fictional data generator to make this result look green.
-- All 419 Lab records and previously saved evidence are preserved.
-- Run only against the existing Supabase project with authorized read access.
WITH source AS (
 SELECT count(*)::int total,
 count(*) FILTER (WHERE d.status='published' AND
   (d.metadata->>'original_synthetic')='true')::int published_fictional,
 count(*) FILTER (WHERE d.status='published' AND
   d.metadata->>'real_market_security'='true' AND
   d.metadata->>'historical_evidence_verified'='true' AND
   d.metadata->>'licensed_for_member_display'='true' AND
   d.metadata->>'packet_integrity_reviewed'='true' AND
   d.metadata->>'trading_conditions_reviewed'='true' AND
   d.metadata->>'corporate_actions_reviewed'='true' AND
   d.metadata->>'license_publication_reviewed'='true' AND
   d.metadata->>'evidence_verified'='true' AND
   d.metadata->>'original_synthetic' IS DISTINCT FROM 'true' AND
   length(coalesce(d.metadata->>'source_sha256',''))=64
 )::int source_verified_claims
 FROM public.market_datasets d
), labs AS (
 SELECT count(*)::int total_labs FROM public.platform_labs
), bars AS (
 SELECT count(*)::bigint total_stored_bars FROM public.gu_replay_bars_v01492
)
SELECT 'DEPLOYMENT_03_OF_08_PRIVATE_EVIDENCE_PREFLIGHT' AS diagnostic,
       labs.total_labs,
       source.total AS catalog_sources,
       source.published_fictional AS LEGACY_PUBLISHED_FICTIONAL_DATASETS_NOT_MEMBER_APPROVED,
       source.source_verified_claims AS metadata_claims_not_independent_proof,
       bars.total_stored_bars,
       'NO_DATA_AUTHENTICITY_OR_MARKET_LICENSE_ACCEPTANCE_IMPLIED' AS acceptance
FROM source,labs,bars;
