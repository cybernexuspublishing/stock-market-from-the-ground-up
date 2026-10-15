-- Cyber Nexus / The Stock Market: From the Ground Up — v0.14.0.31
-- REVIEW REQUIRED. STAGING FIRST. No existing rows modified; no sales enabled.
-- New isolated Stripe physical-products subsystem, separate from Lemon Squeezy.
BEGIN;
DO $guard$ BEGIN
 IF to_regclass('public.catalog_products') IS NULL
 OR to_regclass('public.site_settings') IS NULL
 OR to_regclass('public.profiles') IS NULL
 OR to_regclass('public.admin_user_flags') IS NULL
 OR to_regclass('public.admin_user_roles') IS NULL
 OR to_regclass('public.admin_audit_log') IS NULL
 OR to_regclass('public.account_private_identity') IS NULL
 OR to_regprocedure('public.gu_print_owner_guard_v01428()') IS NULL
 THEN RAISE EXCEPTION 'v01431 missing Owner and catalog prerequisites'; END IF;
END $guard$;

CREATE TABLE IF NOT EXISTS public.gu_signed_book_offers_v01431 (
 product_code text NOT NULL REFERENCES public.catalog_products(product_code),
 edition text NOT NULL CHECK(edition IN ('paperback','hardcover')),
 price_cents integer NOT NULL DEFAULT 0 CHECK(price_cents BETWEEN 0 AND 250000),
 shipping_cents integer NOT NULL DEFAULT 0 CHECK(shipping_cents BETWEEN 0 AND 100000),
 enabled boolean NOT NULL DEFAULT false,
 updated_at timestamptz NOT NULL DEFAULT now(),updated_by uuid,
 PRIMARY KEY(product_code,edition),
 CONSTRAINT gu_signed_offer_min_price CHECK(NOT enabled OR price_cents >= 100)
);
CREATE TABLE IF NOT EXISTS public.gu_signed_book_orders_v01431 (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id uuid NOT NULL REFERENCES auth.users(id),
 product_code text NOT NULL REFERENCES public.catalog_products(product_code),
 edition text NOT NULL CHECK(edition IN ('paperback','hardcover')),
 price_cents integer NOT NULL CHECK(price_cents>0),
 shipping_cents integer NOT NULL CHECK(shipping_cents>=0),
 paid_total_cents integer,
 currency text NOT NULL DEFAULT 'USD' CHECK(currency='USD'),
 status text NOT NULL DEFAULT 'pending_checkout' CHECK(status IN
 ('pending_checkout','awaiting_payment','paid','on_hold','canceled','refunded','disputed')),
 fulfillment text NOT NULL DEFAULT 'not_started' CHECK(fulfillment IN
 ('not_started','ordered_from_kdp','received_by_author','signed','packed','shipped','delivered')),
 stripe_session_id text UNIQUE,stripe_payment_intent_id text UNIQUE,
 tracking_carrier text,tracking_code text,
 created_at timestamptz NOT NULL DEFAULT now(),paid_at timestamptz,
 updated_at timestamptz NOT NULL DEFAULT now(),
 CONSTRAINT gu_signed_paid_total_check CHECK(paid_total_cents IS NULL OR paid_total_cents>=price_cents+shipping_cents),
 CONSTRAINT gu_signed_checkout_ref CHECK(stripe_session_id IS NULL OR stripe_session_id ~ '^cs_(test|live)_[A-Za-z0-9_]+$')
);
CREATE INDEX IF NOT EXISTS gu_signed_book_orders_member_idx ON public.gu_signed_book_orders_v01431(user_id,created_at DESC);
CREATE INDEX IF NOT EXISTS gu_signed_book_orders_queue_idx ON public.gu_signed_book_orders_v01431(status,created_at DESC);
CREATE TABLE IF NOT EXISTS public.gu_signed_stripe_events_v01431 (
 event_id text PRIMARY KEY CHECK(event_id ~ '^evt_[A-Za-z0-9_]+$'),
 order_id uuid,
 kind text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.gu_signed_book_offers_v01431 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gu_signed_book_orders_v01431 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gu_signed_stripe_events_v01431 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.gu_signed_book_offers_v01431,public.gu_signed_book_orders_v01431,
 public.gu_signed_stripe_events_v01431 FROM PUBLIC,anon,authenticated;
-- No direct browser inserts/updates/reads; expose scoped RPCs only.

INSERT INTO public.site_settings(setting_key,category,value,public_read,description)
VALUES('commerce.signed_books_checkout_enabled','commerce','false'::jsonb,false,
 'Separate Stripe signed-author-copy checkout switch. Requires environment flag too.')
ON CONFLICT(setting_key) DO NOTHING;

CREATE OR REPLACE FUNCTION public.gu_signed_owner_offers_v01431()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $fn$
DECLARE owner uuid; result jsonb;
BEGIN
 owner:=public.gu_print_owner_guard_v01428();
 SELECT coalesce(jsonb_agg(jsonb_build_object('code',p.product_code,'title',p.title,
   'format',f.fmt,'priceCents',coalesce(o.price_cents,0),
   'shippingCents',coalesce(o.shipping_cents,0),
   'enabled',coalesce(o.enabled,false), 'updatedAt',o.updated_at)
 ORDER BY p.title,f.fmt),'[]'::jsonb) INTO result FROM public.catalog_products p
 CROSS JOIN (VALUES('paperback'),('hardcover')) f(fmt)
 LEFT JOIN public.gu_signed_book_offers_v01431 o
 ON o.product_code=p.product_code AND o.edition=f.fmt
 WHERE p.product_type='book';
 RETURN jsonb_build_object('ok',true,'offers',result);
END $fn$;
REVOKE ALL ON FUNCTION public.gu_signed_owner_offers_v01431() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.gu_signed_owner_offers_v01431() TO authenticated;

CREATE OR REPLACE FUNCTION public.gu_signed_owner_offer_save_v01431(
 p_code text,p_edition text,p_price integer,p_shipping integer,p_enable boolean,
 p_expected_updated_at timestamptz DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $fn$
DECLARE actor uuid; oldrecord public.gu_signed_book_offers_v01431%ROWTYPE; ts timestamptz;
BEGIN
 actor:=public.gu_print_owner_guard_v01428();
 IF coalesce(auth.jwt()->>'aal','')<>'aal2' THEN
 RAISE EXCEPTION 'OWNER_MFA_REQUIRED' USING ERRCODE='42501'; END IF;
 IF p_code !~ '^[A-Z0-9_]{3,90}$' OR p_edition NOT IN ('paperback','hardcover')
 OR p_price NOT BETWEEN 0 AND 250000 OR p_shipping NOT BETWEEN 0 AND 100000
 OR p_enable IS NULL OR (p_enable AND p_price<100) THEN
 RAISE EXCEPTION 'INVALID_SIGNED_BOOK_OFFER' USING ERRCODE='22023'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.catalog_products p
 WHERE p.product_code=p_code AND p.product_type='book') THEN
 RAISE EXCEPTION 'UNKNOWN_BOOK'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('signed-offer:'||p_code||':'||p_edition,0));
 SELECT * INTO oldrecord FROM public.gu_signed_book_offers_v01431
 WHERE product_code=p_code AND edition=p_edition FOR UPDATE;
 IF FOUND AND oldrecord.updated_at IS DISTINCT FROM p_expected_updated_at THEN
 RAISE EXCEPTION 'SIGNED_OFFER_STALE' USING ERRCODE='40001'; END IF;
 IF NOT FOUND AND p_expected_updated_at IS NOT NULL THEN
 RAISE EXCEPTION 'SIGNED_OFFER_STALE' USING ERRCODE='40001'; END IF;
 INSERT INTO public.gu_signed_book_offers_v01431(product_code,edition,price_cents,shipping_cents,enabled,updated_at,updated_by)
 VALUES(p_code,p_edition,p_price,p_shipping,p_enable,clock_timestamp(),actor)
 ON CONFLICT(product_code,edition) DO UPDATE SET
 price_cents=EXCLUDED.price_cents,shipping_cents=EXCLUDED.shipping_cents,
 enabled=EXCLUDED.enabled,updated_at=EXCLUDED.updated_at,updated_by=actor
 RETURNING updated_at INTO ts;
 INSERT INTO public.admin_audit_log(actor_user_id,action,target_type,target_id,details)
 VALUES(actor,'commerce.signed.offer.v01431','signed_book_offer',p_code||':'||p_edition,
 jsonb_build_object('old',to_jsonb(oldrecord),'newPrice',p_price,'newShipping',p_shipping,'newEnabled',p_enable));
 RETURN jsonb_build_object('ok',true,'updatedAt',ts);
