-- The Stock Market: From the Ground Up — v0.13.5 incremental foundation.
-- REQUIRES v0.13.4 AND v0.13.4.2 ALREADY APPLIED. No historical migration reruns.
-- NO live checkout, QR campaign, or book-verification service is enabled by this migration.
begin;

-- Existing Flex/individual-tool commerce supports the new training offering.
-- Pending pricing is represented as 0 + public_visible=false; this is NOT a free
-- commercial offer. The authenticated preview page exists; checkout stays disabled.
insert into public.platform_tools
 (tool_code,name,category,description,href,status,active,public_visible,
  included_full,included_lifetime,individual_price_cents,free_preview,sort_order,data_requirement,metadata)
values
 ('ONDEMAND_TRAINING','Historical Replay Training','Learn',
  'Original book-aligned guided practice using a learner-operated, independently authorized thinkorswim OnDemand installation. No brokerage affiliation or bundled platform license.',
  'ondemand-training.html','beta',true,false,true,true,0,true,42,
  'Learner-supplied historical replay in an independently authorized third-party platform',
  '{"provider":"learner_operated","checkout_ready":false,"pricing_status":"pending_owner_approval","no_market_data_redistribution":true}'::jsonb)
on conflict(tool_code) do update
set name=excluded.name,description=excluded.description,href=excluded.href,
    status=case when public.platform_tools.status in ('live','paused','retired') then public.platform_tools.status else excluded.status end,
    included_full=true,included_lifetime=true,free_preview=true,
    metadata=public.platform_tools.metadata||excluded.metadata,updated_at=now();
-- We deliberately do NOT set checkout_enabled or change any existing owner-set pricing.
insert into public.plan_tool_access(plan_code,tool_code)
select p.plan_code,'ONDEMAND_TRAINING' from public.platform_plans p
where p.plan_code in ('FULL_MONTHLY','FULL_ANNUAL','LIFETIME')
on conflict do nothing;

-- Format-aware editions; never infer Amazon buyer identity from a scan.
create table if not exists public.book_editions_v135 (
 edition_code text primary key, product_code text not null references public.catalog_products(product_code),
 edition_label text not null, format text not null check(format in ('paperback','hardcover','kindle','digital','other')),
 channel text not null check(channel in ('amazon_kdp','direct_site','other')),
 asin text, isbn text, publication_status text not null default 'planned'
    check(publication_status in ('planned','in_development','published','retired')),
 active boolean not null default false, metadata jsonb not null default '{}'::jsonb,
 created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);

