-- v0.14.0.278: social operations before Founding 600 beta.
-- Separate from Ads billing, member entitlements and external provider automation.
CREATE TABLE IF NOT EXISTS public.gu_social_campaigns_v014278 (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 owner_id uuid NOT NULL REFERENCES auth.users(id),
 title text NOT NULL CHECK(length(btrim(title)) BETWEEN 3 AND 120),
 objective text NOT NULL DEFAULT '' CHECK(length(objective)<=500),
 destination_url text CHECK(destination_url IS NULL OR
  (length(destination_url)<=1000 AND destination_url ~ '^https://[^[:space:]]+$')),
 category text NOT NULL DEFAULT 'education'
  CHECK(category IN('education','founding600','bootcamp','labs','books','tools','brand')),
 state text NOT NULL DEFAULT 'draft' CHECK(state IN('draft','active','paused','archived')),
 starts_at timestamptz,ends_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 CHECK(ends_at IS NULL OR starts_at IS NULL OR ends_at>starts_at),
 UNIQUE(owner_id,title)
);
CREATE INDEX IF NOT EXISTS gu_social_campaigns_owner_v014278 ON
 public.gu_social_campaigns_v014278(owner_id,state,updated_at DESC);

ALTER TABLE public.gu_social_posts_v014276
 ADD COLUMN IF NOT EXISTS campaign_id uuid REFERENCES public.gu_social_campaigns_v014278(id),
 ADD COLUMN IF NOT EXISTS approved_at timestamptz,
 ADD COLUMN IF NOT EXISTS approved_by uuid REFERENCES auth.users(id),
 ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 1 CHECK(version>0);

