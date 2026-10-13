-- v0.11 Advanced Platform Architecture
-- Run this INSTEAD OF v0.10.1. It is designed to repair a partially failed v0.10 migration after v0.9.
-- It is idempotent for repeated execution.

-- v0.10.1 Admin schema repair + profile/account directory + Advanced Admin Control Center
-- Run after v0.9_commerce_library_tutor.sql.
-- Browser users never receive the Supabase secret key. Administrative writes are performed through Cloudflare Pages Functions.

-- ============================================================
-- PROFILE / ACCOUNT DIRECTORY EXPANSION
-- Identity and preferences live in profiles. Administrative roles do NOT.
-- OWNER / ADMIN / MODERATOR and other staff roles remain normalized in admin_user_roles.
-- ============================================================
alter table public.profiles add column if not exists email text;
alter table public.profiles add column if not exists email_verified boolean not null default false;
alter table public.profiles add column if not exists first_name text;
alter table public.profiles add column if not exists last_name text;
alter table public.profiles add column if not exists avatar_url text;
alter table public.profiles add column if not exists bio text;
alter table public.profiles add column if not exists timezone text not null default 'UTC';
alter table public.profiles add column if not exists locale text not null default 'en-US';
alter table public.profiles add column if not exists onboarding_completed boolean not null default false;
alter table public.profiles add column if not exists marketing_opt_in boolean not null default false;
alter table public.profiles add column if not exists terms_accepted_at timestamptz;
alter table public.profiles add column if not exists privacy_accepted_at timestamptz;
alter table public.profiles add column if not exists last_seen_at timestamptz;
alter table public.profiles add column if not exists updated_at timestamptz not null default now();

-- Mirror authentication email/verification state into the private per-user profile row
-- for administration and account settings. auth.users remains the identity authority.
update public.profiles p
set email=u.email,
    email_verified=(u.email_confirmed_at is not null),
    updated_at=now()
from auth.users u
where u.id=p.id
  and (p.email is distinct from u.email or p.email_verified is distinct from (u.email_confirmed_at is not null));

create or replace function public.sync_profile_auth_identity()
returns trigger
language plpgsql
security definer
set search_path=public,auth
as $$
begin
  update public.profiles
  set email=new.email,
      email_verified=(new.email_confirmed_at is not null),
      updated_at=now()
  where id=new.id;
  return new;
end;$$;

drop trigger if exists zz_sync_profile_auth_identity on auth.users;
create trigger zz_sync_profile_auth_identity
after insert or update of email,email_confirmed_at on auth.users
for each row execute function public.sync_profile_auth_identity();

create or replace function public.fill_profile_auth_identity()
returns trigger
language plpgsql
security definer
set search_path=public,auth
as $$
begin
  select u.email,(u.email_confirmed_at is not null)
    into new.email,new.email_verified
  from auth.users u where u.id=new.id;
  new.updated_at=coalesce(new.updated_at,now());
  return new;
end;$$;

drop trigger if exists a_fill_profile_auth_identity on public.profiles;
create trigger a_fill_profile_auth_identity
before insert on public.profiles
for each row execute function public.fill_profile_auth_identity();

create or replace function public.touch_profile_updated_at()
returns trigger language plpgsql set search_path=public as $$
begin new.updated_at=now(); return new; end;$$;
drop trigger if exists z_touch_profile_updated_at on public.profiles;
create trigger z_touch_profile_updated_at
before update on public.profiles
for each row execute function public.touch_profile_updated_at();

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
('site.version','site','"0.11.2"'::jsonb,true,'Current public website version.'),
('site.support_email','site','"stockmarketfromthegroundup@gmail.com"'::jsonb,true,'Public support email.'),
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
-- Compatibility-safe for older forum_reports layouts.
-- ============================================================
create table if not exists public.forum_reports (
  id bigint generated always as identity primary key,
  reporter_user_id uuid references auth.users(id) on delete cascade,
  content_type text,
  content_id text,
  reason text,
  details text,
  status text not null default 'open',
  resolved_by uuid references auth.users(id) on delete set null,
  resolution_note text,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

-- If forum_reports existed from an earlier build, add the current v0.10 fields rather than failing.
alter table public.forum_reports add column if not exists reporter_user_id uuid references auth.users(id) on delete cascade;
alter table public.forum_reports add column if not exists content_type text;
alter table public.forum_reports add column if not exists content_id text;
alter table public.forum_reports add column if not exists reason text;
alter table public.forum_reports add column if not exists details text;
alter table public.forum_reports add column if not exists status text default 'open';
alter table public.forum_reports add column if not exists resolved_by uuid references auth.users(id) on delete set null;
alter table public.forum_reports add column if not exists resolution_note text;
alter table public.forum_reports add column if not exists created_at timestamptz default now();
alter table public.forum_reports add column if not exists resolved_at timestamptz;

-- Best-effort backfill from common legacy reporter column names if present.
do $$
begin
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='forum_reports' and column_name='reporter_id') then
    execute 'update public.forum_reports set reporter_user_id=reporter_id where reporter_user_id is null';
  elsif exists (select 1 from information_schema.columns where table_schema='public' and table_name='forum_reports' and column_name='reported_by') then
    execute 'update public.forum_reports set reporter_user_id=reported_by where reporter_user_id is null';
  elsif exists (select 1 from information_schema.columns where table_schema='public' and table_name='forum_reports' and column_name='user_id') then
    execute 'update public.forum_reports set reporter_user_id=user_id where reporter_user_id is null';
  end if;
end $$;

-- Add current validation without breaking legacy rows that predate these fields.
do $$
begin
  if not exists (select 1 from pg_constraint where conname='forum_reports_content_type_check') then
    alter table public.forum_reports add constraint forum_reports_content_type_check
      check (content_type is null or content_type in ('topic','post','user'));
  end if;
  if not exists (select 1 from pg_constraint where conname='forum_reports_status_check') then
    alter table public.forum_reports add constraint forum_reports_status_check
      check (status is null or status in ('open','reviewing','resolved','dismissed'));
  end if;
end $$;

create index if not exists forum_reports_status_idx on public.forum_reports(status,created_at desc);
alter table public.forum_reports enable row level security;
drop policy if exists "users create own reports" on public.forum_reports;
create policy "users create own reports" on public.forum_reports for insert to authenticated
  with check (reporter_user_id is not null and auth.uid()=reporter_user_id);
drop policy if exists "users read own reports" on public.forum_reports;
create policy "users read own reports" on public.forum_reports for select to authenticated
  using (reporter_user_id is not null and auth.uid()=reporter_user_id);
revoke all on public.forum_reports from anon,authenticated;
grant select,insert on public.forum_reports to authenticated;

-- Service role needs sequences used by admin/server inserts.
grant usage,select on sequence public.admin_audit_log_id_seq to service_role;
grant usage,select on sequence public.admin_user_notes_id_seq to service_role;
do $$ begin
  if to_regclass('public.forum_reports_id_seq') is not null then
    execute 'grant usage,select on sequence public.forum_reports_id_seq to service_role';
  end if;
end $$;

-- Keep the original static JSON as a deployment fallback. v0.10 public pages prefer these database tables when available.


