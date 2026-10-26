-- v0.14.0.290_supabase_member_rls_initplan_v2
-- RLS planner improvement for 23 current, explicitly inspected policies.
-- Only replaces per-row auth.uid() with a statement-stable SELECT; access predicates, roles and grants stay unchanged.
-- Non-destructive. Compensating rollback: supabase/rollbacks/v0.14.0.290_supabase_member_rls_initplan_v2_ROLLBACK.sql
BEGIN;
SET LOCAL lock_timeout='3s'; SET LOCAL statement_timeout='30s';
DO $guard$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='decision_journal' AND policyname='read own decision journal' AND cmd='SELECT' AND permissive='PERMISSIVE' AND roles='{authenticated}'::name[] AND qual IS NOT DISTINCT FROM '(auth.uid() = user_id)' AND with_check IS NOT DISTINCT FROM NULL) THEN RAISE EXCEPTION 'V014290_CONCURRENT_POLICY_DRIFT:decision_journal/read own decision journal'; END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='forum_topics' AND policyname='update own unlocked forum topics' AND cmd='UPDATE' AND permissive='PERMISSIVE' AND roles='{authenticated}'::name[] AND qual IS NOT DISTINCT FROM '((auth.uid() = author_id) AND (is_locked = false) AND (status = ''published''::text))' AND with_check IS NOT DISTINCT FROM '((auth.uid() = author_id) AND (status = ''published''::text))') THEN RAISE EXCEPTION 'V014290_CONCURRENT_POLICY_DRIFT:forum_topics/update own unlocked forum topics'; END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='forum_posts' AND policyname='update own forum posts' AND cmd='UPDATE' AND permissive='PERMISSIVE' AND roles='{authenticated}'::name[] AND qual IS NOT DISTINCT FROM '((auth.uid() = author_id) AND (status = ''published''::text))' AND with_check IS NOT DISTINCT FROM '((auth.uid() = author_id) AND (status = ''published''::text))') THEN RAISE EXCEPTION 'V014290_CONCURRENT_POLICY_DRIFT:forum_posts/update own forum posts'; END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='decision_journal' AND policyname='insert own decision journal' AND cmd='INSERT' AND permissive='PERMISSIVE' AND roles='{authenticated}'::name[] AND qual IS NOT DISTINCT FROM NULL AND with_check IS NOT DISTINCT FROM '(auth.uid() = user_id)') THEN RAISE EXCEPTION 'V014290_CONCURRENT_POLICY_DRIFT:decision_journal/insert own decision journal'; END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='decision_journal' AND policyname='update own decision journal' AND cmd='UPDATE' AND permissive='PERMISSIVE' AND roles='{authenticated}'::name[] AND qual IS NOT DISTINCT FROM '(auth.uid() = user_id)' AND with_check IS NOT DISTINCT FROM '(auth.uid() = user_id)') THEN RAISE EXCEPTION 'V014290_CONCURRENT_POLICY_DRIFT:decision_journal/update own decision journal'; END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='decision_journal' AND policyname='delete own decision journal' AND cmd='DELETE' AND permissive='PERMISSIVE' AND roles='{authenticated}'::name[] AND qual IS NOT DISTINCT FROM '(auth.uid() = user_id)' AND with_check IS NOT DISTINCT FROM NULL) THEN RAISE EXCEPTION 'V014290_CONCURRENT_POLICY_DRIFT:decision_journal/delete own decision journal'; END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='forum_topics' AND policyname='read published forum topics' AND cmd='SELECT' AND permissive='PERMISSIVE' AND roles='{authenticated}'::name[] AND qual IS NOT DISTINCT FROM '((status = ''published''::text) AND ((lab_id IS NULL) OR (EXISTS ( SELECT 1
   FROM lab_attempts a
  WHERE ((a.user_id = auth.uid()) AND (a.lab_id = forum_topics.lab_id))))))' AND with_check IS NOT DISTINCT FROM NULL) THEN RAISE EXCEPTION 'V014290_CONCURRENT_POLICY_DRIFT:forum_topics/read published forum topics'; END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='forum_topics' AND policyname='create own forum topics' AND cmd='INSERT' AND permissive='PERMISSIVE' AND roles='{authenticated}'::name[] AND qual IS NOT DISTINCT FROM NULL AND with_check IS NOT DISTINCT FROM '((auth.uid() = author_id) AND (status = ''published''::text) AND (EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.username IS NOT NULL)))) AND ((lab_id IS NULL) OR (EXISTS ( SELECT 1
   FROM lab_attempts a
  WHERE ((a.user_id = auth.uid()) AND (a.lab_id = forum_topics.lab_id))))))') THEN RAISE EXCEPTION 'V014290_CONCURRENT_POLICY_DRIFT:forum_topics/create own forum topics'; END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='forum_posts' AND policyname='read published forum posts' AND cmd='SELECT' AND permissive='PERMISSIVE' AND roles='{authenticated}'::name[] AND qual IS NOT DISTINCT FROM '((status = ''published''::text) AND (EXISTS ( SELECT 1
   FROM forum_topics t
  WHERE ((t.id = forum_posts.topic_id) AND (t.status = ''published''::text) AND ((t.lab_id IS NULL) OR (EXISTS ( SELECT 1
           FROM lab_attempts a
          WHERE ((a.user_id = auth.uid()) AND (a.lab_id = t.lab_id)))))))))' AND with_check IS NOT DISTINCT FROM NULL) THEN RAISE EXCEPTION 'V014290_CONCURRENT_POLICY_DRIFT:forum_posts/read published forum posts'; END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='forum_posts' AND policyname='create own forum posts' AND cmd='INSERT' AND permissive='PERMISSIVE' AND roles='{authenticated}'::name[] AND qual IS NOT DISTINCT FROM NULL AND with_check IS NOT DISTINCT FROM '((auth.uid() = author_id) AND (status = ''published''::text) AND (EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.username IS NOT NULL)))) AND (EXISTS ( SELECT 1
   FROM forum_topics t
  WHERE ((t.id = forum_posts.topic_id) AND (t.status = ''published''::text) AND (t.is_locked = false) AND ((t.lab_id IS NULL) OR (EXISTS ( SELECT 1
           FROM lab_attempts a
          WHERE ((a.user_id = auth.uid()) AND (a.lab_id = t.lab_id)))))))))') THEN RAISE EXCEPTION 'V014290_CONCURRENT_POLICY_DRIFT:forum_posts/create own forum posts'; END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='trade_plan_snapshots' AND policyname='read own plan snapshots' AND cmd='SELECT' AND permissive='PERMISSIVE' AND roles='{authenticated}'::name[] AND qual IS NOT DISTINCT FROM '(auth.uid() = user_id)' AND with_check IS NOT DISTINCT FROM NULL) THEN RAISE EXCEPTION 'V014290_CONCURRENT_POLICY_DRIFT:trade_plan_snapshots/read own plan snapshots'; END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='journal_reviews' AND policyname='read own journal reviews' AND cmd='SELECT' AND permissive='PERMISSIVE' AND roles='{authenticated}'::name[] AND qual IS NOT DISTINCT FROM '(auth.uid() = user_id)' AND with_check IS NOT DISTINCT FROM NULL) THEN RAISE EXCEPTION 'V014290_CONCURRENT_POLICY_DRIFT:journal_reviews/read own journal reviews'; END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='journal_reviews' AND policyname='update own journal reviews' AND cmd='UPDATE' AND permissive='PERMISSIVE' AND roles='{authenticated}'::name[] AND qual IS NOT DISTINCT FROM '(auth.uid() = user_id)' AND with_check IS NOT DISTINCT FROM '(auth.uid() = user_id)') THEN RAISE EXCEPTION 'V014290_CONCURRENT_POLICY_DRIFT:journal_reviews/update own journal reviews'; END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='site_orders' AND policyname='read own site orders' AND cmd='SELECT' AND permissive='PERMISSIVE' AND roles='{authenticated}'::name[] AND qual IS NOT DISTINCT FROM '(auth.uid() = user_id)' AND with_check IS NOT DISTINCT FROM NULL) THEN RAISE EXCEPTION 'V014290_CONCURRENT_POLICY_DRIFT:site_orders/read own site orders'; END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='site_order_items' AND policyname='read own site order items' AND cmd='SELECT' AND permissive='PERMISSIVE' AND roles='{authenticated}'::name[] AND qual IS NOT DISTINCT FROM '(EXISTS ( SELECT 1
   FROM site_orders o
  WHERE ((o.id = site_order_items.order_id) AND (o.user_id = auth.uid()))))' AND with_check IS NOT DISTINCT FROM NULL) THEN RAISE EXCEPTION 'V014290_CONCURRENT_POLICY_DRIFT:site_order_items/read own site order items'; END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='site_subscriptions' AND policyname='read own subscriptions' AND cmd='SELECT' AND permissive='PERMISSIVE' AND roles='{authenticated}'::name[] AND qual IS NOT DISTINCT FROM '(auth.uid() = user_id)' AND with_check IS NOT DISTINCT FROM NULL) THEN RAISE EXCEPTION 'V014290_CONCURRENT_POLICY_DRIFT:site_subscriptions/read own subscriptions'; END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='user_tool_passes' AND policyname='read own tool passes' AND cmd='SELECT' AND permissive='PERMISSIVE' AND roles='{authenticated}'::name[] AND qual IS NOT DISTINCT FROM '(auth.uid() = user_id)' AND with_check IS NOT DISTINCT FROM NULL) THEN RAISE EXCEPTION 'V014290_CONCURRENT_POLICY_DRIFT:user_tool_passes/read own tool passes'; END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='checkout_intents' AND policyname='users read own checkout intents' AND cmd='SELECT' AND permissive='PERMISSIVE' AND roles='{authenticated}'::name[] AND qual IS NOT DISTINCT FROM '(auth.uid() = user_id)' AND with_check IS NOT DISTINCT FROM NULL) THEN RAISE EXCEPTION 'V014290_CONCURRENT_POLICY_DRIFT:checkout_intents/users read own checkout intents'; END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='replay_practice_sessions_v135' AND policyname='replay learner reads own practice' AND cmd='SELECT' AND permissive='PERMISSIVE' AND roles='{authenticated}'::name[] AND qual IS NOT DISTINCT FROM '(auth.uid() = user_id)' AND with_check IS NOT DISTINCT FROM NULL) THEN RAISE EXCEPTION 'V014290_CONCURRENT_POLICY_DRIFT:replay_practice_sessions_v135/replay learner reads own practice'; END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='commons_topics' AND policyname='members read commons topics' AND cmd='SELECT' AND permissive='PERMISSIVE' AND roles='{authenticated}'::name[] AND qual IS NOT DISTINCT FROM '(((status = ''published''::text) OR (author_user_id = auth.uid())) AND (EXISTS ( SELECT 1
   FROM commons_forums f
  WHERE (f.forum_code = commons_topics.forum_code))))' AND with_check IS NOT DISTINCT FROM NULL) THEN RAISE EXCEPTION 'V014290_CONCURRENT_POLICY_DRIFT:commons_topics/members read commons topics'; END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='commons_posts' AND policyname='members read commons posts' AND cmd='SELECT' AND permissive='PERMISSIVE' AND roles='{authenticated}'::name[] AND qual IS NOT DISTINCT FROM '(((status = ''published''::text) OR (author_user_id = auth.uid())) AND (EXISTS ( SELECT 1
   FROM commons_topics t
  WHERE (t.id = commons_posts.topic_id))))' AND with_check IS NOT DISTINCT FROM NULL) THEN RAISE EXCEPTION 'V014290_CONCURRENT_POLICY_DRIFT:commons_posts/members read commons posts'; END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='commons_bookmarks' AND policyname='users read own commons bookmarks' AND cmd='SELECT' AND permissive='PERMISSIVE' AND roles='{authenticated}'::name[] AND qual IS NOT DISTINCT FROM '((user_id = auth.uid()) AND (EXISTS ( SELECT 1
   FROM commons_topics t
  WHERE (t.id = commons_bookmarks.topic_id))))' AND with_check IS NOT DISTINCT FROM NULL) THEN RAISE EXCEPTION 'V014290_CONCURRENT_POLICY_DRIFT:commons_bookmarks/users read own commons bookmarks'; END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='commons_topic_subscriptions' AND policyname='users read own commons subscriptions' AND cmd='SELECT' AND permissive='PERMISSIVE' AND roles='{authenticated}'::name[] AND qual IS NOT DISTINCT FROM '((user_id = auth.uid()) AND (EXISTS ( SELECT 1
   FROM commons_topics t
  WHERE (t.id = commons_topic_subscriptions.topic_id))))' AND with_check IS NOT DISTINCT FROM NULL) THEN RAISE EXCEPTION 'V014290_CONCURRENT_POLICY_DRIFT:commons_topic_subscriptions/users read own commons subscriptions'; END IF;