CREATE TABLE IF NOT EXISTS public.gu_social_templates_v014278 (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 owner_id uuid NOT NULL REFERENCES auth.users(id),
 name text NOT NULL CHECK(length(btrim(name)) BETWEEN 3 AND 100),
 category text NOT NULL DEFAULT 'education'
  CHECK(category IN('education','founding600','bootcamp','labs','books','tools','brand')),
 body text NOT NULL CHECK(length(btrim(body)) BETWEEN 1 AND 280),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(owner_id,name)
);
CREATE TABLE IF NOT EXISTS public.gu_social_tasks_v014278 (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 owner_id uuid NOT NULL REFERENCES auth.users(id),
 title text NOT NULL CHECK(length(btrim(title)) BETWEEN 3 AND 180),
 details text NOT NULL DEFAULT '' CHECK(length(details)<=2000),
 kind text NOT NULL DEFAULT 'follow_up'
  CHECK(kind IN('follow_up','engagement','community_review','publication_review','support')),
 state text NOT NULL DEFAULT 'open' CHECK(state IN('open','in_progress','completed','cancelled')),
 target_url text CHECK(target_url IS NULL OR
  (length(target_url)<=1000 AND target_url ~ '^https://[^[:space:]]+$')),
 due_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS gu_social_tasks_queue_v014278 ON
 public.gu_social_tasks_v014278(owner_id,state,due_at);

CREATE TABLE IF NOT EXISTS public.gu_social_metrics_v014278 (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 owner_id uuid NOT NULL REFERENCES auth.users(id),
 post_id uuid NOT NULL REFERENCES public.gu_social_posts_v014276(id),
 observed_at timestamptz NOT NULL DEFAULT now(),
 views integer CHECK(views IS NULL OR views>=0),
 likes integer CHECK(likes IS NULL OR likes>=0),
 replies integer CHECK(replies IS NULL OR replies>=0),
 reposts integer CHECK(reposts IS NULL OR reposts>=0),
 link_clicks integer CHECK(link_clicks IS NULL OR link_clicks>=0),
 source text NOT NULL DEFAULT 'owner_manual' CHECK(source IN('owner_manual')),
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(post_id,observed_at)
);
CREATE INDEX IF NOT EXISTS gu_social_metrics_owner_v014278 ON
 public.gu_social_metrics_v014278(owner_id,observed_at DESC);

CREATE TABLE IF NOT EXISTS public.gu_social_post_revisions_v014278 (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 post_id uuid NOT NULL REFERENCES public.gu_social_posts_v014276(id),
 owner_id uuid NOT NULL REFERENCES auth.users(id),
 from_version integer NOT NULL,
 old_body text NOT NULL,
 old_status text NOT NULL,
 old_campaign_id uuid,
 recorded_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS gu_social_revisions_post_v014278 ON
 public.gu_social_post_revisions_v014278(post_id,recorded_at DESC);

-- Constrain versioned updates and keep publication claims immutable.
CREATE OR REPLACE FUNCTION public.gu_social_post_integrity_v014278()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER
SET search_path=pg_catalog,pg_temp AS $$
BEGIN
 IF NEW.owner_id IS DISTINCT FROM OLD.owner_id OR NEW.id IS DISTINCT FROM OLD.id THEN
  RAISE EXCEPTION 'SOCIAL_POST_OWNERSHIP_IMMUTABLE';
 END IF;
 IF OLD.status='manual_recorded' AND
   (NEW.body IS DISTINCT FROM OLD.body OR NEW.external_url IS DISTINCT FROM OLD.external_url
    OR NEW.status IS DISTINCT FROM OLD.status) THEN
  RAISE EXCEPTION 'SOCIAL_MANUAL_PUBLICATION_IMMUTABLE';
 END IF;
 IF NEW.status='manual_recorded' AND OLD.status NOT IN ('approved','planned','manual_recorded') THEN
  RAISE EXCEPTION 'SOCIAL_APPROVAL_REQUIRED_BEFORE_MANUAL_PUBLICATION';
 END IF;
 IF NEW.version<>OLD.version+1 THEN
  RAISE EXCEPTION 'SOCIAL_REVISION_CONFLICT';
 END IF;
 INSERT INTO public.gu_social_post_revisions_v014278
  (post_id,owner_id,from_version,old_body,old_status,old_campaign_id)
 VALUES(OLD.id,OLD.owner_id,OLD.version,OLD.body,OLD.status,OLD.campaign_id);
 RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS gu_social_post_integrity_v014278 ON public.gu_social_posts_v014276;
CREATE TRIGGER gu_social_post_integrity_v014278
 BEFORE UPDATE ON public.gu_social_posts_v014276
 FOR EACH ROW EXECUTE FUNCTION public.gu_social_post_integrity_v014278();

-- Private-by-default: all mutations require Owner-verified server/API.
ALTER TABLE public.gu_social_campaigns_v014278 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gu_social_templates_v014278 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gu_social_tasks_v014278 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gu_social_metrics_v014278 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gu_social_post_revisions_v014278 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.gu_social_campaigns_v014278,public.gu_social_templates_v014278,
 public.gu_social_tasks_v014278,public.gu_social_metrics_v014278,
 public.gu_social_post_revisions_v014278 FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.gu_social_campaigns_v014278,
 public.gu_social_templates_v014278,public.gu_social_tasks_v014278 TO service_role;
GRANT SELECT,INSERT ON public.gu_social_metrics_v014278,
 public.gu_social_post_revisions_v014278 TO service_role;
GRANT USAGE,SELECT ON SEQUENCE public.gu_social_post_revisions_v014278_id_seq TO service_role;
REVOKE ALL ON FUNCTION public.gu_social_post_integrity_v014278() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.gu_social_post_integrity_v014278() TO service_role;

-- Reuse existing transaction-bound social audit using row-type-safe jsonb projection.
CREATE OR REPLACE FUNCTION public.gu_social_operations_audit_v014278()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER
SET search_path=pg_catalog,pg_temp AS $$
DECLARE state_value text;
BEGIN
 IF TG_TABLE_NAME='gu_social_campaigns_v014278' OR TG_TABLE_NAME='gu_social_tasks_v014278' THEN
  state_value := pg_catalog.to_jsonb(NEW)->>'state';
 ELSE
  state_value := 'recorded';
 END IF;
 INSERT INTO public.gu_social_audit_v014276(actor,action,resource_type,resource_id,details)
 VALUES(NEW.owner_id,CASE WHEN TG_OP='INSERT' THEN 'created' ELSE 'updated' END,
 TG_TABLE_NAME,NEW.id,pg_catalog.jsonb_build_object('state',state_value));
 RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.gu_social_operations_audit_v014278() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.gu_social_operations_audit_v014278() TO service_role;
CREATE TRIGGER gu_social_campaign_audit_v014278 AFTER INSERT OR UPDATE ON public.gu_social_campaigns_v014278
 FOR EACH ROW EXECUTE FUNCTION public.gu_social_operations_audit_v014278();
CREATE TRIGGER gu_social_template_audit_v014278 AFTER INSERT OR UPDATE ON public.gu_social_templates_v014278
 FOR EACH ROW EXECUTE FUNCTION public.gu_social_operations_audit_v014278();
CREATE TRIGGER gu_social_task_audit_v014278 AFTER INSERT OR UPDATE ON public.gu_social_tasks_v014278
 FOR EACH ROW EXECUTE FUNCTION public.gu_social_operations_audit_v014278();
CREATE TRIGGER gu_social_metric_audit_v014278 AFTER INSERT ON public.gu_social_metrics_v014278
 FOR EACH ROW EXECUTE FUNCTION public.gu_social_operations_audit_v014278();

-- Cross-record ownership must hold even for privileged server writers.
CREATE OR REPLACE FUNCTION public.gu_social_scope_guard_v014278()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER
SET search_path=pg_catalog,pg_temp AS $$
BEGIN
 IF TG_TABLE_NAME='gu_social_posts_v014276' THEN
  IF NEW.campaign_id IS NOT NULL AND NOT EXISTS(
   SELECT 1 FROM public.gu_social_campaigns_v014278
    WHERE id=NEW.campaign_id AND owner_id=NEW.owner_id
  ) THEN RAISE EXCEPTION 'SOCIAL_CAMPAIGN_OWNER_MISMATCH'; END IF;
 ELSIF TG_TABLE_NAME='gu_social_metrics_v014278' THEN
  IF NOT EXISTS(SELECT 1 FROM public.gu_social_posts_v014276
                WHERE id=NEW.post_id AND owner_id=NEW.owner_id AND status='manual_recorded')
  THEN RAISE EXCEPTION 'SOCIAL_METRIC_POST_OWNERSHIP_OR_PUBLICATION_REQUIRED'; END IF;
 ELSE RAISE EXCEPTION 'SOCIAL_UNEXPECTED_TABLE'; END IF;
 RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.gu_social_scope_guard_v014278() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.gu_social_scope_guard_v014278() TO service_role;
CREATE TRIGGER gu_social_post_scope_v014278 BEFORE INSERT OR UPDATE ON public.gu_social_posts_v014276
 FOR EACH ROW EXECUTE FUNCTION public.gu_social_scope_guard_v014278();
CREATE TRIGGER gu_social_metric_scope_v014278 BEFORE INSERT OR UPDATE ON public.gu_social_metrics_v014278
 FOR EACH ROW EXECUTE FUNCTION public.gu_social_scope_guard_v014278();
