-- v0.12.1 verification
select plan_code,name,active,public_visible,ad_free,includes_all_tools,includes_all_books from public.platform_plans where plan_code in ('FREE','PICK_WHAT_YOU_WANT','FULL_MONTHLY','FULL_ANNUAL','LIFETIME') order by sort_order;
select access_code,label,ads_enabled,max_impressions_per_session,max_impressions_per_24h,minimum_minutes_between_ads from public.plan_ad_policies order by access_code;
select placement_code,name,active,page_pattern,slot_position from public.ad_placements where placement_code like 'SIGNIN_%' or placement_code like 'SIGNUP_%' order by placement_code;
select setting_key,value from public.site_settings where setting_key in ('site.version','community.name','profile.tabs_enabled','profile.feature_list_default') order by setting_key;
select count(*) as official_market_commons_posts from public.forum_official_posts where status='published' and public_visible=true;
select count(*) as visible_navigation_items from public.site_navigation_items where active=true and public_visible=true;
select u.email,p.username,public.my_platform_access_for_user(u.id) as effective_access
from auth.users u left join public.profiles p on p.id=u.id
where lower(u.email)=lower('stockmarketfromthegroundup@gmail.com');
select product_code,short_title,active,publication_status from public.catalog_products where product_type='book' order by sort_order;
