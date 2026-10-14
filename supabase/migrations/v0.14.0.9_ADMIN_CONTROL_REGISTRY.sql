-- THE STOCK MARKET: FROM THE GROUND UP / v0.14.0.9
-- ADMIN NAVIGATION CONFIGURATION ONLY; does NOT grant application permissions.
-- Apply to the existing database after backup/preview. Does not change prior records.
BEGIN;
DO $$
DECLARE c text;
BEGIN
 FOREACH c IN ARRAY ARRAY[
 'profiles.account_kind','admin_user_roles.role_code','admin_user_roles.expires_at',
 'admin_user_flags.status','site_control_events_v1354.actor_user_id',
 'site_control_events_v1354.module_code','site_control_events_v1354.action',
 'site_control_events_v1354.target','site_control_events_v1354.details'
 ] LOOP
 IF NOT EXISTS (SELECT 1 FROM information_schema.columns
 WHERE table_schema='public' AND table_name=split_part(c,'.',1)
 AND column_name=split_part(c,'.',2))
 THEN RAISE EXCEPTION 'v0.14.0.9 prerequisite missing: %', c;
 END IF;
 END LOOP;
END $$;
CREATE TABLE IF NOT EXISTS public.admin_control_registry_v01409 (
 control_key text PRIMARY KEY,
 label text NOT NULL CHECK (length(label) BETWEEN 2 AND 100),
 group_name text NOT NULL CHECK (length(group_name) BETWEEN 3 AND 80),
 sort_order integer NOT NULL DEFAULT 100 CHECK (sort_order BETWEEN 0 AND 99999),
 is_visible boolean NOT NULL DEFAULT true,
 kind text NOT NULL DEFAULT 'builtin' CHECK (kind IN ('builtin','custom_link')),
 href text,
 archived boolean NOT NULL DEFAULT false,
 updated_at timestamptz NOT NULL DEFAULT now(),
 updated_by uuid
);
ALTER TABLE public.admin_control_registry_v01409 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.admin_control_registry_v01409 FROM PUBLIC, anon, authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON TABLE public.admin_control_registry_v01409 TO service_role;

CREATE OR REPLACE FUNCTION public.v01409_admin_control_save(
 p_actor uuid,p_key text,p_label text,p_group text,p_sort integer,
 p_visible boolean,p_kind text,p_href text,p_remove boolean DEFAULT false
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE v_kind text; v_exists boolean;
BEGIN
 IF NOT EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id=p_actor AND p.account_kind='member'
 ) OR NOT EXISTS (
    SELECT 1 FROM public.admin_user_roles r WHERE r.user_id=p_actor
      AND r.role_code='OWNER' AND (r.expires_at IS NULL OR r.expires_at>now())
 ) OR EXISTS (
    SELECT 1 FROM public.admin_user_flags f WHERE f.user_id=p_actor
      AND lower(coalesce(f.status,'')) IN ('suspended','restricted')
 ) THEN RAISE EXCEPTION 'Owner authorization required'; END IF;
 IF p_key IS NULL OR p_key !~ '^(builtin|custom):[A-Za-z0-9._:-]{2,110}$'
   OR p_label IS NULL OR length(trim(p_label)) NOT BETWEEN 2 AND 100
   OR p_group IS NULL OR length(trim(p_group)) NOT BETWEEN 3 AND 80
   OR p_sort IS NULL OR p_sort NOT BETWEEN 0 AND 99999
   OR p_kind NOT IN ('builtin','custom_link')
 THEN RAISE EXCEPTION 'Invalid administrative control'; END IF;
 IF (p_kind='builtin' AND p_key NOT LIKE 'builtin:%')
    OR (p_kind='custom_link' AND p_key NOT LIKE 'custom:%')
 THEN RAISE EXCEPTION 'Control identity mismatch'; END IF;
 IF p_kind='custom_link' AND (p_href IS NULL OR p_href !~ '^/[a-zA-Z0-9/_?&=.%#-]{1,250}$'
    OR p_href LIKE '//%' OR p_href ~* '^/api/' OR p_href ~* '(%2f%2f|%5c)')
 THEN RAISE EXCEPTION 'Only safe internal navigation links are supported'; END IF;
 IF p_kind='builtin' AND coalesce(p_href,'')<>'' THEN RAISE EXCEPTION 'Built-in control targets cannot be replaced'; END IF;
 IF p_key IN ('builtin:panel-dashboard','builtin:id-cc-control-manager')
   AND (NOT p_visible OR p_remove) THEN RAISE EXCEPTION 'Required recovery controls cannot be hidden'; END IF;
 SELECT kind INTO v_kind FROM public.admin_control_registry_v01409 WHERE control_key=p_key;
 IF v_kind IS NOT NULL AND v_kind<>p_kind THEN RAISE EXCEPTION 'Control kind cannot change'; END IF;
 IF p_remove AND p_kind<>'custom_link' THEN RAISE EXCEPTION 'Built-in controls cannot be removed'; END IF;
 INSERT INTO public.admin_control_registry_v01409
  (control_key,label,group_name,sort_order,is_visible,kind,href,archived,updated_by,updated_at)
 VALUES (p_key,trim(p_label),trim(p_group),p_sort,p_visible,p_kind,
         CASE WHEN p_kind='custom_link' THEN p_href ELSE NULL END,p_remove,p_actor,now())
 ON CONFLICT (control_key) DO UPDATE SET label=EXCLUDED.label,group_name=EXCLUDED.group_name,
  sort_order=EXCLUDED.sort_order,is_visible=EXCLUDED.is_visible,
  href=EXCLUDED.href,archived=EXCLUDED.archived,updated_by=EXCLUDED.updated_by,updated_at=now();
 INSERT INTO public.site_control_events_v1354
  (actor_user_id,module_code,action,target,details)
 VALUES(p_actor,'ADMIN_NAV',CASE WHEN p_remove THEN 'custom.remove' ELSE 'control.save' END,p_key,
        jsonb_build_object('group',p_group,'visible',p_visible,'kind',p_kind,'order',p_sort));
 RETURN jsonb_build_object('ok',true,'key',p_key);
END$$;
REVOKE ALL ON FUNCTION public.v01409_admin_control_save(uuid,text,text,text,integer,boolean,text,text,boolean) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.v01409_admin_control_save(uuid,text,text,text,integer,boolean,text,text,boolean) TO service_role;
COMMIT;
