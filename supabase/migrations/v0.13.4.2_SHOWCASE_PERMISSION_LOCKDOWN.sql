-- v0.13.4.2 | Controlled, repeatable privilege lockdown for SHOWCASE_VIEWER.
-- Requires earlier approved v0.13.4 migration; DOES NOT delete customer or synthetic rows.
-- Apply this before enabling the v0.13.4.2 server release. Save preflight output first.
begin;
-- Never grant operational production permissions to the SHOWCASE_VIEWER role.
delete from public.admin_role_permissions where role_code='SHOWCASE_VIEWER';
-- This permission is used only to display synthetic admin views; not an operational privilege.
insert into public.admin_role_permissions(role_code,permission_code)
select 'SHOWCASE_VIEWER','control_panel.access'
where exists(select 1 from public.admin_permissions where permission_code='control_panel.access')
on conflict do nothing;
-- Remove any accidental status from the mutable preset that might imply real member entitlement.
update public.qa_account_presets
 set plan_code='FREE',tool_codes=array[]::text[],book_codes=array[]::text[],
     metadata=coalesce(metadata,'{}'::jsonb)||'{"synthetic_only":true,"no_production_grants":true,"read_only":true}'::jsonb
 where preset_code='SHOWCASE';
commit;
