-- Run in Supabase SQL Editor AFTER migration AND private Owner seeds.
-- No sensitive answer keys or authored lesson content returned by this query.
BEGIN READ ONLY;
select 'Private authored Foundations Lab records' as check_name,count(*)::integer as quantity from public.lab_instruction_v014
union all select 'Reviewed question sets',count(*)::integer from public.lab_training_sets_v014 where review_state='reviewed'
union all select 'Pending draft question sets',count(*)::integer from public.lab_training_sets_v014 where review_state='draft'
union all select 'Founding plans (should be exactly 2)',count(*)::integer from public.platform_plans where plan_code in ('FOUNDING_MONTHLY','FOUNDING_ANNUAL');
select plan_code,price_cents,active,public_visible,checkout_enabled
from public.platform_plans where plan_code in ('FOUNDING_MONTHLY','FOUNDING_ANNUAL');
select c.relname,c.relrowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and c.relname in ('lab_instruction_v014','lab_training_sets_v014','lab_training_attempts_v014','gws_client_drafts_v014');
ROLLBACK;
