-- THE STOCK MARKET: FROM THE GROUND UP / v0.14.0.4
-- READ-ONLY CONTRACT INVENTORY. Execute in the EXISTING Supabase SQL Editor.
-- No ALTER, CREATE, UPDATE, INSERT, DELETE, or GRANT statements are present.
-- Run BEFORE considering any versioned SQL migration. Record the results privately.
BEGIN TRANSACTION READ ONLY;
SELECT current_database() AS database_name, current_user AS inspected_as, now() AS inspected_at;
WITH required(rel, purpose) AS (VALUES
 ('public.platform_plans','membership visibility and checkout gating'),
 ('public.site_settings','global checkout settings'),
 ('public.admin_user_flags','account restrictions for marketdata, payments and reporting'),
 ('public.admin_user_roles','OWNER authorization'),
 ('public.profiles','production vs synthetic account separation'),
 ('public.lab_training_sets_v014','reviewed private answer bank'),
 ('public.lab_training_attempts_v014','private reviewed attempt history'),
 ('public.lab_instruction_v014','private Foundations instruction'),
 ('public.gws_client_drafts_v014','OWNER-private client project drafts'),
 ('public.gws_client_draft_revisions_v0143','optimistic revision history'),
 ('public.commons_topics','forum ACL policy target'),
 ('public.commons_posts','forum reply ACL policy target'),
 ('public.forum_reports','member reports')
)
SELECT rel AS required_table,purpose,to_regclass(rel) IS NOT NULL AS exists_on_this_database
FROM required ORDER BY rel;
WITH required(rel,col) AS (VALUES
 ('platform_plans','active'),('platform_plans','public_visible'),('platform_plans','checkout_enabled'),('platform_plans','price_cents'),('platform_plans','metadata'),('platform_plans','lemon_variant_id'),
 ('profiles','account_kind'),('admin_user_flags','status'),('admin_user_roles','role_code'),
 ('lab_training_sets_v014','answer_key'),('lab_training_attempts_v014','responses'),
 ('gws_client_drafts_v014','revision_number')
)
SELECT rel,col,EXISTS(SELECT 1 FROM information_schema.columns c WHERE c.table_schema='public' AND c.table_name=rel AND c.column_name=col) AS exists_on_this_database
FROM required ORDER BY rel,col;
WITH required(signature,purpose) AS (VALUES
 ('public.v014_owner_plan_visibility(uuid,text,boolean,boolean,boolean)','atomic OWNER membership availability and audit'),
 ('public.v014_training_start(uuid,text,text)','private reviewed training session start'),
 ('public.v014_training_answer(uuid,uuid,text,integer)','atomic reviewed answer progression'),
 ('public.user_has_tool_access(uuid,text)','server-side paid tool entitlement'),
 ('public.v014_community_report(uuid,text,text,text,text)','atomic forum reporting quota'),
 ('public.v0143_gws_save(uuid,text,text,text,text,text,jsonb,integer)','GWS revisioned private drafts')
)
SELECT signature,purpose,to_regprocedure(signature) IS NOT NULL AS signature_exists
FROM required ORDER BY signature;
SELECT n.nspname AS schema_name,c.relname AS table_name,c.relrowsecurity AS rls_enabled,c.relforcerowsecurity AS force_rls
FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname='public' AND c.relkind IN ('r','p') AND c.relname IN
('platform_plans','lab_training_sets_v014','lab_training_attempts_v014','lab_instruction_v014','gws_client_drafts_v014','gws_client_draft_revisions_v0143','commons_topics','commons_posts','forum_reports')
ORDER BY c.relname;
-- Return only column names and permissions, never stored credentials, PII, answer keys, or member rows.
COMMIT;
