-- v0.13.1 frontend/platform verification
select 'site_version' as check_name, setting_key, value from public.site_settings where setting_key='site.version';
select 'ui_tables' as check_name, to_regclass('public.user_ui_preferences') as preferences, to_regclass('public.user_bookmarks') as bookmarks, to_regclass('public.user_activity_events') as activity, to_regclass('public.user_notifications') as notifications;
select 'owner_access' as check_name, p.email,p.username,aur.role_code from public.profiles p left join public.admin_user_roles aur on aur.user_id=p.id where lower(p.email)=lower('stockmarketfromthegroundup@gmail.com');
select 'plans' as check_name,plan_code,name,active,public_visible,price_cents from public.platform_plans order by sort_order;
select 'catalog' as check_name,product_code,short_title,active,store_visible,sales_status,kdp_select,direct_digital_enabled from public.catalog_products order by sort_order;
select 'help_docs' as check_name,count(*) as published from public.help_articles where status='published';
select 'commons_forums' as check_name,count(*) as active from public.commons_forums where active=true;
select 'legal_docs' as check_name,count(*) as published from public.legal_documents where status='published';
select public.my_platform_access() as my_platform_access;
