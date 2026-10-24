-- v0.14.0.177 — Member status and durable founder-number credit on canonical Commons content.
CREATE OR REPLACE FUNCTION public.gu_founder_my_status_v014174()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $s$
DECLARE uid uuid:=auth.uid();n smallint;earned text;current_plan text;life boolean;
BEGIN
 IF uid IS NULL THEN RETURN jsonb_build_object('eligible',false);END IF;
 SELECT founder_number,earned_plan_code INTO n,earned FROM public.gu_founder_members_v014173
 WHERE user_id=uid AND revoked_at IS NULL;
 IF NOT FOUND THEN RETURN jsonb_build_object('eligible',false);END IF;
 SELECT ss.plan_code INTO current_plan FROM public.site_subscriptions ss
 WHERE ss.user_id=uid AND ss.plan_code IN ('FOUNDING_30','FOUNDING_60')
 AND ss.status IN ('active','trialing') AND ss.current_period_end>now()
 ORDER BY ss.current_period_end DESC LIMIT 1;
 SELECT EXISTS(SELECT 1 FROM public.user_plan_grants g WHERE g.user_id=uid
 AND g.plan_code='LIFETIME' AND g.status IN ('active','trialing')
 AND (g.starts_at IS NULL OR g.starts_at<=now()) AND (g.ends_at IS NULL OR g.ends_at>now()))
 OR EXISTS(SELECT 1 FROM public.site_subscriptions ss WHERE ss.user_id=uid
 AND ss.plan_code='LIFETIME' AND ss.status IN ('active','trialing')) INTO life;
 RETURN jsonb_build_object('eligible',public.gu_founder_commons_access_v014174('shared'),
 'founderNumber',n,'earnedTier',earned,
 'currentPlan',CASE WHEN life THEN 'LIFETIME' ELSE current_plan END,
 'council',public.gu_founder_commons_access_v014174('council'));
END $s$;
REVOKE ALL ON FUNCTION public.gu_founder_my_status_v014174() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.gu_founder_my_status_v014174() TO authenticated;
CREATE OR REPLACE FUNCTION public.gu_founder_commons_author_label_v014177()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $tag$
DECLARE n smallint;f_code text;
BEGIN
 IF TG_TABLE_NAME='commons_posts' THEN
  SELECT t.forum_code INTO f_code FROM public.commons_topics t WHERE t.id=NEW.topic_id;
 ELSE f_code:=NEW.forum_code;
 END IF;
 IF f_code NOT LIKE 'F600_%' OR NEW.author_user_id IS NULL THEN RETURN NEW;END IF;
 SELECT m.founder_number INTO n FROM public.gu_founder_members_v014173 m
 WHERE m.user_id=NEW.author_user_id AND m.revoked_at IS NULL;
 IF n IS NOT NULL THEN NEW.author_label:='Founding #'||lpad(n::text,4,'0');
 ELSIF EXISTS (SELECT 1 FROM public.admin_user_roles WHERE user_id=NEW.author_user_id
 AND role_code='OWNER' AND (expires_at IS NULL OR expires_at>now()))
 THEN NEW.author_label:='Official Moderator';
 ELSE RAISE EXCEPTION 'Founding membership required to publish here';END IF;
 RETURN NEW;
END $tag$;
REVOKE ALL ON FUNCTION public.gu_founder_commons_author_label_v014177() FROM PUBLIC,anon,authenticated;
DROP TRIGGER IF EXISTS f600_tag_topic_author ON public.commons_topics;
CREATE TRIGGER f600_tag_topic_author BEFORE INSERT ON public.commons_topics FOR EACH ROW
EXECUTE FUNCTION public.gu_founder_commons_author_label_v014177();
DROP TRIGGER IF EXISTS f600_tag_reply_author ON public.commons_posts;
CREATE TRIGGER f600_tag_reply_author BEFORE INSERT ON public.commons_posts FOR EACH ROW
EXECUTE FUNCTION public.gu_founder_commons_author_label_v014177();