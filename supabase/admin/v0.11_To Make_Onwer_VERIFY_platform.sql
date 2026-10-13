-- v0.11 platform verification. Read-only.
select 'profiles_columns' as check_name,
       count(*) filter (where column_name in ('email','email_verified','first_name','last_name','avatar_url','bio','timezone','locale','last_seen_at','updated_at')) as expected_columns_present
from information_schema.columns where table_schema='public' and table_name='profiles';

select 'core_tables' as check_name,
  to_regclass('public.admin_user_roles') as admin_user_roles,
  to_regclass('public.platform_plans') as platform_plans,
  to_regclass('public.platform_tools') as platform_tools,
  to_regclass('public.user_plan_grants') as user_plan_grants,
  to_regclass('public.user_tool_passes') as user_tool_passes,
  to_regclass('public.ad_campaigns') as ad_campaigns,
  to_regclass('public.market_data_providers') as market_data_providers,
  to_regclass('public.historical_context_envelopes') as historical_context_envelopes;

select u.email,p.username,ur.role_code
from auth.users u
left join public.profiles p on p.id=u.id
left join public.admin_user_roles ur on ur.user_id=u.id and (ur.expires_at is null or ur.expires_at>now())
where lower(u.email)=lower('stockmarketfromthegroundup@gmail.com');

select plan_code,name,price_cents,billing_interval,ad_free,includes_all_tools,includes_all_books
from public.platform_plans order by sort_order;

select tool_code,name,category,status,individual_price_cents,free_preview
from public.platform_tools order by sort_order;

select product_code,short_title,publication_status,included_lifetime,kdp_select,direct_digital_enabled
from public.catalog_products where product_type='book' order by sort_order;

select column_name from information_schema.columns
where table_schema='public' and table_name='forum_reports'
  and column_name in ('reporter_user_id','content_type','content_id','reason','status','resolved_by','resolution_note')
order by column_name;

select public.my_platform_access_for_user(u.id) as owner_platform_access
from auth.users u where lower(u.email)=lower('stockmarketfromthegroundup@gmail.com');

-- v0.11.2 final admin-directory shape.
select column_name, ordinal_position
from information_schema.columns
where table_schema='public' and table_name='admin_account_directory'
order by ordinal_position;

-- Confirm the owner legacy entitlement has a non-null source.
select u.email,e.product_key,e.status,e.source,e.starts_at,e.ends_at
from auth.users u
left join public.entitlements e on e.user_id=u.id and e.product_key='full_learning_access'
where lower(u.email)=lower('stockmarketfromthegroundup@gmail.com');
