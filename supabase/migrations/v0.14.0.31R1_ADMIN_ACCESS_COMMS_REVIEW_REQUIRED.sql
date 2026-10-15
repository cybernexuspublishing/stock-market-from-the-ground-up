-- The Stock Market: From the Ground Up — v0.14.0.31 R1 (COMBINED v31 release)
-- REVIEW REQUIRED. APPLY AFTER v0.14.0.31_SIGNED_BOOK_STRIPE_REVIEW_REQUIRED.sql.
-- No provider changes, no account changes, no automated customer messages.
-- OWNER can authorize ADMIN to inspect JUST-IN-TIME paid-order shipping addresses.
-- Signed book payment remains Stripe-only and OFF; Lemon Squeezy remains for digital/subscriptions.
BEGIN;
DO $prereq$ BEGIN
 IF to_regclass('public.profiles') IS NULL OR to_regclass('public.admin_user_roles') IS NULL
 OR to_regclass('public.admin_user_flags') IS NULL OR to_regclass('public.site_settings') IS NULL
 OR to_regclass('public.admin_audit_log') IS NULL OR to_regclass('public.user_notifications') IS NULL
 OR to_regclass('public.gu_signed_book_orders_v01431') IS NULL
 OR to_regprocedure('public.gu_print_owner_guard_v01428()') IS NULL
 OR to_regprocedure('auth.jwt()') IS NULL THEN
 RAISE EXCEPTION 'v31R1 missing security or v31 signed-book prerequisites'; END IF;
END $prereq$;
INSERT INTO public.site_settings(setting_key,category,value,public_read,description) VALUES
 ('communications.owner_member_notices_enabled','communications','true'::jsonb,false,'OWNER messages to individual members (in-app only).'),
 ('communications.admin_member_notices_enabled','communications','false'::jsonb,false,'ADMIN messages to individual members; requires Owner activation.'),
 ('commerce.admin_shipping_address_access_enabled','commerce','false'::jsonb,false,'Allow verified ADMIN with MFA to view paid signed-book shipping addresses.'),
 ('site.registration_enabled','site','true'::jsonb,true,'Website signup visibility; Supabase Auth signup settings must also be configured.')
ON CONFLICT(setting_key) DO NOTHING;

-- P0: generic /api/admin setting_save uses a privileged service key and must NOT
-- bypass the OWNER AAL2 switches below. Deny direct row writes at the DB boundary.
CREATE OR REPLACE FUNCTION public.gu_v01431r1_control_write_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $fn$
DECLARE keyname text; actor uuid;
BEGIN
 keyname:=CASE WHEN TG_OP='DELETE' THEN OLD.setting_key ELSE NEW.setting_key END;
 IF TG_OP='UPDATE' AND (OLD.setting_key IN
  ('communications.owner_member_notices_enabled','communications.admin_member_notices_enabled',
   'commerce.admin_shipping_address_access_enabled','site.registration_enabled',
   'commerce.checkout_enabled','commerce.signed_books_checkout_enabled')
  OR NEW.setting_key IN
  ('communications.owner_member_notices_enabled','communications.admin_member_notices_enabled',
   'commerce.admin_shipping_address_access_enabled','site.registration_enabled',
   'commerce.checkout_enabled','commerce.signed_books_checkout_enabled'))
 THEN
   IF NEW.setting_key IS DISTINCT FROM OLD.setting_key THEN
      RAISE EXCEPTION 'PROTECTED_SETTING_KEY_CANNOT_BE_RENAMED' USING ERRCODE='42501'; END IF;
 END IF;
 IF keyname IN
  ('communications.owner_member_notices_enabled','communications.admin_member_notices_enabled',
   'commerce.admin_shipping_address_access_enabled','site.registration_enabled',
   'commerce.checkout_enabled','commerce.signed_books_checkout_enabled') THEN
   IF TG_OP='DELETE' THEN RAISE EXCEPTION 'PROTECTED_SETTING_CANNOT_BE_DELETED' USING ERRCODE='42501'; END IF;
   actor:=public.gu_print_owner_guard_v01428();
   IF actor IS NULL OR coalesce(auth.jwt()->>'aal','')<>'aal2' THEN
    RAISE EXCEPTION 'OWNER_AAL2_REQUIRED_FOR_PROTECTED_SETTING' USING ERRCODE='42501'; END IF;
 END IF;
 RETURN CASE WHEN TG_OP='DELETE' THEN OLD ELSE NEW END;
