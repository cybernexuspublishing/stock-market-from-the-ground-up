-- SMFGU Academy & Skills learning-side advertising placement registry.
-- Add inventory only; do not enable campaign delivery, payments, sponsor attribution,
-- ad-free memberships, or any live Stripe operation.
insert into public.ad_placements
 (placement_code,name,description,page_pattern,slot_position,active,free_only,dimensions,sort_order,metadata)
values
 ('BOOTCAMP_LEFT','Boot Camp Academy — Left Sponsor','Member Boot Camp catalog and learning area left rail','/bootcamp-academy.html','left',true,false,'160x310',301,'{"carousel_enabled":false}'::jsonb),
 ('BOOTCAMP_RIGHT','Boot Camp Academy — Right Sponsor','Member Boot Camp catalog and learning area right rail','/bootcamp-academy.html','right',true,false,'160x310',302,'{"carousel_enabled":false}'::jsonb),
 ('SKILLS_LEFT','Market Skills Record — Left Sponsor','Member skills evidence page left rail','/skills.html','left',true,false,'160x310',303,'{"carousel_enabled":false}'::jsonb),
 ('SKILLS_RIGHT','Market Skills Record — Right Sponsor','Member skills evidence page right rail','/skills.html','right',true,false,'160x310',304,'{"carousel_enabled":false}'::jsonb)
on conflict (placement_code) do nothing;
-- Grant these placements only to plans already entitled to website ads;
-- OWNER/LIFETIME and other ad-free audiences are deliberately unchanged.
update public.plan_ad_policies
set allowed_slots=(
 select array_agg(distinct slot order by slot)
 from unnest(coalesce(allowed_slots,ARRAY[]::text[]) ||
  ARRAY['BOOTCAMP_LEFT','BOOTCAMP_RIGHT','SKILLS_LEFT','SKILLS_RIGHT']::text[]) slot
)
where ads_enabled is true
  and not (allowed_slots @> ARRAY['BOOTCAMP_LEFT','BOOTCAMP_RIGHT','SKILLS_LEFT','SKILLS_RIGHT']::text[]);