END $guard$;
ALTER POLICY "read own decision journal" ON public."decision_journal" USING (((select auth.uid()) = user_id));
ALTER POLICY "update own unlocked forum topics" ON public."forum_topics" USING ((((select auth.uid()) = author_id) AND (is_locked = false) AND (status = 'published'::text))) WITH CHECK ((((select auth.uid()) = author_id) AND (status = 'published'::text)));
ALTER POLICY "update own forum posts" ON public."forum_posts" USING ((((select auth.uid()) = author_id) AND (status = 'published'::text))) WITH CHECK ((((select auth.uid()) = author_id) AND (status = 'published'::text)));
ALTER POLICY "insert own decision journal" ON public."decision_journal" WITH CHECK (((select auth.uid()) = user_id));
ALTER POLICY "update own decision journal" ON public."decision_journal" USING (((select auth.uid()) = user_id)) WITH CHECK (((select auth.uid()) = user_id));
ALTER POLICY "delete own decision journal" ON public."decision_journal" USING (((select auth.uid()) = user_id));
ALTER POLICY "read published forum topics" ON public."forum_topics" USING (((status = 'published'::text) AND ((lab_id IS NULL) OR (EXISTS ( SELECT 1
   FROM lab_attempts a
  WHERE ((a.user_id = (select auth.uid())) AND (a.lab_id = forum_topics.lab_id)))))));