END $fn$;
DROP TRIGGER IF EXISTS gu_v01431r1_protected_settings ON public.site_settings;
CREATE TRIGGER gu_v01431r1_protected_settings BEFORE INSERT OR UPDATE OR DELETE
ON public.site_settings FOR EACH ROW EXECUTE FUNCTION public.gu_v01431r1_control_write_guard();
REVOKE ALL ON FUNCTION public.gu_v01431r1_control_write_guard() FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION public.gu_staff_identity_v01431r1()
RETURNS text LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $fn$
DECLARE u uuid:=auth.uid(); role text;
BEGIN
 IF u IS NULL OR coalesce(auth.jwt()->>'aal','')<>'aal2' OR
 NOT EXISTS(SELECT 1 FROM public.profiles p WHERE p.id=u AND p.account_kind='member') OR
 EXISTS(SELECT 1 FROM public.admin_user_flags f WHERE f.user_id=u AND lower(f.status) IN ('restricted','suspended')) OR
 EXISTS(SELECT 1 FROM public.admin_user_roles r WHERE r.user_id=u AND r.role_code='SHOWCASE_VIEWER'
  AND (r.expires_at IS NULL OR r.expires_at>now()))
 THEN RAISE EXCEPTION 'ELIGIBLE_STAFF_AAL2_REQUIRED' USING ERRCODE='42501'; END IF;
 SELECT r.role_code INTO role FROM public.admin_user_roles r
 WHERE r.user_id=u AND r.role_code IN ('OWNER','ADMIN')
 AND (r.expires_at IS NULL OR r.expires_at>now())
 ORDER BY CASE WHEN r.role_code='OWNER' THEN 0 ELSE 1 END LIMIT 1;
 IF role IS NULL THEN RAISE EXCEPTION 'AUTHORIZED_STAFF_REQUIRED' USING ERRCODE='42501'; END IF;
 RETURN role;
END $fn$;
REVOKE ALL ON FUNCTION public.gu_staff_identity_v01431r1() FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION public.gu_staff_console_v01431r1()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $fn$
DECLARE role text; settings jsonb; users jsonb; notices jsonb;
BEGIN
 role:=public.gu_staff_identity_v01431r1();
 SELECT coalesce(jsonb_object_agg(setting_key,value),'{}'::jsonb) INTO settings
 FROM public.site_settings WHERE setting_key IN
 ('communications.owner_member_notices_enabled','communications.admin_member_notices_enabled',
  'commerce.admin_shipping_address_access_enabled','site.registration_enabled',
  'commerce.signed_books_checkout_enabled','commerce.checkout_enabled');
 SELECT coalesce(jsonb_agg(jsonb_build_object('id',p.id,'username',p.username)
  ORDER BY p.username),'[]'::jsonb) INTO users FROM (
  SELECT p.id,p.username FROM public.profiles p WHERE p.account_kind='member' AND p.username IS NOT NULL
  ORDER BY p.username LIMIT 500) p;
 SELECT coalesce(jsonb_agg(jsonb_build_object('id',n.id,'username',p.username,'title',n.title,
 'body',n.body,'createdAt',n.created_at,'sentBy',sender.username)
 ORDER BY n.created_at DESC),'[]'::jsonb) INTO notices
 FROM (SELECT * FROM public.user_notifications
 WHERE notification_type='owner_notice' AND metadata->>'origin' IN ('owner_notice','admin_notice')
 AND (role='OWNER' OR metadata->>'created_by'=auth.uid()::text)
 ORDER BY created_at DESC LIMIT 100) n
 LEFT JOIN public.profiles p ON p.id=n.user_id
 LEFT JOIN public.profiles sender ON sender.id=(CASE WHEN n.metadata->>'created_by' ~
 '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
 THEN (n.metadata->>'created_by')::uuid ELSE NULL END);
 RETURN jsonb_build_object('ok',true,'role',role,'settings',coalesce(settings,'{}'::jsonb),
 'members',users,'notices',notices,'maxDirectory',500,
 'siteRegistrationProviderManaged',true);
END $fn$;
REVOKE ALL ON FUNCTION public.gu_staff_console_v01431r1() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.gu_staff_console_v01431r1() TO authenticated;

