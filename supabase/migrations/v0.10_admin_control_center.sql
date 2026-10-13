-- v0.10 Advanced Admin Control Center + dynamic catalog/settings/content
-- Run after v0.9_commerce_library_tutor.sql.
-- Browser users never receive the Supabase secret key. Administrative writes are performed through Cloudflare Pages Functions.

-- ============================================================
-- ADMIN ROLE-BASED ACCESS CONTROL (RBAC)
-- ============================================================
create table if not exists public.admin_permissions (
  permission_code text primary key,
  category text not null,
  name text not null,
  description text,
  risk_level text not null default 'standard' check (risk_level in ('low','standard','high','critical')),
  created_at timestamptz not null default now()
);

create table if not exists public.admin_roles (
  role_code text primary key,
  name text not null,
  description text,
  priority integer not null default 100,
  is_system boolean not null default true,
  is_assignable boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.admin_role_permissions (
  role_code text not null references public.admin_roles(role_code) on delete cascade,
  permission_code text not null references public.admin_permissions(permission_code) on delete cascade,
  primary key(role_code,permission_code)
);

create table if not exists public.admin_user_roles (
  user_id uuid not null references auth.users(id) on delete cascade,
  role_code text not null references public.admin_roles(role_code) on delete cascade,
  granted_by uuid references auth.users(id) on delete set null,
  granted_at timestamptz not null default now(),
  expires_at timestamptz,
  primary key(user_id,role_code)
);
create index if not exists admin_user_roles_user_idx on public.admin_user_roles(user_id);

create table if not exists public.admin_audit_log (
  id bigint generated always as identity primary key,
  actor_user_id uuid references auth.users(id) on delete set null,
  action text not null,
  target_type text,
  target_id text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists admin_audit_log_created_idx on public.admin_audit_log(created_at desc);
create index if not exists admin_audit_log_actor_idx on public.admin_audit_log(actor_user_id,created_at desc);

create table if not exists public.admin_user_flags (
  user_id uuid primary key references auth.users(id) on delete cascade,
  status text not null default 'active' check (status in ('active','watch','restricted','suspended')),
  reason text,
  internal_note text,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

create table if not exists public.admin_user_notes (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  note text not null,
  note_type text not null default 'general' check (note_type in ('general','support','moderation','commerce','learning','security')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists admin_user_notes_user_idx on public.admin_user_notes(user_id,created_at desc);

-- No direct browser access to administrative control tables.
do $$
declare t text;
begin
  foreach t in array array['admin_permissions','admin_roles','admin_role_permissions','admin_user_roles','admin_audit_log','admin_user_flags','admin_user_notes'] loop
    execute format('alter table public.%I enable row level security',t);
    execute format('revoke all on public.%I from anon, authenticated',t);
  end loop;
end $$;

-- Seed permissions.
insert into public.admin_permissions(permission_code,category,name,description,risk_level) values
('dashboard.view','Dashboard','View admin dashboard','View operational counts and system overview.','low'),
('users.view','Accounts','View user accounts','View account identity, access, and activity summaries.','standard'),
('users.manage','Accounts','Manage user identity','Exceptional username remediation and broader account administration.','high'),
('users.moderate','Accounts','Moderate user accounts','Apply moderation flags and internal moderation actions without identity editing.','high'),
('users.suspend','Accounts','Suspend / unsuspend users','Use authentication ban controls.','high'),
('users.delete','Accounts','Delete user accounts','Permanently delete an authentication account and cascading data.','critical'),
('roles.view','Security','View roles and permissions','Inspect administrative roles and permission assignments.','standard'),
('roles.manage','Security','Manage roles','Assign roles and edit custom roles.','critical'),
('owner.manage','Security','Manage owner-level authority','Assign/remove OWNER and perform owner-only security actions.','critical'),
('catalog.view','Catalog','View product catalog','View all active and inactive products and channels.','low'),
('catalog.manage','Catalog','Manage product catalog','Create/edit/archive books, Amazon links, KDP controls, and direct-sale settings.','high'),
('commerce.view','Commerce','View commerce records','View site orders and subscription records.','standard'),
('commerce.manage','Commerce','Manage commerce configuration','Manage public subscription/pricing/checkout configuration and internal commerce notes.','high'),
('library.view','Access','View library access','View user library/ownership records.','standard'),
('library.manage','Access','Manage library access','Grant/revoke companion and product access.','high'),
('entitlements.view','Access','View learning entitlements','View active/trial learning access.','standard'),
('entitlements.manage','Access','Manage learning entitlements','Grant/revoke Full Learning Access.','high'),
('content.view','Content','View managed site content','View tutor topics, announcements, resources, releases, and challenges.','low'),
('content.manage','Content','Manage site content','Create/edit/archive managed companion content.','high'),
('tutor.manage','Learning','Manage Market Tutor knowledge','Create/edit companion tutor topics without reproducing book chapters.','high'),
('learning.manage','Learning','Manage learning environment metadata','Manage learning resources, practice releases, and non-book companion metadata.','high'),
('forum.view','Community','View moderation data','View forum topics/posts and moderation reports.','standard'),
('forum.moderate','Community','Moderate community','Lock, pin, hide, restore, or remove community content.','high'),
('settings.view','Site','View site settings','View non-secret website configuration.','low'),
('settings.manage','Site','Manage site settings','Change public feature flags, prices, support details, and integration URLs.','high'),
('announcements.manage','Site','Manage announcements','Publish and archive site-wide announcements.','standard'),
('audit.view','Security','View audit log','View administrative action history.','high'),
('system.view','System','View integration health','View environment/integration readiness without revealing secrets.','standard'),
('system.manage','System','Manage technical configuration','Manage non-secret operational configuration.','critical'),
('support.manage','Support','Customer support actions','Add support notes and manage permitted customer access fixes.','high'),
('control_panel.access','Security','Access Admin Control Center','Allows the account to open the private Control Center.','standard'),
('marketdata.manage','Market Data','Manage market-data configuration','Manage non-secret market-data adapters, source metadata, and simulator data settings.','high'),
('ai.manage','AI / Tutor','Manage AI/Tutor configuration','Manage non-secret Tutor/AI feature configuration and approved knowledge sources.','high'),
('privacy.manage','Privacy','Manage privacy operations','Handle user data-access/export/deletion workflows and privacy controls.','critical'),
('compliance.manage','Compliance','Manage compliance review','Review educational, publishing, commerce, and market-data compliance controls.','high'),
('qa.manage','Quality Assurance','Manage QA and releases','Coordinate release gates, test plans, verification, and production readiness.','high'),
('marketing.manage','Marketing','Manage marketing communications','Manage approved public marketing copy, campaigns, and promotional announcements.','standard'),
('analytics.view','Analytics','View administrative analytics','View aggregate operational and learning counts.','standard')
on conflict(permission_code) do update set category=excluded.category,name=excluded.name,description=excluded.description,risk_level=excluded.risk_level;

-- Seed professional + non-professional operational roles.
insert into public.admin_roles(role_code,name,description,priority,is_system,is_assignable) values
('OWNER','Owner / Super Admin','Highest authority. Can manage roles, owner access, users, catalog, commerce, security, and all administrative functions.',1,true,true),
('ADMIN','Administrator','Broad day-to-day administrative authority excluding owner-only destructive/security operations.',10,true,true),
('TECH_ADMIN','Technical Administrator','System configuration, integration health, settings, audit, and technical operations.',20,true,true),
('COMMERCE_MANAGER','Commerce Manager','Store catalog, orders, subscriptions, pricing, library grants, and commerce operations.',30,true,true),
('CONTENT_MANAGER','Content Manager / Editor','Books/store metadata, companion content, announcements, learning resources, and tutor content.',30,true,true),
('LEARNING_MANAGER','Learning Manager / Instructor','Labs, practice resources, tutor topics, learning releases, and educational metadata.',30,true,true),
('MODERATOR','Moderator','Community moderation, reports, account moderation notes, and forum safety actions.',40,true,true),
('SUPPORT','Customer Support','User lookup, support notes, access/library/entitlement assistance, and commerce visibility.',40,true,true),
('SECURITY_ADMIN','Security Administrator','Security operations, role review, account protection, audit, and incident-response support without OWNER authority.',15,true,true),
('PUBLISHING_MANAGER','Publishing / Catalog Manager','Book catalog, edition metadata, Amazon links, KDP Select controls, and publishing-side site content.',25,true,true),
('MARKET_DATA_MANAGER','Market Data Manager','Simulator datasets, market-data source configuration, data provenance, and display/licensing controls.',30,true,true),
('AI_TUTOR_MANAGER','AI / Market Tutor Manager','Tutor knowledge, AI feature configuration, approved sources, and educational response quality.',30,true,true),
('COMMUNITY_MANAGER','Community Manager','Community operations, moderation oversight, announcements, and escalation management.',35,true,true),
('COMPLIANCE_REVIEWER','Compliance / Privacy Reviewer','Compliance, privacy, audit, policy, and release-review responsibilities without general destructive authority.',35,true,true),
('QA_RELEASE_MANAGER','QA / Release Manager','Production readiness, release verification, regression testing, and launch-gate coordination.',35,true,true),
('MARKETING_MANAGER','Marketing / Communications Manager','Approved public communications, announcements, campaign content, and store-facing messaging.',40,true,true),
('ANALYST','Analyst / Auditor','Read-only operational, commerce, audit, and aggregate learning visibility.',50,true,true),
('COMMUNITY_HELPER','Community Helper','Limited non-professional/volunteer community support role. Can review public community content but has no Control Center access by default.',60,true,true),
('BETA_TESTER','Beta Tester / Reviewer','Non-professional testing role for pre-release feedback. No Control Center access by default.',70,true,true)
on conflict(role_code) do update set name=excluded.name,description=excluded.description,priority=excluded.priority,is_system=excluded.is_system,is_assignable=excluded.is_assignable;

-- OWNER gets everything.
insert into public.admin_role_permissions(role_code,permission_code)
select 'OWNER',permission_code from public.admin_permissions
on conflict do nothing;

-- ADMIN: everything except owner-only account deletion/owner authority.
insert into public.admin_role_permissions(role_code,permission_code)
select 'ADMIN',permission_code from public.admin_permissions
where permission_code not in ('owner.manage','users.delete')
on conflict do nothing;

-- Technical Administrator.
insert into public.admin_role_permissions(role_code,permission_code) values
('TECH_ADMIN','dashboard.view'),('TECH_ADMIN','users.view'),('TECH_ADMIN','roles.view'),('TECH_ADMIN','settings.view'),('TECH_ADMIN','settings.manage'),('TECH_ADMIN','audit.view'),('TECH_ADMIN','system.view'),('TECH_ADMIN','system.manage'),('TECH_ADMIN','analytics.view')
on conflict do nothing;

-- Commerce Manager.
insert into public.admin_role_permissions(role_code,permission_code) values
('COMMERCE_MANAGER','dashboard.view'),('COMMERCE_MANAGER','users.view'),('COMMERCE_MANAGER','catalog.view'),('COMMERCE_MANAGER','catalog.manage'),('COMMERCE_MANAGER','commerce.view'),('COMMERCE_MANAGER','commerce.manage'),('COMMERCE_MANAGER','library.view'),('COMMERCE_MANAGER','library.manage'),('COMMERCE_MANAGER','entitlements.view'),('COMMERCE_MANAGER','entitlements.manage'),('COMMERCE_MANAGER','audit.view'),('COMMERCE_MANAGER','analytics.view')
on conflict do nothing;

-- Content Manager / Editor.
insert into public.admin_role_permissions(role_code,permission_code) values
('CONTENT_MANAGER','dashboard.view'),('CONTENT_MANAGER','catalog.view'),('CONTENT_MANAGER','catalog.manage'),('CONTENT_MANAGER','content.view'),('CONTENT_MANAGER','content.manage'),('CONTENT_MANAGER','tutor.manage'),('CONTENT_MANAGER','learning.manage'),('CONTENT_MANAGER','announcements.manage'),('CONTENT_MANAGER','settings.view')
on conflict do nothing;

-- Learning Manager / Instructor.
insert into public.admin_role_permissions(role_code,permission_code) values
('LEARNING_MANAGER','dashboard.view'),('LEARNING_MANAGER','content.view'),('LEARNING_MANAGER','content.manage'),('LEARNING_MANAGER','tutor.manage'),('LEARNING_MANAGER','learning.manage'),('LEARNING_MANAGER','analytics.view'),('LEARNING_MANAGER','forum.view')
on conflict do nothing;

-- Moderator.
insert into public.admin_role_permissions(role_code,permission_code) values
('MODERATOR','dashboard.view'),('MODERATOR','users.view'),('MODERATOR','users.moderate'),('MODERATOR','users.suspend'),('MODERATOR','forum.view'),('MODERATOR','forum.moderate'),('MODERATOR','audit.view'),('MODERATOR','support.manage')
on conflict do nothing;

-- Support.
insert into public.admin_role_permissions(role_code,permission_code) values
('SUPPORT','dashboard.view'),('SUPPORT','users.view'),('SUPPORT','commerce.view'),('SUPPORT','library.view'),('SUPPORT','library.manage'),('SUPPORT','entitlements.view'),('SUPPORT','entitlements.manage'),('SUPPORT','support.manage')
on conflict do nothing;

-- Analyst / Auditor.
insert into public.admin_role_permissions(role_code,permission_code) values
('ANALYST','dashboard.view'),('ANALYST','users.view'),('ANALYST','catalog.view'),('ANALYST','commerce.view'),('ANALYST','library.view'),('ANALYST','entitlements.view'),('ANALYST','content.view'),('ANALYST','forum.view'),('ANALYST','audit.view'),('ANALYST','system.view'),('ANALYST','analytics.view')
on conflict do nothing;

-- Community Helper: intentionally limited; no Control Center permission by default.
insert into public.admin_role_permissions(role_code,permission_code) values
('COMMUNITY_HELPER','forum.view')
on conflict do nothing;

-- Professional Control Center access is explicit, not inferred merely from having a role row.
insert into public.admin_role_permissions(role_code,permission_code) values
('TECH_ADMIN','control_panel.access'),('COMMERCE_MANAGER','control_panel.access'),('CONTENT_MANAGER','control_panel.access'),('LEARNING_MANAGER','control_panel.access'),('MODERATOR','control_panel.access'),('SUPPORT','control_panel.access'),('ANALYST','control_panel.access'),
('SECURITY_ADMIN','control_panel.access'),('SECURITY_ADMIN','dashboard.view'),('SECURITY_ADMIN','users.view'),('SECURITY_ADMIN','users.moderate'),('SECURITY_ADMIN','users.suspend'),('SECURITY_ADMIN','roles.view'),('SECURITY_ADMIN','audit.view'),('SECURITY_ADMIN','system.view'),
('PUBLISHING_MANAGER','control_panel.access'),('PUBLISHING_MANAGER','dashboard.view'),('PUBLISHING_MANAGER','catalog.view'),('PUBLISHING_MANAGER','catalog.manage'),('PUBLISHING_MANAGER','content.view'),('PUBLISHING_MANAGER','content.manage'),('PUBLISHING_MANAGER','announcements.manage'),('PUBLISHING_MANAGER','settings.view'),
('MARKET_DATA_MANAGER','control_panel.access'),('MARKET_DATA_MANAGER','dashboard.view'),('MARKET_DATA_MANAGER','learning.manage'),('MARKET_DATA_MANAGER','marketdata.manage'),('MARKET_DATA_MANAGER','content.view'),('MARKET_DATA_MANAGER','settings.view'),('MARKET_DATA_MANAGER','system.view'),('MARKET_DATA_MANAGER','audit.view'),
('AI_TUTOR_MANAGER','control_panel.access'),('AI_TUTOR_MANAGER','dashboard.view'),('AI_TUTOR_MANAGER','content.view'),('AI_TUTOR_MANAGER','content.manage'),('AI_TUTOR_MANAGER','tutor.manage'),('AI_TUTOR_MANAGER','ai.manage'),('AI_TUTOR_MANAGER','learning.manage'),('AI_TUTOR_MANAGER','analytics.view'),
('COMMUNITY_MANAGER','control_panel.access'),('COMMUNITY_MANAGER','dashboard.view'),('COMMUNITY_MANAGER','users.view'),('COMMUNITY_MANAGER','users.moderate'),('COMMUNITY_MANAGER','forum.view'),('COMMUNITY_MANAGER','forum.moderate'),('COMMUNITY_MANAGER','announcements.manage'),('COMMUNITY_MANAGER','audit.view'),
('COMPLIANCE_REVIEWER','control_panel.access'),('COMPLIANCE_REVIEWER','dashboard.view'),('COMPLIANCE_REVIEWER','users.view'),('COMPLIANCE_REVIEWER','catalog.view'),('COMPLIANCE_REVIEWER','commerce.view'),('COMPLIANCE_REVIEWER','content.view'),('COMPLIANCE_REVIEWER','forum.view'),('COMPLIANCE_REVIEWER','settings.view'),('COMPLIANCE_REVIEWER','audit.view'),('COMPLIANCE_REVIEWER','system.view'),('COMPLIANCE_REVIEWER','privacy.manage'),('COMPLIANCE_REVIEWER','compliance.manage'),
('QA_RELEASE_MANAGER','control_panel.access'),('QA_RELEASE_MANAGER','dashboard.view'),('QA_RELEASE_MANAGER','catalog.view'),('QA_RELEASE_MANAGER','content.view'),('QA_RELEASE_MANAGER','settings.view'),('QA_RELEASE_MANAGER','system.view'),('QA_RELEASE_MANAGER','audit.view'),('QA_RELEASE_MANAGER','analytics.view'),('QA_RELEASE_MANAGER','qa.manage'),
('MARKETING_MANAGER','control_panel.access'),('MARKETING_MANAGER','dashboard.view'),('MARKETING_MANAGER','catalog.view'),('MARKETING_MANAGER','content.view'),('MARKETING_MANAGER','content.manage'),('MARKETING_MANAGER','announcements.manage'),('MARKETING_MANAGER','marketing.manage')
on conflict do nothing;

-- Refresh broad system roles after adding new permissions.
insert into public.admin_role_permissions(role_code,permission_code)
select 'OWNER',permission_code from public.admin_permissions
on conflict do nothing;
insert into public.admin_role_permissions(role_code,permission_code)
select 'ADMIN',permission_code from public.admin_permissions
where permission_code not in ('owner.manage','users.delete')
on conflict do nothing;

-- ============================================================
-- DYNAMIC CATALOG / STORE CONFIGURATION
-- ============================================================
create table if not exists public.catalog_products (
  product_code text primary key,
  product_type text not null default 'book' check (product_type in ('book','membership','bundle','physical','other')),
  family text not null default 'foundations',
  title text not null,
  short_title text not null,
  author text,
  publisher text,
  description text,
  active boolean not null default true,
  sort_order integer not null default 100,
  kdp_select boolean not null default false,
  companion_access boolean not null default false,
  book_key_trial_days integer not null default 0 check (book_key_trial_days>=0),
  amazon_kindle_url text,
  amazon_paperback_url text,
  amazon_hardcover_url text,
  direct_digital_enabled boolean not null default false,
  direct_digital_checkout_url text,
  direct_physical_enabled boolean not null default false,
  direct_physical_checkout_url text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);
create index if not exists catalog_products_active_sort_idx on public.catalog_products(active,sort_order,product_code);
alter table public.catalog_products enable row level security;
drop policy if exists "public reads active catalog" on public.catalog_products;
create policy "public reads active catalog" on public.catalog_products for select to anon,authenticated using (active=true);
revoke all on public.catalog_products from anon,authenticated;
grant select on public.catalog_products to anon,authenticated;

-- Seed current Foundations catalog. KDP Select remains ON; direct digital remains OFF.
insert into public.catalog_products(product_code,product_type,family,title,short_title,author,publisher,active,sort_order,kdp_select,companion_access,book_key_trial_days,direct_digital_enabled,direct_physical_enabled) values
('FOUNDATION_BOOK_1','book','foundations','The Stock Market: From the Ground Up — Foundations Book I','Foundations Book I','J. S. Grant','Crown & Lantern Press',true,10,true,true,30,false,false),
('FOUNDATION_BOOK_2','book','foundations','The Stock Market: From the Ground Up — Foundations Book II','Foundations Book II','J. S. Grant','Crown & Lantern Press',true,20,true,true,30,false,false),
('FOUNDATION_BOOK_3','book','foundations','The Stock Market: From the Ground Up — Foundations Book III','Foundations Book III','J. S. Grant','Crown & Lantern Press',true,30,true,true,30,false,false)
on conflict(product_code) do nothing;

create table if not exists public.site_settings (
  setting_key text primary key,
  category text not null default 'general',
  value jsonb not null default '{}'::jsonb,
  public_read boolean not null default false,
  description text,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);
alter table public.site_settings enable row level security;
drop policy if exists "public reads public settings" on public.site_settings;
create policy "public reads public settings" on public.site_settings for select to anon,authenticated using (public_read=true);
revoke all on public.site_settings from anon,authenticated;
grant select on public.site_settings to anon,authenticated;

insert into public.site_settings(setting_key,category,value,public_read,description) values
('site.version','site','"0.10"'::jsonb,true,'Current public website version.'),
('site.support_email','site','"cyber.nexus.empire@gmail.com"'::jsonb,true,'Public support email.'),
('site.registration_enabled','site','true'::jsonb,true,'Whether new account registration is available.'),
('site.maintenance_mode','site','false'::jsonb,true,'Public maintenance-mode flag.'),
('feature.store','features','true'::jsonb,true,'Show Store features.'),
('feature.market_tutor','features','true'::jsonb,true,'Show Market Tutor features.'),
('feature.simulator','features','true'::jsonb,true,'Show Market Simulator features.'),
('feature.forum','features','true'::jsonb,true,'Show forum/community features.'),
('feature.public_lab_registry','features','false'::jsonb,true,'Full Historical Lab Registry requires sign-in; signed-out visitors use sample labs.'),
('feature.public_sample_labs','features','true'::jsonb,true,'Allow selected sample labs without an account.'),
('feature.corrections_registry','features','false'::jsonb,true,'Corrections & Verification Registry retired from the public site.'),
('site.live_mode','site','true'::jsonb,true,'Public-facing site presentation uses live/production copy rather than setup notices.'),
('commerce.payment_provider','commerce','""'::jsonb,true,'Payment provider display/configuration name; secrets are never stored here.'),
('commerce.billing_portal_url','commerce','""'::jsonb,true,'Customer billing portal URL.'),
('commerce.monthly_plan','commerce','{"planCode":"FULL_LEARNING_MONTHLY","label":"Full Learning Access — Monthly","price":14.99,"checkoutUrl":"","enabled":true}'::jsonb,true,'Monthly Full Learning Access plan.'),
('commerce.annual_plan','commerce','{"planCode":"FULL_LEARNING_ANNUAL","label":"Full Learning Access — Annual","price":149.00,"checkoutUrl":"","enabled":true}'::jsonb,true,'Annual Full Learning Access plan.'),
('tutor.enhanced_ai_enabled','tutor','false'::jsonb,true,'Whether enhanced remote AI responses are enabled; local companion tutor remains available.'),
('admin.panel_enabled','admin','true'::jsonb,false,'Internal control panel enable flag.')
on conflict(setting_key) do nothing;

-- ============================================================
-- ADMIN-MANAGED COMPANION CONTENT
-- ============================================================
create table if not exists public.managed_content (
  content_code text primary key,
  content_type text not null check (content_type in ('tutor_topic','announcement','resource','release','challenge','faq')),
  title text not null,
  summary text,
  body text,
  status text not null default 'draft' check (status in ('draft','published','archived')),
  sort_order integer not null default 100,
  starts_at timestamptz,
  ends_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);
create index if not exists managed_content_public_idx on public.managed_content(content_type,status,sort_order);
alter table public.managed_content enable row level security;
drop policy if exists "public reads published content" on public.managed_content;
create policy "public reads published content" on public.managed_content for select to anon,authenticated using (
  status='published' and (starts_at is null or starts_at<=now()) and (ends_at is null or ends_at>now())
);
revoke all on public.managed_content from anon,authenticated;
grant select on public.managed_content to anon,authenticated;

-- ============================================================
-- COMMUNITY REPORT INFRASTRUCTURE
-- ============================================================
create table if not exists public.forum_reports (
  id bigint generated always as identity primary key,
  reporter_user_id uuid not null references auth.users(id) on delete cascade,
  content_type text not null check (content_type in ('topic','post','user')),
  content_id text not null,
  reason text not null,
  details text,
  status text not null default 'open' check (status in ('open','reviewing','resolved','dismissed')),
  resolved_by uuid references auth.users(id) on delete set null,
  resolution_note text,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);
create index if not exists forum_reports_status_idx on public.forum_reports(status,created_at desc);
alter table public.forum_reports enable row level security;
drop policy if exists "users create own reports" on public.forum_reports;
create policy "users create own reports" on public.forum_reports for insert to authenticated with check (auth.uid()=reporter_user_id);
drop policy if exists "users read own reports" on public.forum_reports;
create policy "users read own reports" on public.forum_reports for select to authenticated using (auth.uid()=reporter_user_id);
revoke all on public.forum_reports from anon,authenticated;
grant select,insert on public.forum_reports to authenticated;
grant usage,select on sequence public.forum_reports_id_seq to authenticated;

-- Service role needs sequences used by admin/server inserts.
grant usage,select on sequence public.admin_audit_log_id_seq to service_role;
grant usage,select on sequence public.admin_user_notes_id_seq to service_role;
grant usage,select on sequence public.forum_reports_id_seq to service_role;

-- Keep the original static JSON as a deployment fallback. v0.10 public pages prefer these database tables when available.
