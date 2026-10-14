-- GWS v0.14.0.3: atomic, Owner-only draft revisions + safe restore. No public publishing.
BEGIN;
ALTER TABLE public.gws_client_drafts_v014 ADD COLUMN IF NOT EXISTS revision_number integer NOT NULL DEFAULT 0;
CREATE TABLE IF NOT EXISTS public.gws_client_draft_revisions_v0143 (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 project_id uuid NOT NULL REFERENCES public.gws_client_drafts_v014(id) ON DELETE RESTRICT,
 revision_number integer NOT NULL CHECK(revision_number>0),
 snapshot jsonb NOT NULL,
 actor_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(project_id,revision_number)
);
CREATE INDEX IF NOT EXISTS gws_draft_revisions_recent_v0143 ON public.gws_client_draft_revisions_v0143(project_id,revision_number DESC);
ALTER TABLE public.gws_client_draft_revisions_v0143 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.gws_client_draft_revisions_v0143 FROM PUBLIC,anon,authenticated;
GRANT ALL ON public.gws_client_draft_revisions_v0143 TO service_role;
GRANT USAGE,SELECT ON SEQUENCE public.gws_client_draft_revisions_v0143_id_seq TO service_role;

CREATE OR REPLACE FUNCTION public.v0143_gws_owner(p_actor uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
 SELECT EXISTS(SELECT 1 FROM public.profiles p JOIN public.admin_user_roles r ON r.user_id=p.id
 WHERE p.id=p_actor AND p.account_kind='member' AND r.role_code='OWNER'
 AND (r.expires_at IS NULL OR r.expires_at>now()));
$$;
REVOKE ALL ON FUNCTION public.v0143_gws_owner(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.v0143_gws_owner(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.v0143_gws_save(
 p_actor uuid,p_code text,p_label text,p_contact text,p_title text,p_summary text,p_blocks jsonb,p_expected integer
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE project public.gws_client_drafts_v014%rowtype; next_revision integer; snapshot jsonb;
BEGIN
 IF NOT public.v0143_gws_owner(p_actor) THEN RAISE EXCEPTION 'OWNER authority required'; END IF;
 IF p_code !~ '^[A-Z][A-Z0-9_]{2,63}$' OR length(coalesce(p_label,'')) NOT BETWEEN 3 AND 120
   OR length(coalesce(p_title,'')) NOT BETWEEN 3 AND 150 OR length(coalesce(p_summary,''))>1500
   OR length(coalesce(p_contact,''))>120 OR jsonb_typeof(p_blocks) IS DISTINCT FROM 'array'
   OR jsonb_array_length(p_blocks)>40 OR pg_column_size(p_blocks)>=45000
   OR p_expected IS NULL OR p_expected<0 THEN RAISE EXCEPTION 'Invalid GWS draft'; END IF;
 IF EXISTS (SELECT 1 FROM jsonb_array_elements(p_blocks) x
   WHERE jsonb_typeof(x) IS DISTINCT FROM 'object'
   OR x->>'type' IS NULL OR x->>'type' NOT IN ('heading','paragraph','callout')
   OR jsonb_typeof(x->'text') IS DISTINCT FROM 'string'
   OR length(x->>'text')>2000) THEN
   RAISE EXCEPTION 'Invalid GWS content block'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('gws:'||p_code,1403));
 INSERT INTO public.gws_client_drafts_v014(project_code,label,contact_label,page_title,page_summary,page_blocks)
 VALUES(p_code,p_label,nullif(p_contact,''),p_title,p_summary,p_blocks)
 ON CONFLICT(project_code) DO NOTHING;
 SELECT * INTO project FROM public.gws_client_drafts_v014 WHERE project_code=p_code FOR UPDATE;
 IF project.revision_number<>p_expected THEN RAISE EXCEPTION 'GWS draft revision conflict; reload before saving'; END IF;
 next_revision:=project.revision_number+1;
 UPDATE public.gws_client_drafts_v014 SET label=p_label,contact_label=nullif(p_contact,''),
 page_title=p_title,page_summary=p_summary,page_blocks=p_blocks,status='draft',
 revision_number=next_revision,updated_at=now() WHERE id=project.id;
 snapshot:=jsonb_build_object('label',p_label,'contact_label',p_contact,
   'page_title',p_title,'page_summary',p_summary,'page_blocks',p_blocks);
 INSERT INTO public.gws_client_draft_revisions_v0143(project_id,revision_number,snapshot,actor_user_id)
 VALUES(project.id,next_revision,snapshot,p_actor);
 INSERT INTO public.admin_audit_log(actor_user_id,action,target_type,target_id,details)
 VALUES(p_actor,'gws.draft.save','gws_project',p_code,jsonb_build_object('revision',next_revision));
 RETURN jsonb_build_object('ok',true,'projectCode',p_code,'revision',next_revision,'publishingEnabled',false);
END; $$;
REVOKE ALL ON FUNCTION public.v0143_gws_save(uuid,text,text,text,text,text,jsonb,integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.v0143_gws_save(uuid,text,text,text,text,text,jsonb,integer) TO service_role;

CREATE OR REPLACE FUNCTION public.v0143_gws_restore(p_actor uuid,p_code text,p_revision integer,p_expected integer)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE project public.gws_client_drafts_v014%rowtype; restored jsonb; new_number integer;
BEGIN
 IF NOT public.v0143_gws_owner(p_actor) THEN RAISE EXCEPTION 'OWNER authority required'; END IF;
 SELECT * INTO project FROM public.gws_client_drafts_v014 WHERE project_code=p_code FOR UPDATE;
 IF NOT FOUND OR project.revision_number<>p_expected THEN RAISE EXCEPTION 'GWS draft unavailable or revision conflict'; END IF;
 SELECT snapshot INTO restored FROM public.gws_client_draft_revisions_v0143
 WHERE project_id=project.id AND revision_number=p_revision;
 IF NOT FOUND THEN RAISE EXCEPTION 'Requested revision does not exist'; END IF;
 new_number:=project.revision_number+1;
 UPDATE public.gws_client_drafts_v014 SET label=restored->>'label',contact_label=restored->>'contact_label',
 page_title=restored->>'page_title',page_summary=restored->>'page_summary',
 page_blocks=restored->'page_blocks',status='draft',revision_number=new_number,updated_at=now()
 WHERE id=project.id;
 INSERT INTO public.gws_client_draft_revisions_v0143(project_id,revision_number,snapshot,actor_user_id)
 VALUES(project.id,new_number,restored,p_actor);
 INSERT INTO public.admin_audit_log(actor_user_id,action,target_type,target_id,details)
 VALUES(p_actor,'gws.draft.restore','gws_project',p_code,jsonb_build_object('from',p_revision,'to',new_number));
 RETURN jsonb_build_object('ok',true,'revision',new_number,'publishingEnabled',false);
END; $$;
REVOKE ALL ON FUNCTION public.v0143_gws_restore(uuid,text,integer,integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.v0143_gws_restore(uuid,text,integer,integer) TO service_role;
NOTIFY pgrst,'reload schema';
COMMIT;