END $fn$;
REVOKE ALL ON FUNCTION public.gu_signed_owner_offer_save_v01431(text,text,integer,integer,boolean,timestamptz) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.gu_signed_owner_offer_save_v01431(text,text,integer,integer,boolean,timestamptz) TO authenticated;

CREATE OR REPLACE FUNCTION public.gu_signed_quote_v01431(p_code text,p_edition text)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $fn$
 SELECT coalesce((SELECT jsonb_build_object('available',true,'code',p.product_code,
 'title',p.title,'edition',o.edition,'priceCents',o.price_cents,
 'shippingCents',o.shipping_cents,'currency','USD')
 FROM public.gu_signed_book_offers_v01431 o
 JOIN public.catalog_products p ON p.product_code=o.product_code
 WHERE p.product_code=p_code AND o.edition=p_edition AND o.enabled
 AND p.active AND p.store_visible AND p.sales_status='published'
 AND coalesce((p.metadata->'print_fulfillment_v01429'->>'signed_available')::boolean,false)
 AND EXISTS(SELECT 1 FROM public.site_settings s WHERE s.setting_key='commerce.signed_books_checkout_enabled' AND s.value='true'::jsonb)
 AND o.price_cents>=100 LIMIT 1),'{"available":false}'::jsonb);
$fn$;
REVOKE ALL ON FUNCTION public.gu_signed_quote_v01431(text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.gu_signed_quote_v01431(text,text) TO anon,authenticated,service_role;

CREATE OR REPLACE FUNCTION public.gu_signed_order_start_v01431(p_code text,p_edition text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $fn$
DECLARE actor uuid:=auth.uid(); offer jsonb; order_id uuid;
BEGIN
 IF actor IS NULL OR NOT EXISTS(SELECT 1 FROM public.profiles p WHERE p.id=actor AND p.account_kind='member')
 OR NOT EXISTS(SELECT 1 FROM public.account_private_identity ai WHERE ai.user_id=actor AND ai.age_eligible=true AND ai.date_of_birth IS NOT NULL)
 OR EXISTS(SELECT 1 FROM public.admin_user_flags f WHERE f.user_id=actor AND lower(f.status) IN ('restricted','suspended'))
 OR EXISTS(SELECT 1 FROM public.admin_user_roles r WHERE r.user_id=actor AND r.role_code='SHOWCASE_VIEWER'
 AND (r.expires_at IS NULL OR r.expires_at>now()))
 THEN RAISE EXCEPTION 'SIGNED_ORDER_NOT_ALLOWED' USING ERRCODE='42501'; END IF;
 offer:=public.gu_signed_quote_v01431(p_code,p_edition);
 IF offer->>'available'<>'true' THEN RAISE EXCEPTION 'SIGNED_OFFER_UNAVAILABLE' USING ERRCODE='42501'; END IF;
 INSERT INTO public.gu_signed_book_orders_v01431(user_id,product_code,edition,price_cents,shipping_cents)
 VALUES(actor,p_code,p_edition,(offer->>'priceCents')::integer,(offer->>'shippingCents')::integer)
 RETURNING id INTO order_id;
 RETURN jsonb_build_object('ok',true,'id',order_id,'priceCents',offer->>'priceCents',
 'shippingCents',offer->>'shippingCents','title',offer->>'title','edition',p_edition);
END $fn$;
REVOKE ALL ON FUNCTION public.gu_signed_order_start_v01431(text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.gu_signed_order_start_v01431(text,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.gu_signed_order_attach_v01431(p_id uuid,p_session text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $fn$
BEGIN
 IF p_session !~ '^cs_(test|live)_[A-Za-z0-9_]+$' THEN RAISE EXCEPTION 'BAD_CHECKOUT_SESSION'; END IF;
 UPDATE public.gu_signed_book_orders_v01431 SET stripe_session_id=p_session,
 status=CASE WHEN status='pending_checkout' THEN 'awaiting_payment' ELSE status END,
 updated_at=now()
 WHERE id=p_id AND (stripe_session_id IS NULL OR stripe_session_id=p_session)
 AND status IN ('pending_checkout','awaiting_payment','paid');
 RETURN FOUND;
END $fn$;
REVOKE ALL ON FUNCTION public.gu_signed_order_attach_v01431(uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.gu_signed_order_attach_v01431(uuid,text) TO service_role;

CREATE OR REPLACE FUNCTION public.gu_signed_stripe_paid_v01431(
 p_event text,p_order uuid,p_session text,p_intent text,
 p_subtotal integer,p_shipping integer,p_total integer,p_currency text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $fn$
DECLARE ord public.gu_signed_book_orders_v01431%ROWTYPE;
BEGIN
 IF p_event !~ '^evt_[A-Za-z0-9_]+$' OR p_session !~ '^cs_(test|live)_[A-Za-z0-9_]+$'
 OR p_intent !~ '^pi_[A-Za-z0-9_]+$' OR p_currency<>'usd' THEN
 RAISE EXCEPTION 'BAD_STRIPE_EVENT'; END IF;
 SELECT * INTO ord FROM public.gu_signed_book_orders_v01431 WHERE id=p_order FOR UPDATE;
 IF EXISTS(SELECT 1 FROM public.gu_signed_stripe_events_v01431 WHERE event_id=p_event) THEN
 RETURN jsonb_build_object('ok',true,'duplicate',true); END IF;
 IF NOT FOUND OR (ord.stripe_session_id IS NOT NULL AND ord.stripe_session_id<>p_session)
 OR ord.status NOT IN ('pending_checkout','awaiting_payment','paid')
 OR ord.price_cents<>p_subtotal OR ord.shipping_cents<>p_shipping OR p_total<p_subtotal+p_shipping
 THEN RAISE EXCEPTION 'STRIPE_ORDER_MISMATCH'; END IF;
 UPDATE public.gu_signed_book_orders_v01431 SET stripe_session_id=p_session,
 stripe_payment_intent_id=p_intent,paid_total_cents=p_total,
 status='paid',paid_at=coalesce(paid_at,now()),updated_at=now()
 WHERE id=p_order;
 INSERT INTO public.gu_signed_stripe_events_v01431(event_id,order_id,kind)
 VALUES(p_event,p_order,'paid');
 RETURN jsonb_build_object('ok',true,'duplicate',false);
END $fn$;
REVOKE ALL ON FUNCTION public.gu_signed_stripe_paid_v01431(text,uuid,text,text,integer,integer,integer,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.gu_signed_stripe_paid_v01431(text,uuid,text,text,integer,integer,integer,text) TO service_role;

CREATE OR REPLACE FUNCTION public.gu_signed_stripe_reversal_v01431(
 p_event text,p_intent text,p_kind text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $fn$
DECLARE ord public.gu_signed_book_orders_v01431%ROWTYPE; next_status text;
BEGIN
 IF p_event !~ '^evt_[A-Za-z0-9_]+$' OR p_intent !~ '^pi_[A-Za-z0-9_]+$'
 OR p_kind NOT IN ('refunded','disputed') THEN RAISE EXCEPTION 'BAD_STRIPE_REVERSAL'; END IF;
 SELECT * INTO ord FROM public.gu_signed_book_orders_v01431
 WHERE stripe_payment_intent_id=p_intent FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'REVERSAL_ORDER_NOT_YET_PAIRED'; END IF;
 IF EXISTS(SELECT 1 FROM public.gu_signed_stripe_events_v01431 WHERE event_id=p_event) THEN
 RETURN jsonb_build_object('ok',true,'duplicate',true); END IF;
 next_status:=CASE WHEN p_kind='disputed' THEN 'disputed' ELSE 'refunded' END;
 UPDATE public.gu_signed_book_orders_v01431 SET status=next_status,updated_at=now() WHERE id=ord.id;
 INSERT INTO public.gu_signed_stripe_events_v01431(event_id,order_id,kind)
 VALUES(p_event,ord.id,p_kind);
 RETURN jsonb_build_object('ok',true,'duplicate',false);
END $fn$;
REVOKE ALL ON FUNCTION public.gu_signed_stripe_reversal_v01431(text,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.gu_signed_stripe_reversal_v01431(text,text,text) TO service_role;

CREATE OR REPLACE FUNCTION public.gu_signed_owner_payment_switch_get_v01431()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $fn$
DECLARE actor uuid;
BEGIN
 actor:=public.gu_print_owner_guard_v01428();
 RETURN jsonb_build_object('ok',true,'enabled',EXISTS(SELECT 1 FROM public.site_settings
 WHERE setting_key='commerce.signed_books_checkout_enabled' AND value='true'::jsonb));
END $fn$;
REVOKE ALL ON FUNCTION public.gu_signed_owner_payment_switch_get_v01431() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.gu_signed_owner_payment_switch_get_v01431() TO authenticated;

CREATE OR REPLACE FUNCTION public.gu_signed_owner_payment_switch_save_v01431(p_enabled boolean)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $fn$
DECLARE actor uuid; prior jsonb;
BEGIN
 actor:=public.gu_print_owner_guard_v01428();
 IF coalesce(auth.jwt()->>'aal','')<>'aal2' THEN RAISE EXCEPTION 'OWNER_MFA_REQUIRED'; END IF;
 IF p_enabled IS NULL THEN RAISE EXCEPTION 'INVALID_SWITCH'; END IF;
 SELECT value INTO prior FROM public.site_settings WHERE setting_key='commerce.signed_books_checkout_enabled' FOR UPDATE;
 UPDATE public.site_settings SET value=to_jsonb(p_enabled),updated_at=now()
 WHERE setting_key='commerce.signed_books_checkout_enabled';
 IF NOT FOUND THEN RAISE EXCEPTION 'SIGNED_PAYMENT_SETTING_MISSING'; END IF;
 INSERT INTO public.admin_audit_log(actor_user_id,action,target_type,target_id,details)
 VALUES(actor,'commerce.signed.payment.switch.v01431','site_setting','commerce.signed_books_checkout_enabled',
 jsonb_build_object('previous',prior,'enabled',p_enabled));
 RETURN jsonb_build_object('ok',true,'enabled',p_enabled);
END $fn$;
REVOKE ALL ON FUNCTION public.gu_signed_owner_payment_switch_save_v01431(boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.gu_signed_owner_payment_switch_save_v01431(boolean) TO authenticated;

CREATE OR REPLACE FUNCTION public.gu_signed_owner_orders_v01431()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $fn$
DECLARE owner uuid; results jsonb;
BEGIN
 owner:=public.gu_print_owner_guard_v01428();
 IF coalesce(auth.jwt()->>'aal','')<>'aal2' THEN RAISE EXCEPTION 'OWNER_MFA_REQUIRED'; END IF;
 SELECT coalesce(jsonb_agg(jsonb_build_object('id',o.id,'code',o.product_code,
 'edition',o.edition,'username',coalesce(p.username,'Unavailable'),'status',o.status,'fulfillment',o.fulfillment,
 'priceCents',o.price_cents,'shippingCents',o.shipping_cents,'paidTotalCents',o.paid_total_cents,
 'trackingCarrier',o.tracking_carrier,'trackingCode',o.tracking_code,
 'updatedAt',o.updated_at,'createdAt',o.created_at)
 ORDER BY o.created_at DESC),'[]'::jsonb) INTO results
 FROM public.gu_signed_book_orders_v01431 o LEFT JOIN public.profiles p ON p.id=o.user_id WHERE o.status IN ('paid','on_hold','disputed','refunded');
 RETURN jsonb_build_object('ok',true,'orders',results);
END $fn$;
REVOKE ALL ON FUNCTION public.gu_signed_owner_orders_v01431() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.gu_signed_owner_orders_v01431() TO authenticated;

CREATE OR REPLACE FUNCTION public.gu_signed_owner_session_v01431(p_id uuid)
RETURNS text LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $fn$
DECLARE owner uuid; session text;
BEGIN
 owner:=public.gu_print_owner_guard_v01428();
 IF coalesce(auth.jwt()->>'aal','')<>'aal2' THEN RAISE EXCEPTION 'OWNER_MFA_REQUIRED' USING ERRCODE='42501'; END IF;
 SELECT stripe_session_id INTO session FROM public.gu_signed_book_orders_v01431
 WHERE id=p_id AND status IN ('paid','on_hold') AND stripe_session_id IS NOT NULL;
 RETURN session;
END $fn$;
REVOKE ALL ON FUNCTION public.gu_signed_owner_session_v01431(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.gu_signed_owner_session_v01431(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.gu_signed_owner_transition_v01431(
 p_id uuid,p_next text,p_expected_updated_at timestamptz,p_carrier text DEFAULT NULL,p_tracking text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $fn$
DECLARE actor uuid; ord public.gu_signed_book_orders_v01431%ROWTYPE;
BEGIN
 actor:=public.gu_print_owner_guard_v01428();
 IF coalesce(auth.jwt()->>'aal','')<>'aal2' THEN RAISE EXCEPTION 'OWNER_MFA_REQUIRED' USING ERRCODE='42501'; END IF;
 SELECT * INTO ord FROM public.gu_signed_book_orders_v01431 WHERE id=p_id FOR UPDATE;
 IF NOT FOUND OR ord.updated_at IS DISTINCT FROM p_expected_updated_at THEN
 RAISE EXCEPTION 'SIGNED_ORDER_STALE_OR_MISSING'; END IF;
 IF ord.status<>'paid' THEN RAISE EXCEPTION 'ORDER_NOT_FULFILLABLE'; END IF;
 IF NOT ((p_next='ordered_from_kdp' AND ord.fulfillment='not_started') OR
   (p_next='received_by_author' AND ord.fulfillment='ordered_from_kdp') OR
   (p_next='signed' AND ord.fulfillment='received_by_author') OR
   (p_next='packed' AND ord.fulfillment='signed') OR
   (p_next='shipped' AND ord.fulfillment='packed') OR
   (p_next='delivered' AND ord.fulfillment='shipped')) THEN
 RAISE EXCEPTION 'INVALID_FULFILLMENT_TRANSITION'; END IF;
 IF p_next='shipped' AND (length(trim(coalesce(p_carrier,'')))<2 OR
 length(trim(coalesce(p_tracking,'')))<4 OR length(p_carrier)>80 OR length(p_tracking)>160)
 THEN RAISE EXCEPTION 'TRACKING_REQUIRED'; END IF;
 UPDATE public.gu_signed_book_orders_v01431 SET fulfillment=p_next,
 tracking_carrier=CASE WHEN p_next='shipped' THEN trim(p_carrier) ELSE tracking_carrier END,
 tracking_code=CASE WHEN p_next='shipped' THEN trim(p_tracking) ELSE tracking_code END,
 updated_at=clock_timestamp() WHERE id=p_id;
 INSERT INTO public.admin_audit_log(actor_user_id,action,target_type,target_id,details)
 VALUES(actor,'commerce.signed.fulfillment.v01431','signed_book_order',p_id::text,
 jsonb_build_object('from',ord.fulfillment,'to',p_next));
 RETURN jsonb_build_object('ok',true,'fulfillment',p_next);
END $fn$;
REVOKE ALL ON FUNCTION public.gu_signed_owner_transition_v01431(uuid,text,timestamptz,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.gu_signed_owner_transition_v01431(uuid,text,timestamptz,text,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.gu_signed_owner_hold_v01431(
 p_id uuid,p_hold boolean,p_expected_updated_at timestamptz)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $fn$
DECLARE actor uuid; ord public.gu_signed_book_orders_v01431%ROWTYPE;
BEGIN
 actor:=public.gu_print_owner_guard_v01428();
 IF coalesce(auth.jwt()->>'aal','')<>'aal2' THEN RAISE EXCEPTION 'OWNER_MFA_REQUIRED'; END IF;
 SELECT * INTO ord FROM public.gu_signed_book_orders_v01431 WHERE id=p_id FOR UPDATE;
 IF NOT FOUND OR ord.updated_at IS DISTINCT FROM p_expected_updated_at
 OR ord.status NOT IN ('paid','on_hold') OR p_hold IS NULL THEN
 RAISE EXCEPTION 'UNAVAILABLE_SIGNED_ORDER'; END IF;
 UPDATE public.gu_signed_book_orders_v01431 SET status=CASE WHEN p_hold THEN 'on_hold' ELSE 'paid' END,
 updated_at=clock_timestamp() WHERE id=p_id;
 INSERT INTO public.admin_audit_log(actor_user_id,action,target_type,target_id,details)
 VALUES(actor,'commerce.signed.hold.v01431','signed_book_order',p_id::text,
 jsonb_build_object('old',ord.status,'new',CASE WHEN p_hold THEN 'on_hold' ELSE 'paid' END));
 RETURN jsonb_build_object('ok',true,'status',CASE WHEN p_hold THEN 'on_hold' ELSE 'paid' END);
END $fn$;
REVOKE ALL ON FUNCTION public.gu_signed_owner_hold_v01431(uuid,boolean,timestamptz) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.gu_signed_owner_hold_v01431(uuid,boolean,timestamptz) TO authenticated;

CREATE OR REPLACE FUNCTION public.gu_signed_my_orders_v01431()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $fn$
 SELECT jsonb_build_object('ok',true,'orders',coalesce(jsonb_agg(jsonb_build_object(
 'id',o.id,'code',o.product_code,'edition',o.edition,'status',o.status,
 'fulfillment',o.fulfillment,'trackingCarrier',o.tracking_carrier,'trackingCode',o.tracking_code)
 ORDER BY o.created_at DESC),'[]'::jsonb))
 FROM public.gu_signed_book_orders_v01431 o
 WHERE o.user_id=auth.uid() AND o.status IN ('paid','on_hold','refunded','disputed')
 AND NOT EXISTS(SELECT 1 FROM public.admin_user_roles r WHERE r.user_id=auth.uid() AND r.role_code='SHOWCASE_VIEWER' AND (r.expires_at IS NULL OR r.expires_at>now()));
$fn$;
REVOKE ALL ON FUNCTION public.gu_signed_my_orders_v01431() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.gu_signed_my_orders_v01431() TO authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
