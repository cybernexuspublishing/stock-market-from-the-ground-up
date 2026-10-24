-- v0.14.0.168. Already applied to live Supabase on 2026-10-24.
-- Canonical server-side website theme selection. No Stripe changes.
-- The database function is available only to service_role, and the Cloudflare API
-- independently verifies the authenticated Owner before calling it.
create or replace function public.gu_activate_website_design_v014168(p_actor uuid,p_theme text,p_expected_revision integer)
returns jsonb language plpgsql security invoker set search_path = ''
as $$
declare oldval jsonb; oldtheme text; oldrev integer; nextval_json jsonb;
begin
 if p_theme not in ('premium-dark','premium-light') then raise exception 'Unsupported website theme'; end if;
 if p_expected_revision is null or p_expected_revision < 1 then raise exception 'Invalid expected revision'; end if;
 if not exists(select 1 from public.admin_user_roles r where r.user_id=p_actor and r.role_code='OWNER'
   and (r.expires_at is null or r.expires_at>now())) then raise exception 'Owner authorization required'; end if;
 if exists(select 1 from public.admin_user_flags f where f.user_id=p_actor and lower(coalesce(f.status,'')) in ('suspended','restricted')) then raise exception 'Owner account restricted'; end if;
 select s.value into oldval from public.site_settings s where s.setting_key='website_design_theme_v014168' for update;
 if oldval is null then raise exception 'Website design setting missing'; end if;
 oldtheme:=oldval->>'theme'; oldrev:=coalesce((oldval->>'revision')::integer,1);
 if oldrev<>p_expected_revision then raise exception 'Website design changed; refresh before activation'; end if;
 nextval_json:=jsonb_build_object('theme',p_theme,'revision',oldrev+1,'previousTheme',oldtheme);
 update public.site_settings set value=nextval_json,updated_at=now(),updated_by=p_actor where setting_key='website_design_theme_v014168';
 insert into public.admin_audit_log(id,actor_user_id,action,target_type,target_id,details)
 values(nextval('public.admin_audit_log_id_seq'),p_actor,'website_theme_activated','site_settings','website_design_theme_v014168',jsonb_build_object('before',oldval,'after',nextval_json));
 return nextval_json;
end; $$;
revoke all on function public.gu_activate_website_design_v014168(uuid,text,integer) from public,anon,authenticated;
grant execute on function public.gu_activate_website_design_v014168(uuid,text,integer) to service_role;
insert into public.site_settings(setting_key,category,value,public_read,description)
 values('website_design_theme_v014168','appearance','{"theme":"premium-dark","revision":1}'::jsonb,true,'Public website design selection, Owner-only writes and audit')
 on conflict(setting_key) do nothing;
