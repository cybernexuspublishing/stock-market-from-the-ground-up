-- v0.14.0.17 candidate additive migration for polls, thanks, thread ratings & subscriptions.
-- NOT automatically deployed. REVIEW and run ONCE only after checking actual production schema.
-- No existing forum row is rewritten or deleted. Does not modify SQL A/B lockdown.
BEGIN;
DO $$ BEGIN
 IF to_regprocedure('public.v0143_commons_can_open(boolean,boolean,text,text)') IS NULL OR
    to_regclass('public.commons_forums') IS NULL OR
    to_regclass('public.forum_topics') IS NULL OR to_regclass('public.forum_posts') IS NULL OR
    to_regclass('public.commons_topics') IS NULL OR to_regclass('public.commons_posts') IS NULL OR
    to_regclass('public.profiles') IS NULL OR to_regclass('public.admin_user_roles') IS NULL OR
    to_regclass('public.admin_user_flags') IS NULL OR to_regclass('public.commons_topic_subscriptions') IS NULL
 THEN RAISE EXCEPTION 'Forum, identity or subscription prerequisites missing; migration aborted.'; END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.gu_forum_polls (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 scope text NOT NULL CHECK(scope IN ('legacy','commons')),
 topic_id bigint NOT NULL CHECK(topic_id>0),
 creator_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 question text NOT NULL CHECK(char_length(question) BETWEEN 10 AND 300),
 allow_multiple boolean NOT NULL DEFAULT false,
 closes_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(scope,topic_id)
);
CREATE TABLE IF NOT EXISTS public.gu_forum_poll_options (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 poll_id bigint NOT NULL REFERENCES public.gu_forum_polls(id) ON DELETE CASCADE,
 position smallint NOT NULL CHECK(position BETWEEN 1 AND 12),
 label text NOT NULL CHECK(char_length(label) BETWEEN 1 AND 180),
 UNIQUE(poll_id,position)
);
CREATE TABLE IF NOT EXISTS public.gu_forum_poll_votes (
 poll_id bigint NOT NULL REFERENCES public.gu_forum_polls(id) ON DELETE CASCADE,
 option_id bigint NOT NULL REFERENCES public.gu_forum_poll_options(id) ON DELETE CASCADE,
 user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(poll_id,option_id,user_id)
);
CREATE INDEX IF NOT EXISTS gu_poll_votes_user_idx ON public.gu_forum_poll_votes(user_id,poll_id);
CREATE TABLE IF NOT EXISTS public.gu_forum_thanks (
 scope text NOT NULL CHECK(scope IN ('legacy','commons')),
 target_kind text NOT NULL CHECK(target_kind IN ('topic','post')),
 target_id bigint NOT NULL CHECK(target_id>0),
 user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(scope,target_kind,target_id,user_id)
);
CREATE INDEX IF NOT EXISTS gu_forum_thanks_user_idx ON public.gu_forum_thanks(user_id,created_at);
CREATE TABLE IF NOT EXISTS public.gu_forum_ratings (
 scope text NOT NULL CHECK(scope IN ('legacy','commons')),
 topic_id bigint NOT NULL CHECK(topic_id>0),
 user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 rating smallint NOT NULL CHECK(rating BETWEEN 1 AND 5),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(scope,topic_id,user_id)
);
CREATE TABLE IF NOT EXISTS public.gu_forum_legacy_subscriptions (
 topic_id bigint NOT NULL REFERENCES public.forum_topics(id) ON DELETE CASCADE,
 user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(topic_id,user_id)
);

-- Internal tables are not accessible via PostgREST directly; only reviewed RPC functions below.
ALTER TABLE public.gu_forum_polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gu_forum_poll_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gu_forum_poll_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gu_forum_thanks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gu_forum_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gu_forum_legacy_subscriptions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.gu_forum_polls,public.gu_forum_poll_options,
 public.gu_forum_poll_votes,public.gu_forum_thanks,public.gu_forum_ratings,
 public.gu_forum_legacy_subscriptions FROM PUBLIC,anon,authenticated;
GRANT ALL ON TABLE public.gu_forum_polls,public.gu_forum_poll_options,
 public.gu_forum_poll_votes,public.gu_forum_thanks,public.gu_forum_ratings,
 public.gu_forum_legacy_subscriptions TO service_role;

