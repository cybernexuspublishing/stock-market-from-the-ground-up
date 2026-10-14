-- v0.14.0.1 | READ ONLY compatibility audit BEFORE the additive guard migration.
-- No customer content, identities, answer keys or passwords returned.
BEGIN READ ONLY;
select 'required_table' as check_kind,x.name,to_regclass('public.'||x.name) is not null as exists_in_database
from (values ('profiles'),('admin_user_roles'),('admin_user_flags'),('site_settings'),('commons_forums'),('commons_topics'),('commons_posts'),('admin_audit_log'),('platform_plans')) x(name)
order by name;
select 'required_routine' as check_kind,x.signature,to_regprocedure(x.signature) is not null as exists_in_database
from (values
 ('public.commons_create_topic(text,text,text,text)'),
 ('public.commons_create_reply(bigint,text)'),
 ('public.v014_owner_plan_visibility(uuid,text,boolean,boolean,boolean)')) x(signature)
order by signature;
select 'legacy_forum_table' as check_kind,x.name,to_regclass('public.'||x.name) is not null as exists_in_database
from (values ('forum_topics'),('forum_posts'),('forum_reports')) x(name) order by name;
select 'existing_config' as check_kind,setting_key, value
from public.site_settings
where setting_key in ('community.max_topics_per_24h','community.max_replies_per_24h')
order by setting_key;
select 'legacy_authenticated_insert_privilege' as check_kind,c.relname,
 has_table_privilege('authenticated',c.oid,'INSERT') as can_insert,
 has_table_privilege('authenticated',c.oid,'UPDATE') as can_update
from pg_class c join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and c.relname in ('forum_topics','forum_posts','forum_reports');
-- Non-sensitive constraint definitions expose incompatibilities without returning reports.
select conname,pg_get_constraintdef(oid) as validation_rule
from pg_constraint where conrelid='public.forum_reports'::regclass and contype='c'
order by conname;
select column_name,is_nullable
from information_schema.columns
where table_schema='public' and table_name='forum_reports'
 and column_name in ('reporter_id','reporter_user_id','content_id','topic_id','post_id','status')
order by column_name;
ROLLBACK;
