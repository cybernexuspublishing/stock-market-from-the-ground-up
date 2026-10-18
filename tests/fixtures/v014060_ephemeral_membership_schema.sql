-- v0.14.0.60 Ephemeral PostgreSQL CI fixture ONLY.
-- NOT for Supabase Production. This creates disposable users and tables.
-- Prepared in CI-hosted PostgreSQL from scratch without external connections.
CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
CREATE ROLE service_role NOLOGIN;
CREATE SCHEMA auth;
CREATE FUNCTION auth.role() RETURNS text LANGUAGE sql STABLE
 AS $$ SELECT nullif(current_setting('request.jwt.claim.role',true),'')::text $$;
CREATE TABLE auth.users(id uuid PRIMARY KEY);
INSERT INTO auth.users(id) VALUES
 ('11111111-1111-4111-8111-111111111111'),
 ('22222222-2222-4222-8222-222222222222'),
 ('33333333-3333-4333-8333-333333333333');

CREATE TABLE public.profiles(id uuid PRIMARY KEY);
CREATE TABLE public.admin_user_flags(user_id uuid);
CREATE TABLE public.admin_user_roles(user_id uuid,role_code text,expires_at timestamptz);
CREATE TABLE public.entitlements(user_id uuid,product_key text,status text,ends_at timestamptz);
CREATE TABLE public.gu_digital_payment_route_v01432r2(route text);

CREATE TABLE public.platform_plans(
 plan_code text PRIMARY KEY,
 price_cents integer NOT NULL,
 billing_interval text NOT NULL,
 active boolean NOT NULL DEFAULT true,
 public_visible boolean NOT NULL DEFAULT true,
 checkout_enabled boolean NOT NULL DEFAULT false,
 includes_all_tools boolean NOT NULL DEFAULT false
);
INSERT INTO public.platform_plans(plan_code,price_cents,billing_interval,checkout_enabled,includes_all_tools)
 VALUES ('FULL_MONTHLY',6999,'month',false,true),
        ('FULL_ANNUAL',69900,'year',false,true),
        ('LIFETIME',249900,'lifetime',false,true),
        ('ONDEMAND_MONTHLY',1999,'month',false,false);

CREATE TABLE public.platform_tools(
 tool_code text PRIMARY KEY,
 individual_price_cents integer NOT NULL,
 status text NOT NULL DEFAULT 'live',
 active boolean NOT NULL DEFAULT true,
 public_visible boolean NOT NULL DEFAULT true
);
INSERT INTO public.platform_tools(tool_code,individual_price_cents) VALUES
 ('INTERACTIVE_LEARNING',2999),('JOURNAL_ANALYTICS',2999),
 ('MARKET_SIMULATOR',2999),('MARKET_TUTOR',2999);

CREATE TABLE public.site_subscriptions(
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 user_id uuid NOT NULL REFERENCES auth.users(id),
 provider text,
 provider_subscription_id text,
 plan_code text NOT NULL,
 status text NOT NULL DEFAULT 'pending'
   CHECK(status IN ('pending','trialing','active','past_due','paused','canceled','expired','failed')),
 current_period_end timestamptz,
 cancel_at_period_end boolean NOT NULL DEFAULT false,
 metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX site_subscriptions_provider_uidx
 ON public.site_subscriptions(provider,provider_subscription_id)
 WHERE provider_subscription_id IS NOT NULL;

CREATE TABLE public.user_tool_passes(
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 user_id uuid NOT NULL REFERENCES auth.users(id),
 tool_code text NOT NULL,
 status text NOT NULL DEFAULT 'active'
   CHECK(status IN ('trialing','active','paused','canceled','expired')),
 provider text,
 provider_subscription_id text,
 current_period_end timestamptz,
 cancel_at_period_end boolean NOT NULL DEFAULT false,
 ends_at timestamptz,
 metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX user_tool_passes_provider_uidx
 ON public.user_tool_passes(provider,provider_subscription_id)
 WHERE provider_subscription_id IS NOT NULL;

CREATE TABLE public.user_plan_grants(
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 user_id uuid NOT NULL REFERENCES auth.users(id),
 plan_code text NOT NULL,
 status text NOT NULL DEFAULT 'active'
   CHECK(status IN ('trialing','active','paused','canceled','expired')),
 starts_at timestamptz NOT NULL DEFAULT now(),
 ends_at timestamptz,
 source text NOT NULL DEFAULT 'admin',
 source_reference text,
 metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
 updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.site_orders(
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 user_id uuid NOT NULL REFERENCES auth.users(id),
 provider text, provider_order_id text,
 status text NOT NULL DEFAULT 'pending'
   CHECK(status IN ('pending','paid','partially_refunded','refunded','canceled','failed')),
 currency text NOT NULL DEFAULT 'USD',
 subtotal_cents integer NOT NULL DEFAULT 0,
 total_cents integer NOT NULL DEFAULT 0,
 paid_at timestamptz,
 refunded_at timestamptz,
 metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);
CREATE UNIQUE INDEX site_orders_provider_order_uidx
 ON public.site_orders(provider,provider_order_id)
 WHERE provider_order_id IS NOT NULL;

-- Copy of controlling access evaluator from the canonical v0.11 migration.
-- Actual production function changes require a new controlled compatibility audit.
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
REVOKE ALL ON FUNCTION public.user_has_tool_access(uuid,text) FROM anon,authenticated;
GRANT EXECUTE ON FUNCTION public.user_has_tool_access(uuid,text) TO service_role;