CREATE OR REPLACE FUNCTION public.gu_forum_real_member()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,auth,pg_temp AS $$
 SELECT auth.uid() IS NOT NULL
  AND EXISTS(SELECT 1 FROM public.profiles p WHERE p.id=auth.uid() AND p.account_kind='member')
  AND NOT EXISTS(SELECT 1 FROM public.admin_user_roles r WHERE r.user_id=auth.uid()
    AND r.role_code='SHOWCASE_VIEWER' AND (r.expires_at IS NULL OR r.expires_at>now()))
  AND NOT EXISTS(SELECT 1 FROM public.admin_user_flags f WHERE f.user_id=auth.uid()
    AND f.status IN ('suspended','restricted'));
$$;
REVOKE ALL ON FUNCTION public.gu_forum_real_member() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.gu_forum_real_member() TO authenticated;

CREATE OR REPLACE FUNCTION public.gu_forum_topic_allowed(p_scope text,p_topic_id bigint)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public,auth,pg_temp AS $$
DECLARE v_exists boolean;
BEGIN
 IF NOT public.gu_forum_real_member() OR p_topic_id IS NULL OR p_topic_id<1 THEN RETURN false; END IF;
 IF p_scope='commons' THEN
  -- Historical Labs can contain gated future information. Do not expose through polls.
  SELECT EXISTS(SELECT 1 FROM public.commons_topics t JOIN public.commons_forums f
      ON f.forum_code=t.forum_code WHERE t.id=p_topic_id AND t.status='published'
     AND t.forum_code<>'HISTORICAL_LABS' AND t.legacy_source_code IS NULL
     AND public.v0143_commons_can_open(f.active,f.member_only,f.book_code,f.tool_code)) INTO v_exists;
 ELSIF p_scope='legacy' THEN
  -- to_jsonb handles installations with/without lab_id without changing the source schema.
  SELECT EXISTS(SELECT 1 FROM public.forum_topics t WHERE t.id=p_topic_id AND t.status='published'
     AND nullif(to_jsonb(t)->>'lab_id','') IS NULL) INTO v_exists;
 ELSE RETURN false;
 END IF;
 RETURN COALESCE(v_exists,false);
END; $$;
REVOKE ALL ON FUNCTION public.gu_forum_topic_allowed(text,bigint) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.gu_forum_topic_allowed(text,bigint) TO authenticated;

CREATE OR REPLACE FUNCTION public.gu_forum_poll_create(
 p_scope text,p_topic_id bigint,p_question text,p_options text[],p_closes_at timestamptz DEFAULT NULL,
 p_allow_multiple boolean DEFAULT false)
RETURNS bigint LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,auth,pg_temp AS $$
DECLARE v_author uuid;v_new_id bigint;v_n integer;v_i integer;v_question text:=trim(coalesce(p_question,''));
BEGIN
 IF NOT public.gu_forum_topic_allowed(p_scope,p_topic_id) THEN RAISE EXCEPTION 'Discussion unavailable or ineligible for polls'; END IF;
 IF p_scope='commons' THEN SELECT author_user_id INTO v_author FROM public.commons_topics WHERE id=p_topic_id;
 ELSE SELECT author_id INTO v_author FROM public.forum_topics WHERE id=p_topic_id; END IF;
 IF v_author IS DISTINCT FROM auth.uid() THEN RAISE EXCEPTION 'Only the discussion author can add a poll'; END IF;
 v_n:=coalesce(array_length(p_options,1),0);
 IF v_n NOT BETWEEN 2 AND 12 OR char_length(v_question) NOT BETWEEN 10 AND 300
  THEN RAISE EXCEPTION 'Poll needs a 10–300 character question and 2–12 choices'; END IF;
 IF p_closes_at IS NOT NULL AND (p_closes_at<=now()+interval '5 minutes' OR p_closes_at>now()+interval '60 days')
  THEN RAISE EXCEPTION 'Poll close time must be 5 minutes to 60 days from now'; END IF;
 IF EXISTS(SELECT 1 FROM unnest(p_options) o WHERE char_length(trim(o)) NOT BETWEEN 1 AND 180)
  OR (SELECT count(DISTINCT lower(trim(o))) FROM unnest(p_options) o)<>v_n
  THEN RAISE EXCEPTION 'Poll choices must be unique and 1–180 characters'; END IF;
 INSERT INTO public.gu_forum_polls(scope,topic_id,creator_id,question,allow_multiple,closes_at)
 VALUES(p_scope,p_topic_id,auth.uid(),v_question,coalesce(p_allow_multiple,false),p_closes_at) RETURNING id INTO v_new_id;
 FOR v_i IN 1..v_n LOOP
  INSERT INTO public.gu_forum_poll_options(poll_id,position,label) VALUES(v_new_id,v_i,trim(p_options[v_i]));
 END LOOP;
 RETURN v_new_id;