ALTER POLICY "create own forum topics" ON public."forum_topics" WITH CHECK ((((select auth.uid()) = author_id) AND (status = 'published'::text) AND (EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = (select auth.uid())) AND (p.username IS NOT NULL)))) AND ((lab_id IS NULL) OR (EXISTS ( SELECT 1
   FROM lab_attempts a
  WHERE ((a.user_id = (select auth.uid())) AND (a.lab_id = forum_topics.lab_id)))))));
ALTER POLICY "read published forum posts" ON public."forum_posts" USING (((status = 'published'::text) AND (EXISTS ( SELECT 1
   FROM forum_topics t
  WHERE ((t.id = forum_posts.topic_id) AND (t.status = 'published'::text) AND ((t.lab_id IS NULL) OR (EXISTS ( SELECT 1
           FROM lab_attempts a
          WHERE ((a.user_id = (select auth.uid())) AND (a.lab_id = t.lab_id))))))))));
ALTER POLICY "create own forum posts" ON public."forum_posts" WITH CHECK ((((select auth.uid()) = author_id) AND (status = 'published'::text) AND (EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = (select auth.uid())) AND (p.username IS NOT NULL)))) AND (EXISTS ( SELECT 1
   FROM forum_topics t
  WHERE ((t.id = forum_posts.topic_id) AND (t.status = 'published'::text) AND (t.is_locked = false) AND ((t.lab_id IS NULL) OR (EXISTS ( SELECT 1
           FROM lab_attempts a
          WHERE ((a.user_id = (select auth.uid())) AND (a.lab_id = t.lab_id))))))))));
