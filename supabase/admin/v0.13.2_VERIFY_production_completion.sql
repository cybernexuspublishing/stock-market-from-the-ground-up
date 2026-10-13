-- v0.13.2 production-completion verification
select setting_key,value from public.site_settings where setting_key in ('site.version','accounts.minimum_age','accounts.require_dob','support.enabled','ui.dashboard_compact_overview') order by setting_key;
select feature_code,label,category,enabled from public.site_feature_controls order by category,feature_code;
select preset_code,label,plan_code,tool_codes,active from public.qa_account_presets order by sort_order;
select count(*) as support_ticket_table_ready from information_schema.tables where table_schema='public' and table_name='support_tickets';
select count(*) as private_identity_table_ready from information_schema.tables where table_schema='public' and table_name='account_private_identity';
select count(*) as member_activity_view_ready from information_schema.views where table_schema='public' and table_name='admin_member_activity_directory';
select document_code,title,version,status from public.legal_documents order by document_code;
select article_code,title,status from public.help_articles where article_code in ('ACCOUNT_DELETE','SUPPORT_CENTER','TOKEN_SECURITY','AGE_REQUIREMENT') order by article_code;
select item_code,label,status from public.qa_acceptance_items order by category,item_code;
select u.email,p.username,p.account_kind,public.my_platform_access_for_user(u.id) as effective_access
from auth.users u left join public.profiles p on p.id=u.id
where lower(u.email)=lower('stockmarketfromthegroundup@gmail.com');
