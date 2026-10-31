-- SMFGU-LUMEN-BUNDLE-TEST-SHADOW-001 v1.0. This migration is ALREADY
-- applied in Primary Supabase as smfgu_stripe_test_lumen_bundle_shadow_checkout_v1.
-- Reproducible source snapshot; run on a fresh database only after prerequisites.
-- QA-only, no real wallet credits, no LIVE charges.
CREATE TABLE IF NOT EXISTS public.gu_lumen_bundle_test_catalog_v1(
 sku text PRIMARY KEY CHECK(sku ~ '^SPARKS_[0-9]+$'),
 quantity integer NOT NULL CHECK(quantity>0),
 amount_cents integer NOT NULL CHECK(amount_cents>=50),
 stripe_product_id text NOT NULL UNIQUE CHECK(stripe_product_id ~ '^prod_[A-Za-z0-9_]+$'),
 stripe_price_id text NOT NULL UNIQUE CHECK(stripe_price_id ~ '^price_[A-Za-z0-9_]+$'),
 qa_enabled boolean NOT NULL DEFAULT true,
 created_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO public.gu_lumen_bundle_test_catalog_v1(sku,quantity,amount_cents,stripe_product_id,stripe_price_id)
VALUES ('SPARKS_25',25,500,'prod_VXW1AUogeZzMa9','price_1UWQzYJY9FI7byHBEuMNO2lI'),
 ('SPARKS_55',55,1000,'prod_VXW1BkITJCOrt8','price_1UWQzrJY9FI7byHBGqJqnVVb'),
 ('SPARKS_90',90,1500,'prod_VXW25lKgvrFTfx','price_1UWR0AJY9FI7byHBBUc0L3uw'),
 ('SPARKS_125',125,2000,'prod_VXW2QcSQp1cohT','price_1UWR0SJY9FI7byHBqmNHBTyt'),
 ('SPARKS_275',275,4000,'prod_VXW2gOD0aFjAL7','price_1UWR0lJY9FI7byHBhETFtRi0')
ON CONFLICT(sku) DO NOTHING;
CREATE TABLE IF NOT EXISTS public.gu_lumen_bundle_test_qa_v1(
 user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
 enabled boolean NOT NULL DEFAULT false,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.gu_lumen_bundle_test_orders_v1(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id uuid NOT NULL REFERENCES auth.users(id),
 request_id uuid NOT NULL,
 sku text NOT NULL REFERENCES public.gu_lumen_bundle_test_catalog_v1(sku),
 quantity integer NOT NULL CHECK(quantity>0),
 amount_cents integer NOT NULL CHECK(amount_cents>0),
 stripe_price_id text NOT NULL,
 status text NOT NULL DEFAULT 'reserved'
  CHECK(status IN ('reserved','bound','paid','refunded','disputed','expired','failed')),
 stripe_session_id text UNIQUE,
 stripe_payment_intent_id text UNIQUE,
 paid_event_id text,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(user_id,request_id)
);
CREATE TABLE IF NOT EXISTS public.gu_lumen_bundle_test_events_v1(
 event_id text PRIMARY KEY CHECK(event_id ~ '^evt_[A-Za-z0-9_]+$'),
 order_id uuid NOT NULL REFERENCES public.gu_lumen_bundle_test_orders_v1(id),
 event_type text NOT NULL CHECK(event_type IN('paid','refunded','disputed','expired','failed')),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.gu_lumen_bundle_test_shadow_credits_v1(
 order_id uuid PRIMARY KEY REFERENCES public.gu_lumen_bundle_test_orders_v1(id),
 user_id uuid NOT NULL REFERENCES auth.users(id),
 initial_lumens integer NOT NULL CHECK(initial_lumens>0),
 remaining_lumens integer NOT NULL CHECK(remaining_lumens>=0),
 expires_at timestamptz,
 reversed_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(),
 CHECK(remaining_lumens<=initial_lumens),
 CHECK(expires_at IS NULL)
);
ALTER TABLE public.gu_lumen_bundle_test_catalog_v1 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gu_lumen_bundle_test_qa_v1 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gu_lumen_bundle_test_orders_v1 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gu_lumen_bundle_test_events_v1 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gu_lumen_bundle_test_shadow_credits_v1 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.gu_lumen_bundle_test_catalog_v1,
 public.gu_lumen_bundle_test_qa_v1,public.gu_lumen_bundle_test_orders_v1,
 public.gu_lumen_bundle_test_events_v1,public.gu_lumen_bundle_test_shadow_credits_v1
 FROM public,anon,authenticated;
GRANT SELECT,INSERT,UPDATE ON public.gu_lumen_bundle_test_orders_v1,
 public.gu_lumen_bundle_test_events_v1,public.gu_lumen_bundle_test_shadow_credits_v1 TO service_role;
GRANT SELECT ON public.gu_lumen_bundle_test_catalog_v1,
 public.gu_lumen_bundle_test_qa_v1 TO service_role;

CREATE OR REPLACE FUNCTION public.gu_lumen_bundle_test_apply_v1(p_id uuid, p_event text, p_kind text, p_session text DEFAULT NULL::text, p_pi text DEFAULT NULL::text, p_amount integer DEFAULT NULL::integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'pg_temp'
AS $function$
declare o public.gu_lumen_bundle_test_orders_v1%rowtype; old public.gu_lumen_bundle_test_events_v1%rowtype;
begin
 if auth.role() is distinct from 'service_role' then raise exception 'SERVICE_ROLE_ONLY' using errcode='42501';end if;
 if p_event !~ '^evt_[A-Za-z0-9_]{6,}$' or p_kind not in ('paid','refunded','disputed','expired','failed') then
  return jsonb_build_object('ok',false,'error','INVALID_EVENT');end if;
 select * into old from public.gu_lumen_bundle_test_events_v1 where event_id=p_event;
 if found then return jsonb_build_object('ok',old.order_id=p_id,'duplicate',old.order_id=p_id);end if;
 select * into o from public.gu_lumen_bundle_test_orders_v1 where id=p_id for update;
 if not found then return jsonb_build_object('ok',false,'error','NO_ORDER');end if;
 if p_kind='paid' then
  if o.status not in ('bound','paid') or o.stripe_session_id is distinct from p_session or
    p_pi !~ '^pi_[A-Za-z0-9_]{6,}$' or o.amount_cents is distinct from p_amount then
   return jsonb_build_object('ok',false,'error','PAYMENT_PROOF_MISMATCH');end if;
  if o.status='paid' and o.stripe_payment_intent_id is distinct from p_pi then
   return jsonb_build_object('ok',false,'error','CONFLICTING_PAYMENT_INTENT');end if;
  if o.status='bound' then
   update public.gu_lumen_bundle_test_orders_v1 set status='paid',stripe_payment_intent_id=p_pi,paid_event_id=p_event,updated_at=now() where id=o.id;
   insert into public.gu_lumen_bundle_test_shadow_credits_v1(order_id,user_id,initial_lumens,remaining_lumens,expires_at)
   values(o.id,o.user_id,o.quantity,o.quantity,null);
  end if;
 elsif p_kind in ('refunded','disputed') then
  if o.status not in('paid','refunded','disputed') or o.stripe_payment_intent_id is distinct from p_pi or p_session is distinct from o.stripe_session_id then
   return jsonb_build_object('ok',false,'error','REVERSAL_PROOF_MISMATCH');end if;
  if o.status='paid' then
   update public.gu_lumen_bundle_test_shadow_credits_v1 set remaining_lumens=0,reversed_at=now() where order_id=o.id and reversed_at is null;
   if not found then raise exception 'CREDIT_REVERSAL_MISSING';end if;
   update public.gu_lumen_bundle_test_orders_v1 set status=p_kind,updated_at=now() where id=o.id;
  end if;
 else
  if o.status not in ('reserved','bound','expired','failed') then return jsonb_build_object('ok',false,'error','CANNOT_FAIL_PAID');end if;
  if p_session is not null and o.stripe_session_id is distinct from p_session then return jsonb_build_object('ok',false,'error','TERMINAL_SESSION_MISMATCH');end if;
  if o.status in('reserved','bound') then
   update public.gu_lumen_bundle_test_orders_v1 set status=p_kind,updated_at=now() where id=o.id;
  end if;
 end if;
 insert into public.gu_lumen_bundle_test_events_v1(event_id,order_id,event_type)values(p_event,p_id,p_kind);
 return jsonb_build_object('ok',true,'status',p_kind,'shadowOnly',true);
end $function$;

CREATE OR REPLACE FUNCTION public.gu_lumen_bundle_test_bind_v1(p_id uuid, p_user uuid, p_session text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'pg_temp'
AS $function$
declare o public.gu_lumen_bundle_test_orders_v1%rowtype;
begin
 if auth.role() is distinct from 'service_role' then raise exception 'SERVICE_ROLE_ONLY' using errcode='42501';end if;
 if p_session !~ '^cs_test_[A-Za-z0-9_]{6,}$' then return jsonb_build_object('ok',false,'error','INVALID_SESSION');end if;
 select * into o from public.gu_lumen_bundle_test_orders_v1 where id=p_id and user_id=p_user for update;
 if not found then return jsonb_build_object('ok',false,'error','NO_ORDER');end if;
 if o.status='bound' and o.stripe_session_id=p_session then return jsonb_build_object('ok',true,'duplicate',true);end if;
 if o.status<>'reserved' or o.stripe_session_id is not null then return jsonb_build_object('ok',false,'error','NOT_BINDABLE');end if;
 update public.gu_lumen_bundle_test_orders_v1 set stripe_session_id=p_session,status='bound',updated_at=now() where id=o.id;
 return jsonb_build_object('ok',true);
end $function$;

CREATE OR REPLACE FUNCTION public.gu_lumen_bundle_test_reserve_v1(p_user uuid, p_sku text, p_request uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'pg_temp'
AS $function$
declare c public.gu_lumen_bundle_test_catalog_v1%rowtype; o public.gu_lumen_bundle_test_orders_v1%rowtype;
begin
 if auth.role() is distinct from 'service_role' then raise exception 'SERVICE_ROLE_ONLY' using errcode='42501';end if;
 if p_user is null or p_request is null then return jsonb_build_object('ok',false,'error','INVALID_REQUEST');end if;
 perform pg_advisory_xact_lock(hashtextextended(p_user::text,489301));
 if not exists(select 1 from public.gu_lumen_bundle_test_qa_v1 where user_id=p_user and enabled) then
  return jsonb_build_object('ok',false,'error','QA_ACCOUNT_NOT_ALLOWED');end if;
 if not exists(select 1 from public.profiles where id=p_user and account_kind='member' and deleted_at is null) then
  return jsonb_build_object('ok',false,'error','INELIGIBLE_MEMBER');end if;
 if exists(select 1 from public.admin_user_flags where user_id=p_user and lower(status) in('restricted','suspended')) then
  return jsonb_build_object('ok',false,'error','RESTRICTED_MEMBER');end if;
 select * into c from public.gu_lumen_bundle_test_catalog_v1 where sku=p_sku and qa_enabled;
 if not found then return jsonb_build_object('ok',false,'error','NOT_QA_PACKAGE');end if;
 select * into o from public.gu_lumen_bundle_test_orders_v1 where user_id=p_user and request_id=p_request;
 if found then
  if o.sku<>p_sku then return jsonb_build_object('ok',false,'error','REUSED_REQUEST_MISMATCH');end if;
  return jsonb_build_object('ok',true,'id',o.id,'status',o.status,'session',o.stripe_session_id,'existing',true,'quantity',o.quantity,'amountCents',o.amount_cents,'priceId',o.stripe_price_id);
 end if;
 insert into public.gu_lumen_bundle_test_orders_v1(user_id,request_id,sku,quantity,amount_cents,stripe_price_id)
 values(p_user,p_request,p_sku,c.quantity,c.amount_cents,c.stripe_price_id)
 returning * into o;
 return jsonb_build_object('ok',true,'id',o.id,'status',o.status,'existing',false,'quantity',o.quantity,'amountCents',o.amount_cents,'priceId',o.stripe_price_id);
end $function$;

REVOKE ALL ON FUNCTION public.gu_lumen_bundle_test_reserve_v1(uuid,text,uuid),
 public.gu_lumen_bundle_test_bind_v1(uuid,uuid,text),
 public.gu_lumen_bundle_test_apply_v1(uuid,text,text,text,text,integer)
 FROM public,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.gu_lumen_bundle_test_reserve_v1(uuid,text,uuid),
 public.gu_lumen_bundle_test_bind_v1(uuid,uuid,text),
 public.gu_lumen_bundle_test_apply_v1(uuid,text,text,text,text,integer)
 TO service_role;