CREATE OR REPLACE FUNCTION public.gu_owner_operations_save_v01431r1(p_key text,p_enabled boolean)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $fn$
DECLARE u uuid; prior jsonb;
BEGIN
 u:=public.gu_print_owner_guard_v01428();
 IF coalesce(auth.jwt()->>'aal','')<>'aal2' THEN
 RAISE EXCEPTION 'OWNER_MFA_REQUIRED' USING ERRCODE='42501'; END IF;
 IF p_key NOT IN ('communications.owner_member_notices_enabled',
  'communications.admin_member_notices_enabled','commerce.admin_shipping_address_access_enabled',
  'site.registration_enabled','commerce.checkout_enabled',
  'commerce.signed_books_checkout_enabled') OR p_enabled IS NULL THEN
 RAISE EXCEPTION 'CONTROL_NOT_APPROVED' USING ERRCODE='42501'; END IF;
 SELECT s.value INTO prior FROM public.site_settings s WHERE s.setting_key=p_key FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'CONTROL_MISSING'; END IF;
 UPDATE public.site_settings SET value=to_jsonb(p_enabled),updated_at=clock_timestamp()
 WHERE setting_key=p_key;
 INSERT INTO public.admin_audit_log(actor_user_id,action,target_type,target_id,details)
 VALUES(u,'admin.control.v01431r1','site_setting',p_key,
 jsonb_build_object('old',prior,'new',p_enabled,'note','Owner-directed')); 
 RETURN jsonb_build_object('ok',true,'key',p_key,'enabled',p_enabled);