ALTER POLICY "read own plan snapshots" ON public."trade_plan_snapshots" USING (((select auth.uid()) = user_id));
ALTER POLICY "read own journal reviews" ON public."journal_reviews" USING (((select auth.uid()) = user_id));
ALTER POLICY "update own journal reviews" ON public."journal_reviews" USING (((select auth.uid()) = user_id)) WITH CHECK (((select auth.uid()) = user_id));
ALTER POLICY "read own site orders" ON public."site_orders" USING (((select auth.uid()) = user_id));
ALTER POLICY "read own site order items" ON public."site_order_items" USING ((EXISTS ( SELECT 1
   FROM site_orders o
  WHERE ((o.id = site_order_items.order_id) AND (o.user_id = (select auth.uid()))))));
ALTER POLICY "read own subscriptions" ON public."site_subscriptions" USING (((select auth.uid()) = user_id));
ALTER POLICY "read own tool passes" ON public."user_tool_passes" USING (((select auth.uid()) = user_id));
ALTER POLICY "users read own checkout intents" ON public."checkout_intents" USING (((select auth.uid()) = user_id));
ALTER POLICY "replay learner reads own practice" ON public."replay_practice_sessions_v135" USING (((select auth.uid()) = user_id));
ALTER POLICY "members read commons topics" ON public."commons_topics" USING ((((status = 'published'::text) OR (author_user_id = (select auth.uid()))) AND (EXISTS ( SELECT 1
   FROM commons_forums f
  WHERE (f.forum_code = commons_topics.forum_code)))));
ALTER POLICY "members read commons posts" ON public."commons_posts" USING ((((status = 'published'::text) OR (author_user_id = (select auth.uid()))) AND (EXISTS ( SELECT 1
   FROM commons_topics t
  WHERE (t.id = commons_posts.topic_id)))));
ALTER POLICY "users read own commons bookmarks" ON public."commons_bookmarks" USING (((user_id = (select auth.uid())) AND (EXISTS ( SELECT 1
   FROM commons_topics t
  WHERE (t.id = commons_bookmarks.topic_id)))));
ALTER POLICY "users read own commons subscriptions" ON public."commons_topic_subscriptions" USING (((user_id = (select auth.uid())) AND (EXISTS ( SELECT 1
   FROM commons_topics t
  WHERE (t.id = commons_topic_subscriptions.topic_id)))));
COMMIT;