-- ============================================================
-- ADMIN ACCOUNT DIRECTORY VIEW
-- Roles/status stay normalized; this view gives administrators a single table-like directory.
-- ============================================================
create or replace view public.admin_account_directory as
select
  p.id,
  p.email,
  p.email_verified,
  p.username,
  p.display_name,
  p.first_name,
  p.last_name,
  p.timezone,
  p.locale,
  p.session_timeout_minutes,
  p.created_at,
  p.updated_at,
  p.last_seen_at,
  coalesce(f.status,'active') as account_status,
  coalesce(array_agg(distinct r.role_code) filter (where r.role_code is not null),array[]::text[]) as staff_roles,
  coalesce(bool_or(r.role_code='OWNER'),false) as is_owner,
  coalesce(bool_or(r.role_code='ADMIN'),false) as is_admin,
  coalesce(bool_or(r.role_code='MODERATOR'),false) as is_moderator,
  exists (
    select 1 from public.entitlements e
    where e.user_id=p.id and e.product_key='full_learning_access'
      and e.status in ('active','trialing')
      and (e.starts_at is null or e.starts_at<=now())
      and (e.ends_at is null or e.ends_at>now())
  ) as full_learning_access,
  (select count(*) from public.user_library ul where ul.user_id=p.id and (ul.expires_at is null or ul.expires_at>now())) as library_item_count
from public.profiles p
left join public.admin_user_flags f on f.user_id=p.id
left join public.admin_user_roles r on r.user_id=p.id and (r.expires_at is null or r.expires_at>now())
group by p.id,p.email,p.email_verified,p.username,p.display_name,p.first_name,p.last_name,p.timezone,p.locale,p.session_timeout_minutes,p.created_at,p.updated_at,p.last_seen_at,f.status;

revoke all on public.admin_account_directory from anon,authenticated;
grant select on public.admin_account_directory to service_role;


-- ============================================================
-- v0.11 ADVANCED PLATFORM ARCHITECTURE
-- Memberships, À-la-Carte tools, lifetime/all-books access,
-- branching navigation, advertising, market-data connections,
-- historical context envelopes, and advanced tool workspaces.
-- ============================================================

-- ---------- Catalog evolution ----------
alter table public.catalog_products add column if not exists publication_status text not null default 'coming_soon';
alter table public.catalog_products add column if not exists branch_slug text;
alter table public.catalog_products add column if not exists included_lifetime boolean not null default true;
alter table public.catalog_products add column if not exists edition_label text;
alter table public.catalog_products add column if not exists companion_url text;
alter table public.catalog_products add column if not exists release_date date;

do $$ begin
  if not exists (select 1 from pg_constraint where conname='catalog_products_publication_status_check') then
    alter table public.catalog_products add constraint catalog_products_publication_status_check
      check (publication_status in ('in_development','coming_soon','publication_candidate','published','archived'));
  end if;
end $$;

update public.catalog_products set publication_status='publication_candidate',branch_slug='foundations',included_lifetime=true where product_code in ('FOUNDATION_BOOK_1','FOUNDATION_BOOK_2','FOUNDATION_BOOK_3');
update public.catalog_products set title='Stock Market Foundations, Book I: Understanding the Stock Market',short_title='Foundations Book I' where product_code='FOUNDATION_BOOK_1';
update public.catalog_products set title='Stock Market Foundations, Book II: Learning to Read the Market',short_title='Foundations Book II' where product_code='FOUNDATION_BOOK_2';
update public.catalog_products set title='Stock Market Foundations, Book III: Building the Trading Decision',short_title='Foundations Book III' where product_code='FOUNDATION_BOOK_3';

insert into public.catalog_products(
  product_code,product_type,family,title,short_title,author,publisher,description,active,sort_order,
  kdp_select,companion_access,book_key_trial_days,direct_digital_enabled,direct_physical_enabled,
  publication_status,branch_slug,included_lifetime,edition_label
) values
('DAY_TRADING_BOOK_1','book','day-trading','Day Trading','Day Trading — Book 1','J. S. Grant','Crown & Lantern Press','Advanced day-trading curriculum branch. Added to the platform catalog before final publication so learning access, Store, Library, Tutor, and Lifetime coverage are ready.',true,40,true,true,30,false,false,'in_development','day-trading',true,'v3.11 working edition'),
('READING_THE_TAPE','book','reading-the-tape','READING THE TAPE — Time & Sales, Level II, and Modern Order Flow','Reading the Tape','J. S. Grant','Crown & Lantern Press','Special-study branch for Time & Sales, Level II, liquidity, queue mechanics, DOM, footprint concepts, and modern order flow. Added before final publication.',true,50,true,true,30,false,false,'in_development','reading-the-tape',true,'v2.6 working edition')
on conflict(product_code) do update set
  family=excluded.family,title=excluded.title,short_title=excluded.short_title,author=excluded.author,publisher=excluded.publisher,
  description=excluded.description,active=excluded.active,sort_order=excluded.sort_order,companion_access=excluded.companion_access,
  publication_status=excluded.publication_status,branch_slug=excluded.branch_slug,included_lifetime=excluded.included_lifetime,edition_label=excluded.edition_label;

