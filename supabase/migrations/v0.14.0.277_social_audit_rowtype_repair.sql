-- Forward-only repair for the Owner social audit trigger.
-- PostgreSQL checks a CASE expression's field references for a specific NEW row type
-- even when that branch is not chosen. Use PL/pgSQL IF to separate table row layouts.
CREATE OR REPLACE FUNCTION public.gu_social_record_audit_v014276()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER
SET search_path=pg_catalog,pg_temp AS $$
DECLARE audit_details jsonb;
BEGIN
 IF TG_TABLE_NAME='gu_social_posts_v014276' THEN
  audit_details := pg_catalog.jsonb_build_object('status',NEW.status);
 ELSIF TG_TABLE_NAME='gu_social_communities_v014276' THEN
  audit_details := pg_catalog.jsonb_build_object('membership_status',NEW.membership_status,
                                                 'promotion_policy',NEW.promotion_policy);
 ELSE
  RAISE EXCEPTION 'Unexpected social audit table';
 END IF;
 INSERT INTO public.gu_social_audit_v014276
 (actor,action,resource_type,resource_id,details)
 VALUES(NEW.owner_id,CASE WHEN TG_OP='INSERT' THEN 'created' ELSE 'updated' END,
        TG_TABLE_NAME,NEW.id,audit_details);
 RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.gu_social_record_audit_v014276() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.gu_social_record_audit_v014276() TO service_role;
