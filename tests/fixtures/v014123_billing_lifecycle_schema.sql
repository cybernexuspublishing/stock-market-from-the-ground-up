-- v123 isolated PostgreSQL 16 fixture ONLY. NEVER production SQL Editor.
CREATE SCHEMA auth;
CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
CREATE ROLE service_role NOLOGIN BYPASSRLS;
CREATE TABLE auth.users(id uuid PRIMARY KEY);
INSERT INTO auth.users VALUES('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
CREATE TABLE public.gu58_live_checkout_intents(
 id uuid PRIMARY KEY,user_id uuid NOT NULL,sku_kind text NOT NULL,
 sku_code text NOT NULL,stripe_session_id text,stripe_subscription_id text,status text);
INSERT INTO public.gu58_live_checkout_intents VALUES
('11111111-1111-4111-8111-111111111111','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
 'plan','FULL_MONTHLY','cs_live_VERIFIED123','sub_VERIFIED123','active'),
('22222222-2222-4222-8222-222222222222','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
 'tool','MARKET_TUTOR','cs_live_TUTOR123','sub_TUTOR123','active');
CREATE TABLE public.site_subscriptions(
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,user_id uuid NOT NULL,
 plan_code text,provider text,provider_subscription_id text,
 status text,current_period_end timestamptz,cancel_at_period_end boolean DEFAULT false,
 metadata jsonb DEFAULT '{}'::jsonb);
CREATE TABLE public.user_tool_passes(
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,user_id uuid NOT NULL,
 tool_code text,provider text,provider_subscription_id text,
 status text,current_period_end timestamptz,cancel_at_period_end boolean DEFAULT false,
 metadata jsonb DEFAULT '{}'::jsonb);
-- Existing GU58 migration prerequisite marker from a disposable-only fixture.
CREATE FUNCTION public.gu58_live_stripe_apply_event(
 text,text,text,text,text,text,integer,text,timestamptz,timestamptz,text,boolean
) RETURNS jsonb LANGUAGE sql AS $$ SELECT '{"ok":true}'::jsonb $$;
