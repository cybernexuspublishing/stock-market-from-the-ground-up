-- v0.9 Commerce + My Library + My Purchases + Market Tutor/Simulator linkage
-- Run after v0.8_market_simulator.sql.
-- This migration prepares commerce records and ownership/access records without activating a specific payment provider.

-- Historical Lab linkage for simulator/journal records.
alter table public.decision_journal add column if not exists historical_lab_id text;
create index if not exists decision_journal_user_historical_lab_idx
  on public.decision_journal(user_id,historical_lab_id,trade_date desc)
  where historical_lab_id is not null;
grant select,insert,update on public.decision_journal to authenticated;

-- Library access records created by a trusted checkout webhook/admin workflow.
create table if not exists public.user_library (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  product_code text not null,
  access_type text not null default 'companion',
  source_channel text not null default 'admin',
  source_reference text,
  granted_at timestamptz not null default now(),
  expires_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  unique(user_id,product_code,access_type)
);

do $$ begin
  if not exists (select 1 from pg_constraint where conname='user_library_access_type_check') then
    alter table public.user_library add constraint user_library_access_type_check
      check (access_type in ('companion','direct_digital','direct_physical','bundle','promotion'));
  end if;
  if not exists (select 1 from pg_constraint where conname='user_library_source_check') then
    alter table public.user_library add constraint user_library_source_check
      check (source_channel in ('direct_site','book_key','amazon_external','admin','bundle','promotion'));
  end if;
end $$;

alter table public.user_library enable row level security;
drop policy if exists "read own library" on public.user_library;
create policy "read own library" on public.user_library for select to authenticated using (auth.uid()=user_id);
revoke all on public.user_library from anon,authenticated;
grant select on public.user_library to authenticated;
grant usage,select on sequence public.user_library_id_seq to service_role;

-- Website order history. Amazon orders are intentionally not represented here unless they are actually processed by this site.
create table if not exists public.site_orders (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text,
  provider_order_id text,
  status text not null default 'pending',
  currency text not null default 'USD',
  subtotal_cents integer not null default 0,
  tax_cents integer not null default 0,
  total_cents integer not null default 0,
  created_at timestamptz not null default now(),
  paid_at timestamptz,
  refunded_at timestamptz,
  metadata jsonb not null default '{}'::jsonb
);

do $$ begin
  if not exists (select 1 from pg_constraint where conname='site_orders_status_check') then
    alter table public.site_orders add constraint site_orders_status_check
      check (status in ('pending','paid','partially_refunded','refunded','canceled','failed'));
  end if;
  if not exists (select 1 from pg_constraint where conname='site_orders_cents_check') then
    alter table public.site_orders add constraint site_orders_cents_check
      check (subtotal_cents>=0 and tax_cents>=0 and total_cents>=0);
  end if;
end $$;

create unique index if not exists site_orders_provider_order_uidx
  on public.site_orders(provider,provider_order_id)
  where provider_order_id is not null;
create index if not exists site_orders_user_created_idx on public.site_orders(user_id,created_at desc);
alter table public.site_orders enable row level security;
drop policy if exists "read own site orders" on public.site_orders;
create policy "read own site orders" on public.site_orders for select to authenticated using (auth.uid()=user_id);
revoke all on public.site_orders from anon,authenticated;
grant select on public.site_orders to authenticated;
grant usage,select on sequence public.site_orders_id_seq to service_role;

create table if not exists public.site_order_items (
  id bigint generated always as identity primary key,
  order_id bigint not null references public.site_orders(id) on delete cascade,
  product_code text not null,
  description text,
  quantity integer not null default 1,
  unit_price_cents integer not null default 0,
  total_cents integer not null default 0,
  metadata jsonb not null default '{}'::jsonb
);

do $$ begin
  if not exists (select 1 from pg_constraint where conname='site_order_items_values_check') then
    alter table public.site_order_items add constraint site_order_items_values_check
      check (quantity>0 and unit_price_cents>=0 and total_cents>=0);
  end if;
end $$;

alter table public.site_order_items enable row level security;
drop policy if exists "read own site order items" on public.site_order_items;
create policy "read own site order items" on public.site_order_items
  for select to authenticated using (
    exists (select 1 from public.site_orders o where o.id=site_order_items.order_id and o.user_id=auth.uid())
  );
revoke all on public.site_order_items from anon,authenticated;
grant select on public.site_order_items to authenticated;
grant usage,select on sequence public.site_order_items_id_seq to service_role;

-- Billing/subscription metadata. Access control itself remains in the existing entitlements table.
create table if not exists public.site_subscriptions (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text,
  provider_customer_id text,
  provider_subscription_id text,
  plan_code text not null,
  status text not null default 'pending',
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);

do $$ begin
  if not exists (select 1 from pg_constraint where conname='site_subscriptions_status_check') then
    alter table public.site_subscriptions add constraint site_subscriptions_status_check
      check (status in ('pending','trialing','active','past_due','paused','canceled','expired','failed'));
  end if;
end $$;
create unique index if not exists site_subscriptions_provider_uidx
  on public.site_subscriptions(provider,provider_subscription_id)
  where provider_subscription_id is not null;
create index if not exists site_subscriptions_user_idx on public.site_subscriptions(user_id,created_at desc);
alter table public.site_subscriptions enable row level security;
drop policy if exists "read own subscriptions" on public.site_subscriptions;
create policy "read own subscriptions" on public.site_subscriptions for select to authenticated using (auth.uid()=user_id);
revoke all on public.site_subscriptions from anon,authenticated;
grant select on public.site_subscriptions to authenticated;
grant usage,select on sequence public.site_subscriptions_id_seq to service_role;

-- Server/admin helper for trusted commerce workflows. Browser users cannot execute it.
create or replace function public.admin_grant_library_item(
  target_user uuid,
  target_product_code text,
  target_access_type text default 'companion',
  target_source_channel text default 'admin',
  target_source_reference text default null,
  target_expires_at timestamptz default null,
  target_metadata jsonb default '{}'::jsonb
)
returns bigint
language plpgsql
security definer
set search_path=public
as $$
declare result_id bigint;
begin
  if target_user is null or nullif(trim(target_product_code),'') is null then
    raise exception 'User and product code are required';
  end if;
  insert into public.user_library(user_id,product_code,access_type,source_channel,source_reference,expires_at,metadata)
  values(target_user,trim(target_product_code),target_access_type,target_source_channel,target_source_reference,target_expires_at,coalesce(target_metadata,'{}'::jsonb))
  on conflict(user_id,product_code,access_type) do update set
    source_channel=excluded.source_channel,
    source_reference=coalesce(excluded.source_reference,public.user_library.source_reference),
    expires_at=excluded.expires_at,
    metadata=public.user_library.metadata || excluded.metadata
  returning id into result_id;
  return result_id;
end;$$;
revoke all on function public.admin_grant_library_item(uuid,text,text,text,text,timestamptz,jsonb) from public,anon,authenticated;
grant execute on function public.admin_grant_library_item(uuid,text,text,text,text,timestamptz,jsonb) to service_role;
