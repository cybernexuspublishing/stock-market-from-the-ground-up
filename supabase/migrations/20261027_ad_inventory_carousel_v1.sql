-- SMFGU advertising inventory expansion v1 (2026-10-27).
-- No LIVE payment/delivery switches, advertiser/creative records, or policy relaxations.
-- The existing STORE_INLINE code is the Store bottom placement; preserve its historic creatives.
BEGIN;
UPDATE public.ad_placements SET name='Store — Bottom Sponsor',slot_position='bottom',dimensions='responsive banner'
 WHERE placement_code='STORE_INLINE';
INSERT INTO public.ad_placements
 (placement_code,name,description,page_pattern,slot_position,active,free_only,dimensions,sort_order,metadata)
VALUES
 ('STORE_LEFT','Store — Left Sponsor','Commercial store sidebar, outside product checkout.','/store.html','left',true,false,'responsive rail',125,'{"carousel_enabled":false}'::jsonb),
 ('STORE_RIGHT','Store — Right Sponsor','Commercial store sidebar, outside product checkout.','/store.html','right',true,false,'responsive rail',126,'{"carousel_enabled":false}'::jsonb),
 ('COMMUNITY_TOP','Market Commons — Top Sponsor','Above the main forum content; never inside a post or moderation workflow.','/market-commons.html','top',true,false,'responsive banner',127,'{"carousel_enabled":false}'::jsonb),
 ('BOOKS_BOTTOM','Books — Bottom Sponsor','After the book catalog; not inside instructional material.','/books.html','bottom',true,false,'responsive banner',128,'{"carousel_enabled":false}'::jsonb),
 ('MEMBERSHIP_BOTTOM','Membership — Bottom Sponsor','Below the membership comparison; away from checkout and subscription terms.','/membership.html','bottom',true,false,'responsive banner',129,'{"carousel_enabled":false}'::jsonb),
 ('TOOLS_BOTTOM','Tools — Bottom Sponsor','Below the public tools overview; not inside tools or decisions.','/tools.html','bottom',true,false,'responsive banner',130,'{"carousel_enabled":false}'::jsonb),
 ('ABOUT_BOTTOM','About — Bottom Sponsor','Below informational company content.','/about.html','bottom',true,false,'responsive banner',131,'{"carousel_enabled":false}'::jsonb)
ON CONFLICT(placement_code) DO NOTHING;
-- Existing placement metadata remains intact; a per-placement checkbox uses this JSONB flag.
UPDATE public.ad_placements
 SET metadata=metadata || '{"carousel_enabled":false}'::jsonb
 WHERE NOT (metadata ? 'carousel_enabled');
-- Extend only existing ad-eligible policy rows. Ad-free memberships remain untouched.
UPDATE public.plan_ad_policies p
 SET allowed_slots=(
  SELECT ARRAY(SELECT DISTINCT s FROM unnest(
    coalesce(p.allowed_slots,array[]::text[]) ||
    array['STORE_LEFT','STORE_RIGHT','COMMUNITY_TOP','BOOKS_BOTTOM',
          'MEMBERSHIP_BOTTOM','TOOLS_BOTTOM','ABOUT_BOTTOM']::text[]
  ) AS s ORDER BY s)
 ),updated_at=now()
 WHERE p.ads_enabled=true AND p.access_code NOT IN ('OWNER','LIFETIME');
COMMIT;