END; $$;
REVOKE ALL ON FUNCTION public.gu_forum_poll_create(text,bigint,text,text[],timestamptz,boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.gu_forum_poll_create(text,bigint,text,text[],timestamptz,boolean) TO authenticated;

CREATE OR REPLACE FUNCTION public.gu_forum_poll_get(p_scope text,p_topic_id bigint)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public,auth,pg_temp AS $$
DECLARE v_poll public.gu_forum_polls%rowtype;v_choices jsonb;v_uid uuid:=auth.uid();v_voted boolean;v_author uuid;
BEGIN
 IF NOT public.gu_forum_topic_allowed(p_scope,p_topic_id) THEN RAISE EXCEPTION 'Discussion not available'; END IF;
 IF p_scope='commons' THEN SELECT author_user_id INTO v_author FROM public.commons_topics WHERE id=p_topic_id;
 ELSE SELECT author_id INTO v_author FROM public.forum_topics WHERE id=p_topic_id; END IF;
 SELECT * INTO v_poll FROM public.gu_forum_polls WHERE scope=p_scope AND topic_id=p_topic_id;
 IF NOT FOUND THEN RETURN jsonb_build_object('poll',null,'is_author',v_uid=v_author); END IF;
 SELECT EXISTS(SELECT 1 FROM public.gu_forum_poll_votes WHERE poll_id=v_poll.id AND user_id=v_uid) INTO v_voted;
 SELECT jsonb_agg(jsonb_build_object('id',x.id,'label',x.label,'votes',x.votes) ORDER BY x.position)
 INTO v_choices FROM (
  SELECT o.id,o.position,o.label,(SELECT count(*) FROM public.gu_forum_poll_votes v
   WHERE v.poll_id=v_poll.id AND v.option_id=o.id) AS votes
  FROM public.gu_forum_poll_options o WHERE o.poll_id=v_poll.id
 ) x;
 RETURN jsonb_build_object('poll',jsonb_build_object('id',v_poll.id,'question',v_poll.question,
  'allow_multiple',v_poll.allow_multiple,'closes_at',v_poll.closes_at,
  'closed',v_poll.closes_at IS NOT NULL AND v_poll.closes_at<=now(),
  'has_voted',v_voted,'options',coalesce(v_choices,'[]'::jsonb)), 'is_author',v_uid=v_author);
END; $$;
REVOKE ALL ON FUNCTION public.gu_forum_poll_get(text,bigint) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.gu_forum_poll_get(text,bigint) TO authenticated;

CREATE OR REPLACE FUNCTION public.gu_forum_poll_vote(p_scope text,p_topic_id bigint,p_option_ids bigint[])
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,auth,pg_temp AS $$
DECLARE v_poll public.gu_forum_polls%rowtype;v_n integer;v_unique integer;
BEGIN
 IF NOT public.gu_forum_topic_allowed(p_scope,p_topic_id) THEN RAISE EXCEPTION 'Discussion not available'; END IF;
 SELECT * INTO v_poll FROM public.gu_forum_polls WHERE scope=p_scope AND topic_id=p_topic_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Poll not found'; END IF;
 IF v_poll.closes_at IS NOT NULL AND v_poll.closes_at<=now() THEN RAISE EXCEPTION 'Poll closed'; END IF;
 v_n:=coalesce(array_length(p_option_ids,1),0);
 IF v_n<1 OR v_n>(CASE WHEN v_poll.allow_multiple THEN 12 ELSE 1 END) THEN RAISE EXCEPTION 'Invalid vote selections'; END IF;
 SELECT count(DISTINCT val) INTO v_unique FROM unnest(p_option_ids) val;
 IF v_n<>v_unique OR (SELECT count(*) FROM public.gu_forum_poll_options
  WHERE poll_id=v_poll.id AND id=ANY(p_option_ids))<>v_n THEN RAISE EXCEPTION 'Invalid vote options'; END IF;
 IF EXISTS(SELECT 1 FROM public.gu_forum_poll_votes WHERE poll_id=v_poll.id AND user_id=auth.uid())
  THEN RAISE EXCEPTION 'You have already voted; votes cannot be changed'; END IF;
 INSERT INTO public.gu_forum_poll_votes(poll_id,option_id,user_id)
 SELECT v_poll.id,val,auth.uid() FROM unnest(p_option_ids) val;
 RETURN true;
END; $$;
REVOKE ALL ON FUNCTION public.gu_forum_poll_vote(text,bigint,bigint[]) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.gu_forum_poll_vote(text,bigint,bigint[]) TO authenticated;

CREATE OR REPLACE FUNCTION public.gu_forum_toggle_thanks(p_scope text,p_kind text,p_id bigint)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,auth,pg_temp AS $$
DECLARE v_author uuid;v_topic bigint;v_existing boolean;v_count bigint;
BEGIN
 IF NOT public.gu_forum_real_member() OR p_id IS NULL OR p_id<1 OR p_kind NOT IN ('topic','post')
 THEN RAISE EXCEPTION 'Invalid thanks action'; END IF;
 IF p_scope='commons' AND p_kind='topic' THEN SELECT author_user_id,id INTO v_author,v_topic FROM public.commons_topics WHERE id=p_id AND status='published';
 ELSIF p_scope='commons' AND p_kind='post' THEN SELECT author_user_id,topic_id INTO v_author,v_topic FROM public.commons_posts WHERE id=p_id AND status='published';
 ELSIF p_scope='legacy' AND p_kind='topic' THEN SELECT author_id,id INTO v_author,v_topic FROM public.forum_topics WHERE id=p_id AND status='published';
 ELSIF p_scope='legacy' AND p_kind='post' THEN SELECT author_id,topic_id INTO v_author,v_topic FROM public.forum_posts WHERE id=p_id AND status='published';
 ELSE RAISE EXCEPTION 'Unknown forum'; END IF;
 IF v_author IS NULL OR v_author=auth.uid() OR NOT public.gu_forum_topic_allowed(p_scope,v_topic)
 THEN RAISE EXCEPTION 'This post cannot receive your thanks'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(auth.uid()::text,417151));
 SELECT EXISTS(SELECT 1 FROM public.gu_forum_thanks WHERE scope=p_scope AND target_kind=p_kind AND target_id=p_id AND user_id=auth.uid()) INTO v_existing;
 IF v_existing THEN DELETE FROM public.gu_forum_thanks WHERE scope=p_scope AND target_kind=p_kind AND target_id=p_id AND user_id=auth.uid();
 ELSE
  IF (SELECT count(*) FROM public.gu_forum_thanks WHERE user_id=auth.uid() AND created_at>now()-interval '24 hours')>=100
   THEN RAISE EXCEPTION 'Daily thanks limit reached'; END IF;
  INSERT INTO public.gu_forum_thanks(scope,target_kind,target_id,user_id) VALUES(p_scope,p_kind,p_id,auth.uid());
 END IF;
 SELECT count(*) INTO v_count FROM public.gu_forum_thanks WHERE scope=p_scope AND target_kind=p_kind AND target_id=p_id;
 RETURN jsonb_build_object('active',NOT v_existing,'count',v_count);