END $fn$;
REVOKE ALL ON FUNCTION public.gu_owner_operations_save_v01431r1(text,boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.gu_owner_operations_save_v01431r1(text,boolean) TO authenticated;

CREATE OR REPLACE FUNCTION public.gu_staff_send_notice_v01431r1(
 p_username text,p_title text,p_body text,p_href text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $fn$
DECLARE role text; u uuid:=auth.uid(); target uuid; recipient_count integer; message_id bigint;
BEGIN
 role:=public.gu_staff_identity_v01431r1();
 IF NOT EXISTS(SELECT 1 FROM public.site_settings s WHERE s.setting_key=
  CASE WHEN role='OWNER' THEN 'communications.owner_member_notices_enabled'
  ELSE 'communications.admin_member_notices_enabled' END AND s.value='true'::jsonb) THEN
  RAISE EXCEPTION 'MEMBER_MESSAGING_DISABLED' USING ERRCODE='42501'; END IF;
 IF p_username IS NULL OR length(p_username)<3 OR length(p_username)>64 OR
  p_username !~ '^[A-Za-z][A-Za-z0-9_]{2,63}$' OR
  p_title IS NULL OR length(trim(p_title)) NOT BETWEEN 3 AND 150 OR
  p_body IS NULL OR length(trim(p_body)) NOT BETWEEN 5 AND 2000 OR
  (p_href IS NOT NULL AND p_href<>'' AND
   (length(p_href)>250 OR p_href !~ '^/[a-zA-Z0-9/_?#=&.%-]+$' OR p_href LIKE '//%')) THEN
  RAISE EXCEPTION 'INVALID_MESSAGE' USING ERRCODE='22023'; END IF;
 SELECT count(*) INTO recipient_count FROM public.profiles
 WHERE lower(username)=lower(trim(p_username)) AND account_kind='member';
 SELECT id INTO target FROM public.profiles
 WHERE lower(username)=lower(trim(p_username)) AND account_kind='member' LIMIT 1;
 IF recipient_count<>1 OR NOT EXISTS(SELECT 1 FROM public.profiles WHERE id=target AND account_kind='member') THEN
  RAISE EXCEPTION 'USERNAME_NOT_UNIQUE_OR_INELIGIBLE' USING ERRCODE='22023'; END IF;
 IF EXISTS(SELECT 1 FROM public.admin_user_flags WHERE user_id=target AND lower(status)='suspended') THEN
  RAISE EXCEPTION 'TARGET_ACCOUNT_RESTRICTED'; END IF;
 INSERT INTO public.user_notifications(user_id,notification_type,title,body,href,metadata)
 VALUES(target,'owner_notice',trim(p_title),trim(p_body),nullif(p_href,''),
 jsonb_build_object('origin',CASE WHEN role='OWNER' THEN 'owner_notice' ELSE 'admin_notice' END,
 'created_by',u::text,'sender_role',role,'recipient_username',p_username)) RETURNING id INTO message_id;
 INSERT INTO public.admin_audit_log(actor_user_id,action,target_type,target_id,details)
 VALUES(u,'communications.direct_notice.sent.v01431r1','member',target::text,
 jsonb_build_object('notice_id',message_id,'recipient_username',p_username,'sender_role',role));
 RETURN jsonb_build_object('ok',true,'id',message_id,'recipient',p_username);
END $fn$;
REVOKE ALL ON FUNCTION public.gu_staff_send_notice_v01431r1(text,text,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.gu_staff_send_notice_v01431r1(text,text,text,text) TO authenticated;

-- Enforce OWNER/ADMIN notice toggles even for the older Owner service-role API.
CREATE OR REPLACE FUNCTION public.gu_notice_send_policy_v01431r1()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $fn$
DECLARE k text;
BEGIN
 IF NEW.notification_type<>'owner_notice' THEN RETURN NEW; END IF;
 IF NEW.metadata->>'origin' NOT IN ('owner_notice','admin_notice') THEN RETURN NEW; END IF;
 k:=CASE WHEN NEW.metadata->>'origin'='admin_notice'
  THEN 'communications.admin_member_notices_enabled'
  ELSE 'communications.owner_member_notices_enabled' END;
 IF NOT EXISTS(SELECT 1 FROM public.site_settings s WHERE s.setting_key=k AND s.value='true'::jsonb)
 THEN RAISE EXCEPTION 'MEMBER_NOTICE_SENDING_DISABLED' USING ERRCODE='42501'; END IF;
 RETURN NEW;
END $fn$;
DROP TRIGGER IF EXISTS gu_notice_send_policy_v01431r1 ON public.user_notifications;
CREATE TRIGGER gu_notice_send_policy_v01431r1 BEFORE INSERT ON public.user_notifications
FOR EACH ROW EXECUTE FUNCTION public.gu_notice_send_policy_v01431r1();
REVOKE ALL ON FUNCTION public.gu_notice_send_policy_v01431r1() FROM PUBLIC,anon,authenticated;

-- OWNER always; ADMIN only if Owner's separate shipping permission switch is ON.
-- Stripe payment status and identity are verified again by the Cloudflare Function.
CREATE OR REPLACE FUNCTION public.gu_staff_signed_shipping_session_v01431r1(p_id uuid)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $fn$
DECLARE role text; session text;
BEGIN
 role:=public.gu_staff_identity_v01431r1();
 IF role='ADMIN' AND NOT EXISTS(SELECT 1 FROM public.site_settings s
 WHERE s.setting_key='commerce.admin_shipping_address_access_enabled' AND s.value='true'::jsonb)
 THEN RAISE EXCEPTION 'ADMIN_SHIPPING_ACCESS_DISABLED' USING ERRCODE='42501'; END IF;
 SELECT o.stripe_session_id INTO session FROM public.gu_signed_book_orders_v01431 o
 WHERE o.id=p_id AND o.status IN ('paid','on_hold') AND o.stripe_session_id IS NOT NULL;
 IF session IS NOT NULL THEN
  INSERT INTO public.admin_audit_log(actor_user_id,action,target_type,target_id,details)
  VALUES(auth.uid(),'commerce.shipping.address.request.v01431r1','signed_book_order',p_id::text,
   jsonb_build_object('staff_role',role,'request_type','just_in_time_stripe'));
 END IF;
 RETURN session;
END $fn$;
REVOKE ALL ON FUNCTION public.gu_staff_signed_shipping_session_v01431r1(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.gu_staff_signed_shipping_session_v01431r1(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.gu_staff_signed_orders_v01431r1()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $fn$
DECLARE role text; orders jsonb;
BEGIN
 role:=public.gu_staff_identity_v01431r1();
 IF role='ADMIN' AND NOT EXISTS(SELECT 1 FROM public.site_settings s
 WHERE s.setting_key='commerce.admin_shipping_address_access_enabled' AND s.value='true'::jsonb)
 THEN RETURN jsonb_build_object('ok',true,'orders','[]'::jsonb,'allowed',false); END IF;
 SELECT coalesce(jsonb_agg(jsonb_build_object('id',o.id,'username',coalesce(p.username,'Unknown'),
 'code',o.product_code,'edition',o.edition,'status',o.status,'fulfillment',o.fulfillment,
 'createdAt',o.created_at) ORDER BY o.created_at DESC),'[]'::jsonb)
 INTO orders FROM (SELECT * FROM public.gu_signed_book_orders_v01431
 WHERE status IN ('paid','on_hold') ORDER BY created_at DESC LIMIT 100) o
 LEFT JOIN public.profiles p ON p.id=o.user_id;
 RETURN jsonb_build_object('ok',true,'allowed',true,'orders',orders);
END $fn$;
REVOKE ALL ON FUNCTION public.gu_staff_signed_orders_v01431r1() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.gu_staff_signed_orders_v01431r1() TO authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
