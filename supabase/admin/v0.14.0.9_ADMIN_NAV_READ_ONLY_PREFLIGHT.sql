-- v0.14.0.9 READ-ONLY Supabase preflight. Run in existing project.
-- A false result means do not apply the new write migration yet.
WITH required_tables AS (
 SELECT 'profiles' AS name UNION ALL SELECT 'admin_user_roles' UNION ALL
 SELECT 'admin_user_flags' UNION ALL SELECT 'site_control_events_v1354'
), required_columns(name,col) AS (
 VALUES('profiles','account_kind'),('admin_user_roles','role_code'),
 ('admin_user_roles','expires_at'),('admin_user_flags','status'),
 ('site_control_events_v1354','actor_user_id'),('site_control_events_v1354','module_code'),
 ('site_control_events_v1354','action'),('site_control_events_v1354','target'),
 ('site_control_events_v1354','details')
)
SELECT 'TABLE' check_type,'public.'||name object_name,to_regclass('public.'||name) IS NOT NULL AS exists_ok FROM required_tables
UNION ALL
SELECT 'COLUMN','public.'||name||'.'||col,EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name=required_columns.name AND column_name=required_columns.col) FROM required_columns
ORDER BY check_type,object_name;