END; $$;
REVOKE ALL ON FUNCTION public.gu_forum_toggle_thanks(text,text,bigint) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.gu_forum_toggle_thanks(text,text,bigint) TO authenticated;

CREATE OR REPLACE FUNCTION public.gu_forum_rate_topic(p_scope text,p_topic_id bigint,p_rating smallint)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,auth,pg_temp AS $$
DECLARE v_avg numeric;v_count bigint;
BEGIN
 IF NOT public.gu_forum_topic_allowed(p_scope,p_topic_id) OR p_rating NOT BETWEEN 1 AND 5
 THEN RAISE EXCEPTION 'Discussion unavailable or rating invalid'; END IF;
 INSERT INTO public.gu_forum_ratings(scope,topic_id,user_id,rating)
 VALUES(p_scope,p_topic_id,auth.uid(),p_rating)
 ON CONFLICT(scope,topic_id,user_id) DO UPDATE SET rating=excluded.rating,updated_at=now();
 SELECT round(avg(rating)::numeric,2),count(*) INTO v_avg,v_count FROM public.gu_forum_ratings
 WHERE scope=p_scope AND topic_id=p_topic_id;
 RETURN jsonb_build_object('average',v_avg,'count',v_count,'my_rating',p_rating);
END; $$;
REVOKE ALL ON FUNCTION public.gu_forum_rate_topic(text,bigint,smallint) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.gu_forum_rate_topic(text,bigint,smallint) TO authenticated;