-- ---------- Plans ----------
create table if not exists public.platform_plans (
  plan_code text primary key,
  name text not null,
  description text,
  price_cents integer not null default 0 check(price_cents>=0),
  currency text not null default 'USD',
  billing_interval text not null default 'none' check (billing_interval in ('none','month','year','lifetime')),
  active boolean not null default true,
  public_visible boolean not null default true,
  ad_free boolean not null default false,
  includes_all_tools boolean not null default false,
  includes_all_books boolean not null default false,
  checkout_url text,
  sort_order integer not null default 100,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.platform_plans enable row level security;
drop policy if exists "public reads active plans" on public.platform_plans;
create policy "public reads active plans" on public.platform_plans for select to anon,authenticated using(active=true and public_visible=true);
revoke all on public.platform_plans from anon,authenticated;
grant select on public.platform_plans to anon,authenticated;

insert into public.platform_plans(plan_code,name,description,price_cents,billing_interval,active,public_visible,ad_free,includes_all_tools,includes_all_books,sort_order,metadata) values
('FREE','Free','Free account with public samples, limited learning tools, limited Tutor access, basic progress, and selected trial experiences.',0,'none',true,true,false,false,false,10,'{"journal_limit":10,"simulator_sessions_month":3}'::jsonb),
('FULL_MONTHLY','Full Platform — Monthly','All released first-party learning, journal, simulator, Tutor, research, execution, tape, and analytics tools. Ad-free.',6999,'month',true,true,true,true,false,20,'{}'::jsonb),
('FULL_ANNUAL','Full Platform — Annual','Everything in Full Monthly with annual billing. Ad-free.',69900,'year',true,true,true,true,false,30,'{}'::jsonb),
('LIFETIME','Lifetime Platform Access','Permanent access to all released and future first-party platform tools plus companion access to every J. S. Grant trading book in this platform. Third-party services with unavoidable per-user costs may remain separate add-ons.',249900,'lifetime',true,true,true,true,true,40,'{"future_first_party_tools":true,"future_first_party_books":true}'::jsonb)
on conflict(plan_code) do update set name=excluded.name,description=excluded.description,price_cents=excluded.price_cents,billing_interval=excluded.billing_interval,active=excluded.active,public_visible=excluded.public_visible,ad_free=excluded.ad_free,includes_all_tools=excluded.includes_all_tools,includes_all_books=excluded.includes_all_books,sort_order=excluded.sort_order,metadata=excluded.metadata,updated_at=now();

-- ---------- Tool registry / À-la-Carte ----------
create table if not exists public.platform_tools (
  tool_code text primary key,
  name text not null,
  category text not null,
  description text,
  href text,
  status text not null default 'planned' check(status in ('live','beta','planned','paused','retired')),
  active boolean not null default true,
  public_visible boolean not null default true,
  included_full boolean not null default true,
  included_lifetime boolean not null default true,
  individual_price_cents integer not null default 2999 check(individual_price_cents>=0),
  individual_checkout_url text,
  free_preview boolean not null default false,
  sort_order integer not null default 100,
  data_requirement text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.platform_tools add column if not exists individual_checkout_url text;
alter table public.platform_tools enable row level security;
drop policy if exists "public reads active tools" on public.platform_tools;
create policy "public reads active tools" on public.platform_tools for select to anon,authenticated using(active=true and public_visible=true);
revoke all on public.platform_tools from anon,authenticated;
grant select on public.platform_tools to anon,authenticated;

insert into public.platform_tools(tool_code,name,category,description,href,status,free_preview,sort_order,data_requirement,metadata) values
('INTERACTIVE_LEARNING','Interactive Learning & Historical Labs','Learn','Guided, Practice, Blind Decision, Assessment, competency tracking, adaptive practice, comparison mode, challenges, and verified Historical Lab training.','learn.html','live',true,10,'Historical Lab metadata and teaching datasets','{}'),
('JOURNAL_ANALYTICS','Trading Journal & Performance Analytics','Trade Lab','Live, paper, simulator, observation/NO TRADE records, Plan vs. Actual, MFE/MAE, R, behavioral analytics, delayed reviews, and strategy validation.','journal.html','live',true,20,'User-entered or imported trade records','{}'),
('MARKET_SIMULATOR','Advanced Market Simulator & Replay','Trade Lab','No-look-ahead replay with long/short execution, locked plans, session context, MFE/MAE, journal integration, and data-source adapters.','simulator.html','live',true,30,'CSV, curated teaching dataset, or connected market-data provider','{}'),
('MARKET_TUTOR','Market Tutor','Learn','Companion teaching, terminology, skill diagnosis, journal/lab weakness analysis, related practice, and future enhanced AI responses.','market-tutor.html','live',true,40,'Companion knowledge + user learning history','{}'),
('DISCOVERY_LAB','Market Discovery Lab','Research','Learn candidate discovery using configurable price, volume, RVOL, float, spread, gap, liquidity, HOD proximity, catalyst, and session evidence.','advanced-tool.html?tool=DISCOVERY_LAB','beta',false,50,'Universe CSV or future licensed/connected market data','{}'),
('SCANNER_BUILDER','Scanner Builder & Historical Scanner Replay','Research','Build educational scanner logic, save filter sets, and test criteria on historical candidate datasets without copying proprietary scanner systems.','advanced-tool.html?tool=SCANNER_BUILDER','beta',false,60,'Universe CSV or historical dataset','{}'),
('WATCHLIST_WORKBENCH','Watchlist & Trade-Plan Workbench','Research','Move candidates from discovery to WATCH, READY, INVALID, or NO TRADE with levels, catalyst, invalidation, entry conditions, and risk.','advanced-tool.html?tool=WATCHLIST_WORKBENCH','beta',false,70,'User research + optional market data','{}'),
('CATALYST_RESEARCH','Catalyst & Filing Research Lab','Research','Teach catalyst verification, filings, financing, offerings, warrants, reverse splits, dilution, and source quality.','advanced-tool.html?tool=CATALYST_RESEARCH','beta',false,80,'SEC EDGAR + user research','{}'),
('FLOAT_SUPPLY_LAB','Float & Supply Lab','Research','Interactive float turnover, shares outstanding, market cap, dilution, reverse-split, warrant, and supply calculations.','advanced-tool.html?tool=FLOAT_SUPPLY_LAB','beta',false,90,'User inputs / verified company data','{}'),
('MARKET_STRUCTURE_LAB','Market Structure Lab','Learn','Interactive HH/HL/LH/LL, trend, range, breakout, failure, reclaim, compression, and expansion training.','advanced-tool.html?tool=MARKET_STRUCTURE_LAB','beta',false,100,'OHLCV teaching dataset','{}'),
('MULTI_TIMEFRAME_LAB','Multi-Timeframe Synchronizer','Learn','Synchronize 1m/3m/5m/15m/Daily context and train confirmation/conflict reasoning.','advanced-tool.html?tool=MULTI_TIMEFRAME_LAB','beta',false,110,'1-minute OHLCV and daily context','{}'),
('RISK_POSITION_LAB','Risk & Position Sizing Laboratory','Trade Lab','Calculate risk/share, share size, account exposure, R:R, slippage sensitivity, and scenario risk.','advanced-tool.html?tool=RISK_POSITION_LAB','beta',true,120,'User inputs','{}'),
('EXECUTION_LAB','Execution Laboratory','Trade Lab','Teach market/limit/stop/stop-limit choices, spread, slippage, partial-fill impact, and execution-quality tradeoffs.','advanced-tool.html?tool=EXECUTION_LAB','beta',false,130,'User inputs / optional quote data','{}'),
('LIQUIDITY_SPREAD_LAB','Liquidity & Spread Laboratory','Trade Lab','Quantify spread %, round-trip friction, liquidity risk, and how execution changes real trade risk.','advanced-tool.html?tool=LIQUIDITY_SPREAD_LAB','beta',false,140,'Quote/spread inputs','{}'),
('HALT_SSR_LAB','Halt / SSR / Abnormal Market Lab','Learn','Scenario training for volatility halts, resume risk, SSR context, spread changes, and abnormal execution conditions.','advanced-tool.html?tool=HALT_SSR_LAB','beta',false,150,'Scenario library + market context','{}'),
('PATTERN_FAILURE_LIBRARY','Pattern & Failure Library','Learn','Study strong, marginal, failed, false-positive, and NO TRADE examples across the curriculum.','advanced-tool.html?tool=PATTERN_FAILURE_LIBRARY','beta',false,160,'Historical Lab Registry','{}'),
('ORDER_FLOW_TAPE_LAB','Order Flow & Tape Laboratory','Trade Lab','Replay Time & Sales / quote-style CSV data, classify prints, examine pace, average size, bid/ask interaction, and later synchronize Level II/DOM/footprint data when available.','advanced-tool.html?tool=ORDER_FLOW_TAPE_LAB','beta',false,170,'Time & Sales / quote dataset','{}'),
('MARKET_CONTEXT_LAB','Market Context & Regime Lab','Research','Teach market/sector/session context so chart patterns are not studied in isolation.','advanced-tool.html?tool=MARKET_CONTEXT_LAB','beta',false,180,'OHLCV + optional index/sector context','{}'),
('TRADE_REVIEW_REPLAY','Trade Review Replay','Trade Lab','Replay a member’s own trade with plan, actual entry/exit, MFE/MAE, mistakes, and delayed review prompts.','advanced-tool.html?tool=TRADE_REVIEW_REPLAY','beta',false,190,'Trading Journal + replay dataset','{}'),
('STRATEGY_VALIDATION','Strategy Validation Lab','Trade Lab','Analyze journal-defined setups by N, win rate, expectancy, average/median R, MFE/MAE, time, catalyst, spread, and context.','advanced-tool.html?tool=STRATEGY_VALIDATION','beta',false,200,'Trading Journal records','{}'),
('OPTIONS_LAB','Options Learning & Simulator','Trade Lab','Planned branch for option chains, Greeks, IV, contract selection, time decay, single-leg and multi-leg simulation, assignment/exercise, and risk graphs.','advanced-tool.html?tool=OPTIONS_LAB','planned',false,210,'Licensed/user-connected options data','{"planned":true}')
on conflict(tool_code) do update set name=excluded.name,category=excluded.category,description=excluded.description,href=excluded.href,status=excluded.status,active=true,public_visible=true,included_full=true,included_lifetime=true,individual_price_cents=2999,free_preview=excluded.free_preview,sort_order=excluded.sort_order,data_requirement=excluded.data_requirement,metadata=excluded.metadata,updated_at=now();

create table if not exists public.plan_tool_access (
  plan_code text not null references public.platform_plans(plan_code) on delete cascade,
  tool_code text not null references public.platform_tools(tool_code) on delete cascade,
  primary key(plan_code,tool_code)
);
alter table public.plan_tool_access enable row level security;
drop policy if exists "public reads plan tools" on public.plan_tool_access;
create policy "public reads plan tools" on public.plan_tool_access for select to anon,authenticated using(true);
revoke all on public.plan_tool_access from anon,authenticated;
grant select on public.plan_tool_access to anon,authenticated;

insert into public.plan_tool_access(plan_code,tool_code)
select p.plan_code,t.tool_code from public.platform_plans p cross join public.platform_tools t
where p.plan_code in ('FULL_MONTHLY','FULL_ANNUAL','LIFETIME') and t.active=true and t.status<>'retired'
on conflict do nothing;

create table if not exists public.user_plan_grants (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_code text not null references public.platform_plans(plan_code),
  status text not null default 'active' check(status in ('trialing','active','paused','canceled','expired')),
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  source text not null default 'admin',
  source_reference text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists user_plan_grants_user_idx on public.user_plan_grants(user_id,status,ends_at);
alter table public.user_plan_grants enable row level security;
drop policy if exists "read own plan grants" on public.user_plan_grants;
create policy "read own plan grants" on public.user_plan_grants for select to authenticated using(auth.uid()=user_id);
revoke all on public.user_plan_grants from anon,authenticated;
grant select on public.user_plan_grants to authenticated;
grant usage,select on sequence public.user_plan_grants_id_seq to service_role;

create table if not exists public.user_tool_passes (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  tool_code text not null references public.platform_tools(tool_code),
  status text not null default 'active' check(status in ('trialing','active','paused','canceled','expired')),
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  provider text,
  provider_subscription_id text,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists user_tool_passes_provider_uidx on public.user_tool_passes(provider,provider_subscription_id) where provider_subscription_id is not null;
create index if not exists user_tool_passes_user_idx on public.user_tool_passes(user_id,status,current_period_end);
alter table public.user_tool_passes enable row level security;
drop policy if exists "read own tool passes" on public.user_tool_passes;
create policy "read own tool passes" on public.user_tool_passes for select to authenticated using(auth.uid()=user_id);
revoke all on public.user_tool_passes from anon,authenticated;
grant select on public.user_tool_passes to authenticated;
grant usage,select on sequence public.user_tool_passes_id_seq to service_role;

-- Generic per-user workspace records power saved scanner filters, watchlists, research notes, and advanced labs.
create table if not exists public.tool_workspace_records (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  tool_code text not null references public.platform_tools(tool_code),
  record_type text not null default 'workspace',
  title text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists tool_workspace_user_idx on public.tool_workspace_records(user_id,tool_code,updated_at desc);
alter table public.tool_workspace_records enable row level security;
drop policy if exists "manage own tool workspaces" on public.tool_workspace_records;
create policy "manage own tool workspaces" on public.tool_workspace_records for all to authenticated using(auth.uid()=user_id) with check(auth.uid()=user_id);
revoke all on public.tool_workspace_records from anon,authenticated;
grant select,insert,update,delete on public.tool_workspace_records to authenticated;
grant usage,select on sequence public.tool_workspace_records_id_seq to authenticated,service_role;

-- ---------- Advertising / sponsorship ----------
create table if not exists public.advertisers (
  id bigint generated always as identity primary key,
  name text not null,
  contact_name text,
  contact_email text,
  website_url text,
  status text not null default 'prospect' check(status in ('prospect','active','paused','rejected','closed')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.ad_placements (
  placement_code text primary key,
  name text not null,
  description text,
  page_pattern text not null default '*',
  slot_position text not null default 'inline',
  active boolean not null default true,
  free_only boolean not null default true,
  dimensions text,
  sort_order integer not null default 100,
  metadata jsonb not null default '{}'::jsonb
);
create table if not exists public.ad_campaigns (
  id bigint generated always as identity primary key,
  advertiser_id bigint not null references public.advertisers(id) on delete cascade,
  name text not null,
  status text not null default 'draft' check(status in ('draft','scheduled','active','paused','completed','canceled')),
  billing_model text not null default 'flat' check(billing_model in ('flat','cpm','cpc','sponsorship')),
  amount_cents integer not null default 0 check(amount_cents>=0),
  budget_cents integer,
  starts_at timestamptz,
  ends_at timestamptz,
  impression_limit bigint,
  click_limit bigint,
  audience jsonb not null default '{"free":true,"signed_out":true,"tool_pass":true,"full":false}'::jsonb,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.ad_creatives (
  id bigint generated always as identity primary key,
  campaign_id bigint not null references public.ad_campaigns(id) on delete cascade,
  placement_code text not null references public.ad_placements(placement_code),
  status text not null default 'draft' check(status in ('draft','approved','active','paused','rejected','archived')),
  headline text,
  body text,
  image_url text,
  destination_url text not null,
  disclosure_label text not null default 'Advertisement',
  alt_text text,
  utm jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.ad_events (
  id bigint generated always as identity primary key,
  campaign_id bigint references public.ad_campaigns(id) on delete set null,
  creative_id bigint references public.ad_creatives(id) on delete set null,
  placement_code text,
  event_type text not null check(event_type in ('impression','click')),
  user_id uuid references auth.users(id) on delete set null,
  session_hash text,
  page_path text,
  created_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);
create index if not exists ad_events_campaign_idx on public.ad_events(campaign_id,event_type,created_at desc);

insert into public.ad_placements(placement_code,name,description,page_pattern,slot_position,active,free_only,dimensions,sort_order) values
('HOME_INLINE','Home — Inline Sponsor','Single clearly labeled sponsor block on the public home experience.','/index.html','inline',true,true,'responsive',10),
('STORE_INLINE','Store — Sponsor','Sponsor slot below first-party product content; never mixed into product rankings.','/store.html','inline',true,true,'responsive',20),
('COMMUNITY_INLINE','Community — Sponsor','Clearly labeled sponsor block outside user posts.','/forum.html','inline',true,true,'responsive',30),
('FREE_DASHBOARD','Free Dashboard — Sponsor','Sponsor block for Free/À-la-Carte accounts; Full plans remain ad-free.','/dashboard.html','inline',true,true,'responsive',40),
('SAMPLE_LABS','Sample Labs — Sponsor','Sponsor block outside the teaching decision sequence.','/lab-samples.html','inline',true,true,'responsive',50)
on conflict(placement_code) do update set name=excluded.name,description=excluded.description,page_pattern=excluded.page_pattern,slot_position=excluded.slot_position,active=excluded.active,free_only=excluded.free_only,dimensions=excluded.dimensions,sort_order=excluded.sort_order;

-- Ad tables are server/admin managed. No browser write access.
do $$ declare t text; begin
  foreach t in array array['advertisers','ad_placements','ad_campaigns','ad_creatives','ad_events'] loop
    execute format('alter table public.%I enable row level security',t);
    execute format('revoke all on public.%I from anon,authenticated',t);
  end loop;
end $$;
grant usage,select on sequence public.advertisers_id_seq to service_role;
grant usage,select on sequence public.ad_campaigns_id_seq to service_role;
grant usage,select on sequence public.ad_creatives_id_seq to service_role;
grant usage,select on sequence public.ad_events_id_seq to service_role;

-- ---------- Market data / teaching datasets ----------
create table if not exists public.market_data_providers (
  provider_code text primary key,
  name text not null,
  description text,
  connection_mode text not null default 'byo_token' check(connection_mode in ('byo_token','public','server_license','upload')),
  status text not null default 'beta' check(status in ('live','beta','planned','paused')),
  active boolean not null default true,
  coverage text,
  hours text,
  documentation_url text,
  metadata jsonb not null default '{}'::jsonb,
  sort_order integer not null default 100
);
alter table public.market_data_providers enable row level security;
drop policy if exists "public reads data providers" on public.market_data_providers;
create policy "public reads data providers" on public.market_data_providers for select to authenticated using(active=true);
revoke all on public.market_data_providers from anon,authenticated;
grant select on public.market_data_providers to authenticated;

insert into public.market_data_providers(provider_code,name,description,connection_mode,status,coverage,hours,documentation_url,sort_order,metadata) values
('TIINGO_BYO','Tiingo — Bring Your Own Token','User-connected Tiingo data. Consolidated equity intraday endpoint can cover 4:00 AM–8:00 PM ET where supported; endpoint is currently beta.','byo_token','beta','US equities/ETFs consolidated derived intraday','04:00–20:00 ET','https://www.tiingo.com/documentation/equity-realtime-stock-data',10,'{"commercial_mode":"user_entitlement","beta_endpoint":true}'::jsonb),
('IEX_HIST','IEX Historical Reference','Free historical IEX-specific reference data. Not consolidated U.S. market data.','public','live','IEX Exchange','IEX session-specific','https://www.iex.io/products/equities/market-data-connectivity',20,'{}'::jsonb),
('CSV_UPLOAD','User CSV / Teaching Dataset','User-provided or verified first-party OHLCV/Time & Sales datasets processed locally or through the platform.','upload','live','User supplied','Any supplied coverage','',30,'{}'::jsonb),
('ALPACA_BYO','Alpaca — Bring Your Own Connection','Planned user-connected Alpaca adapter. Free Basic real-time equity coverage is IEX; commercial redistribution is not assumed.','byo_token','planned','US equities/options depending user entitlement','Provider-specific','https://docs.alpaca.markets/',40,'{}'::jsonb)
on conflict(provider_code) do update set name=excluded.name,description=excluded.description,connection_mode=excluded.connection_mode,status=excluded.status,active=true,coverage=excluded.coverage,hours=excluded.hours,documentation_url=excluded.documentation_url,sort_order=excluded.sort_order,metadata=excluded.metadata;

create table if not exists public.user_market_data_connections (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  provider_code text not null references public.market_data_providers(provider_code),
  display_label text,
  credential_ciphertext text,
  credential_iv text,
  status text not null default 'disconnected' check(status in ('connected','disconnected','error','pending')),
  last_tested_at timestamptz,
  last_error text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id,provider_code)
);
alter table public.user_market_data_connections enable row level security;
revoke all on public.user_market_data_connections from anon,authenticated;
grant usage,select on sequence public.user_market_data_connections_id_seq to service_role;

create table if not exists public.market_datasets (
  dataset_code text primary key,
  title text not null,
  ticker text,
  provider_code text references public.market_data_providers(provider_code),
  dataset_type text not null default 'ohlcv' check(dataset_type in ('ohlcv','timesales','quotes','level2','options','mixed')),
  interval_label text,
  timezone text not null default 'America/New_York',
  start_at timestamptz,
  end_at timestamptz,
  raw_adjusted text not null default 'raw' check(raw_adjusted in ('raw','adjusted','both')),
  storage_path text,
  source_attribution text,
  license_note text,
  status text not null default 'draft' check(status in ('draft','verified','published','archived')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.historical_context_envelopes (
  envelope_code text primary key,
  title text not null,
  ticker text not null,
  lab_id text,
  dataset_code text references public.market_datasets(dataset_code) on delete set null,
  context_start_at timestamptz not null,
  teaching_start_at timestamptz not null,
  teaching_end_at timestamptz not null,
  context_end_at timestamptz not null,
  decision_boundary_at timestamptz,
  multi_day_runner boolean not null default false,
  session_model text not null default 'MORNING_DAY_NIGHT',
  corporate_actions jsonb not null default '[]'::jsonb,
  catalyst_context jsonb not null default '{}'::jsonb,
  display_config jsonb not null default '{"premarket":"04:00-09:30","regular":"09:30-16:00","afterhours":"16:00-20:00"}'::jsonb,
  status text not null default 'draft' check(status in ('draft','verified','published','archived')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists context_envelope_ticker_idx on public.historical_context_envelopes(ticker,teaching_start_at);

do $$ declare t text; begin
  foreach t in array array['market_datasets','historical_context_envelopes'] loop
    execute format('alter table public.%I enable row level security',t);
    execute format('revoke all on public.%I from anon,authenticated',t);
  end loop;
end $$;
-- Published/verified metadata can be read by authenticated learners; raw credentials/data storage stays protected.
drop policy if exists "authenticated reads teaching datasets" on public.market_datasets;
create policy "authenticated reads teaching datasets" on public.market_datasets for select to authenticated using(status in ('verified','published'));
drop policy if exists "authenticated reads context envelopes" on public.historical_context_envelopes;
create policy "authenticated reads context envelopes" on public.historical_context_envelopes for select to authenticated using(status in ('verified','published'));
grant select on public.market_datasets,public.historical_context_envelopes to authenticated;

-- ---------- Own-access snapshot ----------
create or replace function public.my_platform_access()
returns jsonb
language plpgsql
security definer
set search_path=public,auth
as $$
declare
  uid uuid := auth.uid();
  staff_roles text[] := array[]::text[];
  selected_plan text := 'FREE';
  selected_plan_name text := 'Free';
  renewal_at timestamptz := null;
  expires_at timestamptz := null;
  ad_free boolean := false;
  has_all_tools boolean := false;
  has_all_books boolean := false;
  legacy_full boolean := false;
  is_owner boolean := false;
  control_panel boolean := false;
  tools jsonb := '[]'::jsonb;
  books jsonb := '[]'::jsonb;
  passes jsonb := '[]'::jsonb;
  subrow record;
  grantrow record;
begin
  if uid is null then
    return jsonb_build_object('authenticated',false,'planCode','FREE','planName','Free','staffRoles',staff_roles,'controlPanel',false,'adFree',false,'tools','[]'::jsonb,'books','[]'::jsonb);
  end if;

  select coalesce(array_agg(distinct role_code) filter(where role_code is not null),array[]::text[])
    into staff_roles from public.admin_user_roles
    where user_id=uid and (expires_at is null or expires_at>now());
  is_owner := 'OWNER'=any(staff_roles);
  select exists(
    select 1 from public.admin_user_roles ur
    join public.admin_role_permissions rp on rp.role_code=ur.role_code
    where ur.user_id=uid and (ur.expires_at is null or ur.expires_at>now()) and rp.permission_code='control_panel.access'
  ) into control_panel;

  -- Permanent/admin grants take priority: LIFETIME > ANNUAL > MONTHLY > FREE.
  select g.plan_code,g.ends_at,p.name,p.ad_free,p.includes_all_tools,p.includes_all_books
  into grantrow
  from public.user_plan_grants g join public.platform_plans p on p.plan_code=g.plan_code
  where g.user_id=uid and g.status in ('trialing','active') and g.starts_at<=now() and (g.ends_at is null or g.ends_at>now())
  order by case g.plan_code when 'LIFETIME' then 1 when 'FULL_ANNUAL' then 2 when 'FULL_MONTHLY' then 3 else 10 end, g.created_at desc
  limit 1;

  -- Active paid subscription may supply current renewal date.
  select s.plan_code,s.current_period_end,p.name,p.ad_free,p.includes_all_tools,p.includes_all_books
  into subrow
  from public.site_subscriptions s join public.platform_plans p on p.plan_code=s.plan_code
  where s.user_id=uid and s.status in ('trialing','active') and (s.current_period_end is null or s.current_period_end>now())
  order by case s.plan_code when 'LIFETIME' then 1 when 'FULL_ANNUAL' then 2 when 'FULL_MONTHLY' then 3 else 10 end, s.created_at desc
  limit 1;

  if is_owner then
    selected_plan:='LIFETIME'; selected_plan_name:='Full Platform — Permanent Administrative Access'; ad_free:=true; has_all_tools:=true; has_all_books:=true;
  elsif grantrow.plan_code is not null then
    selected_plan:=grantrow.plan_code; selected_plan_name:=grantrow.name; expires_at:=grantrow.ends_at; ad_free:=grantrow.ad_free; has_all_tools:=grantrow.includes_all_tools; has_all_books:=grantrow.includes_all_books;
  elsif subrow.plan_code is not null then
    selected_plan:=subrow.plan_code; selected_plan_name:=subrow.name; renewal_at:=subrow.current_period_end; ad_free:=subrow.ad_free; has_all_tools:=subrow.includes_all_tools; has_all_books:=subrow.includes_all_books;
  else
    select exists(select 1 from public.entitlements e where e.user_id=uid and e.product_key='full_learning_access' and e.status in ('active','trialing') and (e.starts_at is null or e.starts_at<=now()) and (e.ends_at is null or e.ends_at>now())) into legacy_full;
    if legacy_full then
      selected_plan:='BOOK_TRIAL'; selected_plan_name:='Full Platform — Book Trial'; has_all_tools:=true;
      select max(e.ends_at) into expires_at from public.entitlements e where e.user_id=uid and e.product_key='full_learning_access' and e.status in ('active','trialing');
    end if;
  end if;

  select coalesce(jsonb_agg(x order by x->>'name'),'[]'::jsonb) into passes
  from (
    select jsonb_build_object('toolCode',t.tool_code,'name',t.name,'href',t.href,'status',up.status,'renewsAt',up.current_period_end,'expiresAt',up.ends_at,'cancelAtPeriodEnd',up.cancel_at_period_end) x
    from public.user_tool_passes up join public.platform_tools t on t.tool_code=up.tool_code
    where up.user_id=uid and up.status in ('trialing','active') and (coalesce(up.current_period_end,up.ends_at) is null or coalesce(up.current_period_end,up.ends_at)>now())
  ) q;

  select coalesce(jsonb_agg(jsonb_build_object(
    'toolCode',t.tool_code,'name',t.name,'category',t.category,'href',t.href,'status',t.status,'description',t.description,
    'included', (has_all_tools and t.status<>'retired') or exists(select 1 from public.user_tool_passes up where up.user_id=uid and up.tool_code=t.tool_code and up.status in ('trialing','active') and (coalesce(up.current_period_end,up.ends_at) is null or coalesce(up.current_period_end,up.ends_at)>now())),
    'freePreview',t.free_preview,'individualPriceCents',t.individual_price_cents
  ) order by t.sort_order),'[]'::jsonb) into tools
  from public.platform_tools t where t.active=true and t.public_visible=true;

  select coalesce(jsonb_agg(jsonb_build_object(
    'productCode',c.product_code,'title',c.title,'shortTitle',c.short_title,'family',c.family,'publicationStatus',c.publication_status,
    'included', has_all_books or exists(select 1 from public.user_library ul where ul.user_id=uid and ul.product_code=c.product_code and (ul.expires_at is null or ul.expires_at>now())),
    'source', case when has_all_books then 'lifetime' else (select ul.source_channel from public.user_library ul where ul.user_id=uid and ul.product_code=c.product_code and (ul.expires_at is null or ul.expires_at>now()) order by ul.granted_at desc limit 1) end
  ) order by c.sort_order),'[]'::jsonb) into books
  from public.catalog_products c where c.active=true and c.product_type='book';

  return jsonb_build_object(
    'authenticated',true,'planCode',selected_plan,'planName',selected_plan_name,'renewsAt',renewal_at,'expiresAt',expires_at,
    'adFree',ad_free,'controlPanel',control_panel,'allTools',has_all_tools,'allBooks',has_all_books,'staffRoles',staff_roles,'toolPasses',passes,'tools',tools,'books',books
  );
end;$$;
grant execute on function public.my_platform_access() to authenticated,anon;

-- Read-safe provider connection summary; never exposes encrypted credentials.
create or replace function public.my_market_data_connections()
returns table(provider_code text,provider_name text,status text,last_tested_at timestamptz,last_error text,updated_at timestamptz)
language sql security definer set search_path=public as $$
  select c.provider_code,p.name,c.status,c.last_tested_at,c.last_error,c.updated_at
  from public.user_market_data_connections c join public.market_data_providers p using(provider_code)
  where c.user_id=auth.uid()
  order by p.sort_order;
$$;
grant execute on function public.my_market_data_connections() to authenticated;

-- ---------- Additional admin permissions ----------
insert into public.admin_permissions(permission_code,category,name,description,risk_level) values
('plans.manage','Commerce','Manage plans and tool passes','Manage plan pricing, plan visibility, and À-la-Carte tool pricing.','high'),
('ads.view','Advertising','View advertising','View advertisers, campaigns, placements, creatives, and ad metrics.','standard'),
('ads.manage','Advertising','Manage advertising','Create/approve/pause advertisers, campaigns, placements, and creatives.','high'),
('datasets.view','Market Data','View market-data catalog','View providers, teaching datasets, and historical context envelopes.','standard'),
('datasets.manage','Market Data','Manage market-data catalog','Manage providers, datasets, context envelopes, and provenance metadata.','high'),
('tools.manage','Platform','Manage tool registry','Manage platform tools, status, descriptions, and access metadata.','high')
on conflict(permission_code) do update set category=excluded.category,name=excluded.name,description=excluded.description,risk_level=excluded.risk_level;

insert into public.admin_role_permissions(role_code,permission_code)
select 'OWNER',permission_code from public.admin_permissions on conflict do nothing;
insert into public.admin_role_permissions(role_code,permission_code)
select 'ADMIN',permission_code from public.admin_permissions where permission_code not in ('owner.manage','users.delete') on conflict do nothing;
insert into public.admin_role_permissions(role_code,permission_code) values
('COMMERCE_MANAGER','plans.manage'),('COMMERCE_MANAGER','ads.view'),('COMMERCE_MANAGER','ads.manage'),
('MARKETING_MANAGER','ads.view'),('MARKETING_MANAGER','ads.manage'),
('MARKET_DATA_MANAGER','datasets.view'),('MARKET_DATA_MANAGER','datasets.manage'),
('LEARNING_MANAGER','tools.manage'),('PUBLISHING_MANAGER','tools.manage'),('QA_RELEASE_MANAGER','datasets.view')
on conflict do nothing;

-- ---------- Public/live settings ----------
insert into public.site_settings(setting_key,category,value,public_read,description) values
('site.version','site','"0.11.2"'::jsonb,true,'Current public website version.'),
('commerce.processing_fee_policy','commerce','"included_in_list_price"'::jsonb,true,'Processing economics are built into list prices; no separate checkout surcharge is enabled until provider/policy review.'),
('commerce.free_plan','commerce','{"planCode":"FREE","label":"Free","price":0,"enabled":true}'::jsonb,true,'Free plan.'),
('commerce.full_monthly','commerce','{"planCode":"FULL_MONTHLY","label":"Full Platform — Monthly","price":69.99,"checkoutUrl":"","enabled":true}'::jsonb,true,'Full monthly plan.'),
('commerce.full_annual','commerce','{"planCode":"FULL_ANNUAL","label":"Full Platform — Annual","price":699.00,"checkoutUrl":"","enabled":true}'::jsonb,true,'Full annual plan.'),
('commerce.lifetime','commerce','{"planCode":"LIFETIME","label":"Lifetime Platform Access","price":2499.00,"checkoutUrl":"","enabled":true}'::jsonb,true,'Lifetime platform access.'),
('commerce.tool_pass_price','commerce','{"price":29.99,"interval":"month","enabled":true}'::jsonb,true,'Default À-la-Carte tool pass price.'),
('feature.advertising','features','true'::jsonb,true,'Direct sponsor/advertising inventory enabled.'),
('feature.advanced_tool_hub','features','true'::jsonb,true,'Advanced Trading/Research tool registry enabled.'),
('feature.market_data_connections','features','true'::jsonb,true,'User market-data connection page enabled.')
on conflict(setting_key) do update set category=excluded.category,value=excluded.value,public_read=excluded.public_read,description=excluded.description,updated_at=now();

-- Update legacy pricing settings so old pages/fallback code no longer show obsolete prices.
insert into public.site_settings(setting_key,category,value,public_read,description) values
('commerce.monthly_plan','commerce','{"planCode":"FULL_MONTHLY","label":"Full Platform — Monthly","price":69.99,"checkoutUrl":"","enabled":true}'::jsonb,true,'Legacy compatibility alias for monthly Full Platform.'),
('commerce.annual_plan','commerce','{"planCode":"FULL_ANNUAL","label":"Full Platform — Annual","price":699.00,"checkoutUrl":"","enabled":true}'::jsonb,true,'Legacy compatibility alias for annual Full Platform.')
on conflict(setting_key) do update set value=excluded.value,description=excluded.description,updated_at=now();

-- ---------- OWNER bootstrap / permanent platform authority ----------
do $$
declare owner_id uuid;
begin
  select id into owner_id from auth.users where lower(email)=lower('stockmarketfromthegroundup@gmail.com') limit 1;
  if owner_id is not null then
    insert into public.admin_user_roles(user_id,role_code,granted_by) values(owner_id,'OWNER',owner_id)
      on conflict(user_id,role_code) do update set expires_at=null;
    insert into public.user_plan_grants(user_id,plan_code,status,starts_at,ends_at,source,source_reference,metadata)
      select owner_id,'LIFETIME','active',now(),null,'owner','OWNER_BOOTSTRAP','{"permanent_admin_access":true}'::jsonb
      where not exists(select 1 from public.user_plan_grants where user_id=owner_id and plan_code='LIFETIME' and status='active' and ends_at is null);
    insert into public.entitlements(user_id,product_key,status,source,starts_at,ends_at)
      values(owner_id,'full_learning_access','active','admin',now(),null)
      on conflict(user_id,product_key) do update set status='active',source='admin',starts_at=coalesce(public.entitlements.starts_at,excluded.starts_at),ends_at=null;
    insert into public.user_library(user_id,product_code,access_type,source_channel,source_reference,expires_at,metadata)
      select owner_id,c.product_code,'companion','admin','OWNER_LIFETIME',null,'{"lifetime":true,"owner":true}'::jsonb
      from public.catalog_products c where c.active=true and c.product_type='book'
      on conflict(user_id,product_code,access_type) do update set expires_at=null,source_channel='admin',source_reference='OWNER_LIFETIME',metadata=public.user_library.metadata || excluded.metadata;
  end if;
end $$;


-- Internal helper used by admin directory. Service/admin only; returns compact plan identity.
create or replace function public.my_platform_access_for_user(target_user uuid)
returns jsonb language plpgsql security definer set search_path=public as $$
declare roles text[]:=array[]::text[]; plan_code text:='FREE'; plan_name text:='Free'; adf boolean:=false; r record;
begin
  select coalesce(array_agg(role_code),array[]::text[]) into roles from public.admin_user_roles where user_id=target_user and (expires_at is null or expires_at>now());
  if 'OWNER'=any(roles) then return jsonb_build_object('planCode','LIFETIME','planName','Full Platform — Permanent Administrative Access','adFree',true); end if;
  select g.plan_code,p.name,p.ad_free into r from public.user_plan_grants g join public.platform_plans p on p.plan_code=g.plan_code where g.user_id=target_user and g.status in ('trialing','active') and g.starts_at<=now() and (g.ends_at is null or g.ends_at>now()) order by case g.plan_code when 'LIFETIME' then 1 when 'FULL_ANNUAL' then 2 when 'FULL_MONTHLY' then 3 else 10 end limit 1;
  if r.plan_code is not null then return jsonb_build_object('planCode',r.plan_code,'planName',r.name,'adFree',r.ad_free); end if;
  select s.plan_code,p.name,p.ad_free into r from public.site_subscriptions s join public.platform_plans p on p.plan_code=s.plan_code where s.user_id=target_user and s.status in ('trialing','active') and (s.current_period_end is null or s.current_period_end>now()) order by case s.plan_code when 'LIFETIME' then 1 when 'FULL_ANNUAL' then 2 when 'FULL_MONTHLY' then 3 else 10 end limit 1;
  if r.plan_code is not null then return jsonb_build_object('planCode',r.plan_code,'planName',r.name,'adFree',r.ad_free); end if;
  if exists(select 1 from public.entitlements e where e.user_id=target_user and e.product_key='full_learning_access' and e.status in ('active','trialing') and (e.ends_at is null or e.ends_at>now())) then
    return jsonb_build_object('planCode','BOOK_TRIAL','planName','Full Platform — Book Trial','adFree',false);
  end if;
  if exists(select 1 from public.user_tool_passes up where up.user_id=target_user and up.status in ('active','trialing') and (coalesce(up.current_period_end,up.ends_at) is null or coalesce(up.current_period_end,up.ends_at)>now())) then
    return jsonb_build_object('planCode','A_LA_CARTE','planName','À-la-Carte Tool Access','adFree',false);
  end if;
  return jsonb_build_object('planCode','FREE','planName','Free','adFree',false);
end;$$;
revoke all on function public.my_platform_access_for_user(uuid) from anon,authenticated;
grant execute on function public.my_platform_access_for_user(uuid) to service_role;

-- ---------- Admin account directory v0.11 ----------
-- PostgreSQL CREATE OR REPLACE VIEW cannot rename/reorder existing output columns.
-- v0.10 exposed full_learning_access/library_item_count, while v0.11 replaces those
-- with platform-plan/ad-free fields. Drop and recreate this internal service-only view.
drop view if exists public.admin_account_directory;
create view public.admin_account_directory as
select
  p.id,p.email,p.email_verified,p.username,p.display_name,p.first_name,p.last_name,p.timezone,p.locale,p.session_timeout_minutes,
  p.created_at,p.updated_at,p.last_seen_at,coalesce(f.status,'active') as account_status,
  coalesce(array_agg(distinct r.role_code) filter(where r.role_code is not null),array[]::text[]) as staff_roles,
  coalesce(bool_or(r.role_code='OWNER'),false) as is_owner,
  coalesce(bool_or(r.role_code='ADMIN'),false) as is_admin,
  coalesce(bool_or(r.role_code='MODERATOR'),false) as is_moderator,
  (public.my_platform_access_for_user(p.id)->>'planCode') as platform_plan_code,
  (public.my_platform_access_for_user(p.id)->>'planName') as platform_plan_name,
  (public.my_platform_access_for_user(p.id)->>'adFree')::boolean as ad_free,
  (select count(*) from public.user_library ul where ul.user_id=p.id and (ul.expires_at is null or ul.expires_at>now())) as explicit_library_item_count
from public.profiles p
left join public.admin_user_flags f on f.user_id=p.id
left join public.admin_user_roles r on r.user_id=p.id and (r.expires_at is null or r.expires_at>now())
group by p.id,p.email,p.email_verified,p.username,p.display_name,p.first_name,p.last_name,p.timezone,p.locale,p.session_timeout_minutes,p.created_at,p.updated_at,p.last_seen_at,f.status;

revoke all on public.admin_account_directory from anon,authenticated;
grant select on public.admin_account_directory to service_role;

-- ---------- Tool-access helper and Free usage safeguards ----------
create or replace function public.user_has_tool_access(target_user uuid,target_tool text)
returns boolean language plpgsql security definer set search_path=public as $$
declare info jsonb;begin
  if target_user is null then return false; end if;
  if exists(select 1 from public.admin_user_roles where user_id=target_user and role_code='OWNER' and (expires_at is null or expires_at>now())) then return true; end if;
  if exists(select 1 from public.user_plan_grants g join public.platform_plans p on p.plan_code=g.plan_code where g.user_id=target_user and g.status in ('active','trialing') and g.starts_at<=now() and (g.ends_at is null or g.ends_at>now()) and p.includes_all_tools=true) then return true; end if;
  if exists(select 1 from public.site_subscriptions s join public.platform_plans p on p.plan_code=s.plan_code where s.user_id=target_user and s.status in ('active','trialing') and (s.current_period_end is null or s.current_period_end>now()) and p.includes_all_tools=true) then return true; end if;
  if exists(select 1 from public.entitlements e where e.user_id=target_user and e.product_key='full_learning_access' and e.status in ('active','trialing') and (e.ends_at is null or e.ends_at>now())) then return true; end if;
  if exists(select 1 from public.user_tool_passes up where up.user_id=target_user and up.tool_code=target_tool and up.status in ('active','trialing') and (coalesce(up.current_period_end,up.ends_at) is null or coalesce(up.current_period_end,up.ends_at)>now())) then return true; end if;
  return false;
end;$$;
revoke all on function public.user_has_tool_access(uuid,text) from anon,authenticated;
grant execute on function public.user_has_tool_access(uuid,text) to service_role;

create or replace function public.enforce_free_journal_limits()
returns trigger language plpgsql security definer set search_path=public as $$
declare cnt integer; simcnt integer;begin
  if public.user_has_tool_access(new.user_id,'JOURNAL_ANALYTICS') then return new; end if;
  if tg_op='INSERT' then
    select count(*) into cnt from public.decision_journal where user_id=new.user_id;
    if cnt>=10 then raise exception 'Free accounts can save up to 10 journal records. Add Journal & Analytics or Full Platform access for unlimited records.'; end if;
  end if;
  if new.simulator_source is not null then
    if tg_op='INSERT' then
      if not public.user_has_tool_access(new.user_id,'MARKET_SIMULATOR') then
        select count(*) into simcnt from public.decision_journal where user_id=new.user_id and simulator_source is not null and created_at>=date_trunc('month',now());
        if simcnt>=3 then raise exception 'Free accounts can save up to 3 simulator sessions per month. Add Market Simulator or Full Platform access for unlimited sessions.'; end if;
      end if;
    elsif coalesce(old.simulator_source,'')='' then
      if not public.user_has_tool_access(new.user_id,'MARKET_SIMULATOR') then
        select count(*) into simcnt from public.decision_journal where user_id=new.user_id and simulator_source is not null and created_at>=date_trunc('month',now());
        if simcnt>=3 then raise exception 'Free accounts can save up to 3 simulator sessions per month. Add Market Simulator or Full Platform access for unlimited sessions.'; end if;
      end if;
    end if;
  end if;
  return new;
end;$$;
drop trigger if exists enforce_free_journal_limits on public.decision_journal;
create trigger enforce_free_journal_limits before insert or update of simulator_source on public.decision_journal for each row execute function public.enforce_free_journal_limits();

-- Refresh Supabase/PostgREST schema cache after the migration completes.
notify pgrst, 'reload schema';
