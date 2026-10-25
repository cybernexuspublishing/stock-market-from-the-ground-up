-- v0.14.0.238: Immediate in-app Owner notification for new advertising inquiries.
-- Never sends private advertiser contact details to the public or email.
CREATE OR REPLACE FUNCTION public.gu_ad_owner_inquiry_notice_v014238()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
 SET search_path=pg_catalog,pg_temp AS $notice$
BEGIN
 INSERT INTO public.user_notifications(user_id,notification_type,title,body,href,metadata)
 SELECT DISTINCT r.user_id,'system',
 'New sponsorship inquiry',
 'An advertising inquiry is ready for Owner review in the Sponsor & Advertising Center.',
 '/admin-advertising.html',
 jsonb_build_object('inquiry_id',NEW.id,'package_code',NEW.package_code,'source','ad_sales')
 FROM public.admin_user_roles r
 WHERE r.role_code='OWNER' AND (r.expires_at IS NULL OR r.expires_at>now());
 RETURN NEW;
END $notice$;
REVOKE ALL ON FUNCTION public.gu_ad_owner_inquiry_notice_v014238()
 FROM PUBLIC,anon,authenticated;
DROP TRIGGER IF EXISTS gu_ad_owner_inquiry_notice_v014238 ON public.gu_ad_inquiries_v014226;
CREATE TRIGGER gu_ad_owner_inquiry_notice_v014238
 AFTER INSERT ON public.gu_ad_inquiries_v014226
 FOR EACH ROW EXECUTE FUNCTION public.gu_ad_owner_inquiry_notice_v014238();
