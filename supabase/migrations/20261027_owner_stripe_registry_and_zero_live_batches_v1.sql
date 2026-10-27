BEGIN;
CREATE TABLE IF NOT EXISTS public.gu_owner_stripe_registry_v1 (
 sku text PRIMARY KEY CHECK(sku ~ '^(addon|book|course|feature|founding|membership|plan|tool):[A-Z0-9_-]{2,90}$'),
 stripe_product_id text NOT NULL UNIQUE CHECK(stripe_product_id ~ '^prod_[A-Za-z0-9_]{6,}$'),
 stripe_price_id text NOT NULL UNIQUE CHECK(stripe_price_id ~ '^price_[A-Za-z0-9_]{6,}$'),
 amount_cents integer NOT NULL CHECK(amount_cents >= 0),
 currency text NOT NULL DEFAULT 'usd' CHECK(currency='usd'),
 billing_interval text NOT NULL CHECK(billing_interval IN ('one_time','day','week','month','year')),
 billing_interval_count integer NOT NULL DEFAULT 1 CHECK(billing_interval_count BETWEEN 1 AND 365),
 imported_name text NOT NULL,
 imported_by uuid NOT NULL,
 import_source text NOT NULL DEFAULT 'stripe_live_verified',
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.gu_owner_stripe_registry_v1 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.gu_owner_stripe_registry_v1 FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE ON public.gu_owner_stripe_registry_v1 TO service_role;

CREATE OR REPLACE FUNCTION public.gu_owner_register_stripe_product_v1(
 p_actor uuid,p_sku text,p_product_id text,p_price_id text,p_name text,
 p_amount_cents integer,p_interval text,p_interval_count integer)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE old public.gu_owner_stripe_registry_v1%ROWTYPE; cat text; display_name text; present boolean;
BEGIN
 IF current_setting('request.jwt.claim.role',true) IS DISTINCT FROM 'service_role' AND current_user <> 'postgres' THEN
  RAISE EXCEPTION 'Service-role only';
 END IF;
 IF p_actor IS NULL OR p_sku !~ '^(addon|book|course|feature|founding|membership|plan|tool):[A-Z0-9_-]{2,90}$'
 OR p_product_id !~ '^prod_[A-Za-z0-9_]{6,}$' OR p_price_id !~ '^price_[A-Za-z0-9_]{6,}$'
 OR p_name IS NULL OR length(trim(p_name)) NOT BETWEEN 2 AND 200 OR
 p_amount_cents IS NULL OR p_amount_cents < 0 OR
 p_interval NOT IN ('one_time','day','week','month','year') OR
 p_interval_count NOT BETWEEN 1 AND 365 THEN RAISE EXCEPTION 'Invalid Stripe registry payload';END IF;
 IF NOT EXISTS(SELECT 1 FROM public.admin_user_roles WHERE user_id=p_actor AND role_code='OWNER' AND (expires_at IS NULL OR expires_at>now())) THEN
  RAISE EXCEPTION 'Actor is not an active OWNER';
 END IF;
 SELECT * INTO old FROM public.gu_owner_stripe_registry_v1 WHERE sku=p_sku FOR UPDATE;
 IF FOUND AND (old.stripe_product_id<>p_product_id OR old.stripe_price_id<>p_price_id OR old.amount_cents<>p_amount_cents
 OR old.billing_interval<>p_interval OR old.billing_interval_count<>p_interval_count) THEN
  RAISE EXCEPTION 'Existing SKU/price mapping differs; never overwrite an active mapping without migration';
 END IF;
 cat:=split_part(p_sku,':',1);
 display_name:=left(trim(p_name),200);
 INSERT INTO public.gu_owner_stripe_registry_v1
 (sku,stripe_product_id,stripe_price_id,amount_cents,billing_interval,billing_interval_count,imported_name,imported_by)
 VALUES(p_sku,p_product_id,p_price_id,p_amount_cents,p_interval,p_interval_count,display_name,p_actor)
 ON CONFLICT(sku) DO UPDATE SET updated_at=now(),imported_name=excluded.imported_name,imported_by=excluded.imported_by;
 SELECT EXISTS(SELECT 1 FROM public.gu_storefront_items_v014174 WHERE sku=p_sku) INTO present;
 IF NOT present THEN
   INSERT INTO public.gu_storefront_items_v014174
    (sku,category,display_name,description,price_label,duration_label,product_page,status,visible,sale_ready,display_order,updated_by)
   VALUES(p_sku,CASE WHEN cat='plan' THEN 'membership' WHEN cat='course' THEN 'bootcamp' ELSE cat END,display_name,
    'Product information synchronized from its verified Stripe LIVE Product and Price.',
    '$'||to_char(p_amount_cents / 100.0,'FM999999990.00'),CASE WHEN p_interval='one_time' THEN 'One-time' ELSE 'Every '||p_interval_count||' '||p_interval END,
    '','listed',true,false,900,p_actor);
 END IF;
 INSERT INTO public.admin_audit_log(actor_user_id,action,target_type,target_id,details)
 VALUES(p_actor,'OWNER_STRIPE_CATALOG_IMPORT','stripe_product',p_sku,
 jsonb_build_object('stripe_product_id',p_product_id,'stripe_price_id',p_price_id,'amount_cents',p_amount_cents,
 'billing_interval',p_interval,'billing_interval_count',p_interval_count,'new_storefront_item',NOT present,
 'checkout_permissions_changed',false,'fulfillment_permissions_changed',false));
 RETURN jsonb_build_object('ok',true,'sku',p_sku,'newStoreItem',NOT present,'mapped',true,'checkoutEnabledByImport',false);
END $$;
REVOKE ALL ON FUNCTION public.gu_owner_register_stripe_product_v1(uuid,text,text,text,text,integer,text,integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.gu_owner_register_stripe_product_v1(uuid,text,text,text,text,integer,text,integer) TO service_role;

CREATE TABLE IF NOT EXISTS public.gu_owner_zero_live_batches_v1(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 owner_id uuid NOT NULL,
 selected_skus jsonb NOT NULL,
 selector text NOT NULL,
 stripe_session_id text UNIQUE,
 created_at timestamptz NOT NULL DEFAULT now(),
 CHECK(jsonb_typeof(selected_skus)='array' AND jsonb_array_length(selected_skus) BETWEEN 1 AND 100)
);
ALTER TABLE public.gu_owner_zero_live_batches_v1 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.gu_owner_zero_live_batches_v1 FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE ON public.gu_owner_zero_live_batches_v1 TO service_role;
COMMIT;