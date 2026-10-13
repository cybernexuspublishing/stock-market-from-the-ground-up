-- v0.13.4 verification — Skill Development, Admin accounts, Test Credentials, Showcase
select 'site_version' as check_name, setting_key, value from public.site_settings where setting_key='site.version';
select 'competency_definitions' as check_name, count(*) as total, count(*) filter(where active) as active from public.competency_definitions;
select 'competency_evidence_table' as check_name, to_regclass('public.competency_evidence') as relation;
select 'test_credential_vault' as check_name, to_regclass('public.test_account_credentials') as relation;
select 'showcase_role' as check_name, role_code, name, is_assignable from public.admin_roles where role_code='SHOWCASE_VIEWER';
select 'showcase_permissions' as check_name, count(*) as permission_count,
       count(*) filter(where permission_code in ('owner.manage','users.delete')) as forbidden_critical_permissions
from public.admin_role_permissions where role_code='SHOWCASE_VIEWER';
select 'showcase_preset' as check_name, preset_code, label, plan_code, active from public.qa_account_presets where preset_code='SHOWCASE';
select 'account_kind_constraint' as check_name, pg_get_constraintdef(oid) as definition
from pg_constraint where conname='profiles_account_kind_check' and conrelid='public.profiles'::regclass;
select 'skill_feature' as check_name, feature_code, enabled from public.site_feature_controls where feature_code='SKILL_DEVELOPMENT_ENABLED';