-- A static book-specific QR points to /activate-book.html?campaign=CODE.
-- Public scans do NOT prove sale, ownership, or copy uniqueness.
create table if not exists public.book_activation_campaigns_v135 (
 campaign_code text primary key, edition_code text not null references public.book_editions_v135(edition_code),
 active boolean not null default false, label text not null,
 max_activations integer check(max_activations is null or max_activations>0),
 created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
-- Private edition-specific challenge bank. Answers are HMAC digests prepared OFFLINE with
-- BOOK_ACTIVATION_HASH_PEPPER; never put the pepper or answers into public SQL/GitHub.
create table if not exists public.book_activation_challenges_v135 (
 id bigint generated always as identity primary key,
 edition_code text not null references public.book_editions_v135(edition_code),
 prompt text not null, answer_mac text not null check(answer_mac ~ '^[a-f0-9]{64}$'),
 active boolean not null default false,created_at timestamptz not null default now()
);
create index if not exists book_challenges_v135_active_idx on public.book_activation_challenges_v135(edition_code,active);

create table if not exists public.book_activation_sessions_v135 (
 token_hash text primary key check(token_hash ~ '^[a-f0-9]{64}$'),
 user_id uuid not null references auth.users(id) on delete cascade,
 campaign_code text not null references public.book_activation_campaigns_v135(campaign_code),
 challenge_id bigint not null references public.book_activation_challenges_v135(id),
 created_at timestamptz not null default now(),expires_at timestamptz not null,
 consumed_at timestamptz,attempts integer not null default 0 check(attempts>=0),
 last_attempt_at timestamptz
);
create index if not exists book_sessions_v135_user_time_idx on public.book_activation_sessions_v135(user_id,created_at desc);

create table if not exists public.book_activation_events_v135 (
 event_id bigint generated always as identity primary key,
 event_type text not null check(event_type in ('scan','started','invalid_answer','activated','already_active','expired')),
 campaign_code text references public.book_activation_campaigns_v135(campaign_code),
 user_id uuid references auth.users(id) on delete set null,
 created_at timestamptz not null default now(),
 metadata jsonb not null default '{}'::jsonb
);
create index if not exists book_events_v135_campaign_idx on public.book_activation_events_v135(campaign_code,created_at desc);

-- All sensitive activation tables are explicitly inaccessible to browser roles.
-- Server uses service_role and a single SQL function for atomic redemption.
-- Never publish challenge answers, raw activation tokens, or identities.
do $$ declare t text;begin
  foreach t in array array[
    'book_editions_v135','book_activation_campaigns_v135','book_activation_challenges_v135',
    'book_activation_sessions_v135','book_activation_events_v135'
  ] loop
    execute format('alter table public.%I enable row level security',t);
    execute format('revoke all on table public.%I from anon,authenticated',t);
    execute format('grant all on table public.%I to service_role',t);
  end loop;
end $$;

grant usage,select on sequence public.book_activation_challenges_v135_id_seq, public.book_activation_events_v135_event_id_seq to service_role;

-- Atomic answer attempt, time check, double-redemption prevention, and companion grant.
create or replace function public.complete_book_possession_v135(
 p_hash text,p_user uuid,p_mac text
) returns jsonb
language plpgsql security definer set search_path=public,pg_temp
as $$
declare s public.book_activation_sessions_v135%rowtype;
  c public.book_activation_campaigns_v135%rowtype;
  e public.book_editions_v135%rowtype;
  ch public.book_activation_challenges_v135%rowtype;
  n integer; kind text; existed boolean;
begin
  -- Function is restricted to service_role below, NEVER directly executable by members.
  if p_user is null or p_hash !~ '^[a-f0-9]{64}$' or p_mac !~ '^[a-f0-9]{64}$' then
    return jsonb_build_object('ok',false,'reason','invalid');
  end if;
  select * into s from public.book_activation_sessions_v135
   where token_hash=p_hash and user_id=p_user for update;
  if not found then return jsonb_build_object('ok',false,'reason','invalid');end if;
  if s.consumed_at is not null or s.expires_at<=now() then
    return jsonb_build_object('ok',false,'reason','expired');
  end if;
  if s.attempts>=5 then return jsonb_build_object('ok',false,'reason','locked');end if;
  select account_kind into kind from public.profiles where id=p_user;
  if kind is distinct from 'member' then return jsonb_build_object('ok',false,'reason','account_not_eligible');end if;
  select * into c from public.book_activation_campaigns_v135 where campaign_code=s.campaign_code;
  select * into e from public.book_editions_v135 where edition_code=c.edition_code;
  select * into ch from public.book_activation_challenges_v135 where id=s.challenge_id;
  if c.active is distinct from true or e.active is distinct from true or ch.active is distinct from true
      or ch.edition_code is distinct from e.edition_code then
    return jsonb_build_object('ok',false,'reason','not_available');
  end if;
  update public.book_activation_sessions_v135 set attempts=attempts+1,last_attempt_at=now() where token_hash=p_hash;
  if ch.answer_mac<>p_mac then
    insert into public.book_activation_events_v135(event_type,campaign_code,user_id)
      values('invalid_answer',c.campaign_code,p_user);
    return jsonb_build_object('ok',false,'reason','incorrect','remaining',greatest(0,4-s.attempts));
  end if;
  -- Limit a campaign across concurrent redemptions, if an owner configures a cap.
  perform pg_advisory_xact_lock(hashtextextended(c.campaign_code,0));
  if c.max_activations is not null and
    (select count(*) from public.book_activation_events_v135
       where campaign_code=c.campaign_code and event_type='activated')>=c.max_activations then
    return jsonb_build_object('ok',false,'reason','campaign_full');
  end if;
  -- A single active companion grant for each book, regardless of the QR edition used.
  select exists(select 1 from public.user_library
    where user_id=p_user and product_code=e.product_code and access_type='companion'
      and (expires_at is null or expires_at>now())) into existed;
  -- Avoid weakening any prior entitlement or replacing its provenance.
  if not existed then
    insert into public.user_library(user_id,product_code,access_type,source_channel,source_reference,metadata)
      values(p_user,e.product_code,'companion',
        case when e.channel='amazon_kdp' then 'amazon_external' else 'book_key' end,
        c.campaign_code,jsonb_build_object('verification','book_possession_not_purchase',
          'edition',e.edition_code,'campaign',c.campaign_code))
      on conflict(user_id,product_code,access_type) do update
      set expires_at=null, source_channel=excluded.source_channel,
          source_reference=excluded.source_reference,
          granted_at=now(),
          metadata=public.user_library.metadata||excluded.metadata
      where public.user_library.expires_at is not null
        and public.user_library.expires_at<=now();
  end if;
  update public.book_activation_sessions_v135 set consumed_at=now() where token_hash=p_hash;
  insert into public.book_activation_events_v135(event_type,campaign_code,user_id)
      values(case when existed then 'already_active' else 'activated' end,c.campaign_code,p_user);
  return jsonb_build_object('ok',true,'alreadyActive',existed,'productCode',e.product_code);
end;$$;
revoke all on function public.complete_book_possession_v135(text,uuid,text) from public,anon,authenticated;
grant execute on function public.complete_book_possession_v135(text,uuid,text) to service_role;

-- Authoritative production write restriction for synthetic Showcase accounts.
-- Existing historical grants are NOT removed; use the read-only verification report.
create or replace function public.is_showcase_account_v135(p_user uuid)
returns boolean language sql security definer set search_path=public,pg_temp as $$
 select exists(select 1 from public.profiles where id=p_user and account_kind='showcase')
 or exists(select 1 from public.admin_user_roles where user_id=p_user
   and role_code='SHOWCASE_VIEWER' and (expires_at is null or expires_at>now()));
$$;
revoke all on function public.is_showcase_account_v135(uuid) from public,anon,authenticated;
grant execute on function public.is_showcase_account_v135(uuid) to service_role;

create or replace function public.v135_refuse_showcase_production_write()
returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if public.is_showcase_account_v135(new.user_id) then
   if tg_table_name in ('user_plan_grants','site_subscriptions','user_tool_passes') then
     if new.status in ('active','trialing') then
       raise exception 'Showcase account cannot receive production entitlements';
     end if;
   elsif tg_table_name='user_library' then
     if new.expires_at is null or new.expires_at>now() then
       raise exception 'Showcase account cannot receive production book access';
     end if;
   else
     raise exception 'Showcase account cannot receive production competency evidence';
   end if;
 end if;
 return new;
end;$$;
revoke all on function public.v135_refuse_showcase_production_write() from public,anon,authenticated;

do $$declare t text;begin
 foreach t in array array['user_plan_grants','site_subscriptions','user_tool_passes','user_library','competency_evidence'] loop
  execute format('drop trigger if exists v135_showcase_write_guard on public.%I',t);
  execute format('create trigger v135_showcase_write_guard before insert or update on public.%I for each row execute function public.v135_refuse_showcase_production_write()',t);
 end loop;
end $$;

-- Refuse conversion of an account containing actual paid/book/assessed evidence to Showcase.
create or replace function public.v135_safe_showcase_conversion()
returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if new.account_kind='showcase' and old.account_kind is distinct from 'showcase' then
   if exists(select 1 from public.user_plan_grants where user_id=new.id and status in ('trialing','active'))
    or exists(select 1 from public.user_tool_passes where user_id=new.id and status in ('trialing','active'))
    or exists(select 1 from public.site_subscriptions where user_id=new.id and status in ('trialing','active'))
    or exists(select 1 from public.user_library where user_id=new.id and (expires_at is null or expires_at>now()))
    or exists(select 1 from public.competency_evidence where user_id=new.id) then
      raise exception 'Cannot convert account with production entitlements/evidence into Showcase';
   end if;
 end if;
 return new;
end;$$;
revoke all on function public.v135_safe_showcase_conversion() from public,anon,authenticated;
drop trigger if exists v135_showcase_conversion_guard on public.profiles;
create trigger v135_showcase_conversion_guard before update of account_kind on public.profiles
 for each row execute function public.v135_safe_showcase_conversion();

-- A member must not be assigned SHOWCASE_VIEWER while retaining actual member grants.
create or replace function public.v135_safe_showcase_role()
returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if new.role_code='SHOWCASE_VIEWER' and (new.expires_at is null or new.expires_at>now()) then
   if exists(select 1 from public.user_plan_grants where user_id=new.user_id and status in ('trialing','active'))
    or exists(select 1 from public.user_tool_passes where user_id=new.user_id and status in ('trialing','active'))
    or exists(select 1 from public.site_subscriptions where user_id=new.user_id and status in ('trialing','active'))
    or exists(select 1 from public.user_library where user_id=new.user_id and (expires_at is null or expires_at>now()))
    or exists(select 1 from public.competency_evidence where user_id=new.user_id) then
      raise exception 'Cannot grant Showcase role to an account containing production entitlements/evidence';
   end if;
 end if;
 return new;
end;$$;
revoke all on function public.v135_safe_showcase_role() from public,anon,authenticated;
drop trigger if exists v135_showcase_role_guard on public.admin_user_roles;
create trigger v135_showcase_role_guard before insert or update on public.admin_user_roles
 for each row execute function public.v135_safe_showcase_role();

-- Safe non-purchasable bundle metadata. Physical fulfillment and Kindle exclusivity
-- must be verified BEFORE any later checkout-enabled release.
insert into public.catalog_products(product_code,product_type,family,title,short_title,author,publisher,
  active,sort_order,kdp_select,companion_access,book_key_trial_days,
  direct_digital_enabled,direct_physical_enabled,description,metadata)
values('FOUNDATIONS_COMPLETE_BUNDLE','bundle','foundations',
 'The Stock Market Foundations Complete Series — Books I–III','Foundations Complete Series',
 'J. S. Grant','Crown & Lantern Press',true,35,true,false,0,false,false,
 'Three-volume Foundations series. Physical bundle ordering and fulfillment are not yet enabled. Kindle/digital direct sales remain disabled during applicable KDP Select enrollment.',
 '{"members":["FOUNDATION_BOOK_1","FOUNDATION_BOOK_2","FOUNDATION_BOOK_3"],"formats":["paperback","hardcover","kindle"],"checkout_status":"disabled","kindle_direct_blocked":true}'::jsonb)
on conflict(product_code) do nothing;

-- Correct previous SHOWCASE preset metadata; do NOT give real membership.
update public.qa_account_presets
set plan_code='FREE',metadata=coalesce(metadata,'{}'::jsonb)||
 '{"showcase":true,"synthetic_admin_data":true,"production_entitlements":false}'::jsonb
where preset_code='SHOWCASE';

insert into public.site_settings(setting_key,category,value,public_read,description)
values('site.version','site','"0.13.5"'::jsonb,true,'Incremental v0.13.5 foundation version')
on conflict(setting_key) do update set value=excluded.value,updated_at=now();
notify pgrst,'reload schema';
commit;