CREATE OR REPLACE FUNCTION public.gu_forum_toggle_subscription(p_scope text,p_topic_id bigint)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,auth,pg_temp AS $$
DECLARE v_found boolean;
BEGIN
 IF NOT public.gu_forum_topic_allowed(p_scope,p_topic_id) THEN RAISE EXCEPTION 'Discussion unavailable'; END IF;
 IF p_scope='commons' THEN
  SELECT EXISTS(SELECT 1 FROM public.commons_topic_subscriptions WHERE user_id=auth.uid() AND topic_id=p_topic_id) INTO v_found;
  IF v_found THEN DELETE FROM public.commons_topic_subscriptions WHERE user_id=auth.uid() AND topic_id=p_topic_id;
  ELSE INSERT INTO public.commons_topic_subscriptions(user_id,topic_id) VALUES(auth.uid(),p_topic_id) ON CONFLICT DO NOTHING; END IF;
 ELSE
  SELECT EXISTS(SELECT 1 FROM public.gu_forum_legacy_subscriptions WHERE user_id=auth.uid() AND topic_id=p_topic_id) INTO v_found;
  IF v_found THEN DELETE FROM public.gu_forum_legacy_subscriptions WHERE user_id=auth.uid() AND topic_id=p_topic_id;
  ELSE INSERT INTO public.gu_forum_legacy_subscriptions(user_id,topic_id) VALUES(auth.uid(),p_topic_id) ON CONFLICT DO NOTHING; END IF;
 END IF;
 RETURN NOT v_found;
END; $$;
REVOKE ALL ON FUNCTION public.gu_forum_toggle_subscription(text,bigint) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.gu_forum_toggle_subscription(text,bigint) TO authenticated;

CREATE OR REPLACE FUNCTION public.gu_forum_interaction_state(p_scope text,p_topic_id bigint)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public,auth,pg_temp AS $$
DECLARE v_sub boolean;v_avg numeric;v_count bigint;
BEGIN
 IF NOT public.gu_forum_topic_allowed(p_scope,p_topic_id) THEN RAISE EXCEPTION 'Discussion unavailable'; END IF;
 IF p_scope='commons' THEN
  SELECT EXISTS(SELECT 1 FROM public.commons_topic_subscriptions WHERE user_id=auth.uid() AND topic_id=p_topic_id) INTO v_sub;
 ELSE
  SELECT EXISTS(SELECT 1 FROM public.gu_forum_legacy_subscriptions WHERE user_id=auth.uid() AND topic_id=p_topic_id) INTO v_sub;
 END IF;
 SELECT round(avg(rating)::numeric,2),count(*) INTO v_avg,v_count FROM public.gu_forum_ratings
 WHERE scope=p_scope AND topic_id=p_topic_id;
 RETURN jsonb_build_object('subscribed',v_sub,'rating_average',v_avg,'rating_count',v_count);
END; $$;
REVOKE ALL ON FUNCTION public.gu_forum_interaction_state(text,bigint) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.gu_forum_interaction_state(text,bigint) TO authenticated;


CREATE OR REPLACE FUNCTION public.gu_forum_thanks_for_topic(p_scope text,p_topic_id bigint)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public,auth,pg_temp AS $$
DECLARE v_results jsonb;
BEGIN
 IF NOT public.gu_forum_topic_allowed(p_scope,p_topic_id) THEN RAISE EXCEPTION 'Discussion unavailable'; END IF;
 SELECT coalesce(jsonb_agg(jsonb_build_object('kind',s.target_kind,'id',s.target_id,
    'count',s.total,'mine',s.mine)), '[]'::jsonb)
 INTO v_results
 FROM (SELECT x.target_kind,x.target_id,count(*) AS total,
              bool_or(x.user_id=auth.uid()) AS mine
  FROM public.gu_forum_thanks x
  WHERE x.scope=p_scope AND ( (x.target_kind='topic' AND x.target_id=p_topic_id)
   OR (x.target_kind='post' AND EXISTS(
      SELECT 1 FROM public.forum_posts fp WHERE p_scope='legacy'
       AND fp.id=x.target_id AND fp.topic_id=p_topic_id AND fp.status='published'
      UNION ALL
      SELECT 1 FROM public.commons_posts cp WHERE p_scope='commons'
       AND cp.id=x.target_id AND cp.topic_id=p_topic_id AND cp.status='published'
   )) )
  GROUP BY x.target_kind,x.target_id
  LIMIT 250
 ) s;
 RETURN v_results;
END; $$;
REVOKE ALL ON FUNCTION public.gu_forum_thanks_for_topic(text,bigint) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.gu_forum_thanks_for_topic(text,bigint) TO authenticated;

COMMIT;
