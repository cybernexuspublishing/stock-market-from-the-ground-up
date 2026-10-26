-- v0.14.0.290_supabase_member_rls_initplan_v2 rollback. Restores original policy expressions; no member data touched.
BEGIN;
SET LOCAL lock_timeout='3s'; SET LOCAL statement_timeout='30s';
ALTER POLICY "read own decision journal" ON public."decision_journal" USING ((auth.uid() = user_id));
ALTER POLICY "update own unlocked forum topics" ON public."forum_topics" USING (((auth.uid() = author_id) AND (is_locked = false) AND (status = 'published'::text))) WITH CHECK (((auth.uid() = author_id) AND (status = 'published'::text)));
ALTER POLICY "update own forum posts" ON public."forum_posts" USING (((auth.uid() = author_id) AND (status = 'published'::text))) WITH CHECK (((auth.uid() = author_id) AND (status = 'published'::text)));
ALTER POLICY "insert own decision journal" ON public."decision_journal" WITH CHECK ((auth.uid() = user_id));
ALTER POLICY "update own decision journal" ON public."decision_journal" USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));
ALTER POLICY "delete own decision journal" ON public."decision_journal" USING ((auth.uid() = user_id));
ALTER POLICY "read published forum topics" ON public."forum_topics" USING (((status = 'published'::text) AND ((lab_id IS NULL) OR (EXISTS ( SELECT 1
   FROM lab_attempts a
  WHERE ((a.user_id = auth.uid()) AND (a.lab_id = forum_topics.lab_id)))))));
ALTER POLICY "create own forum topics" ON public."forum_topics" WITH CHECK (((auth.uid() = author_id) AND (status = 'published'::text) AND (EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.username IS NOT NULL)))) AND ((lab_id IS NULL) OR (EXISTS ( SELECT 1
   FROM lab_attempts a
  WHERE ((a.user_id = auth.uid()) AND (a.lab_id = forum_topics.lab_id)))))));
ALTER POLICY "read published forum posts" ON public."forum_posts" USING (((status = 'published'::text) AND (EXISTS ( SELECT 1
   FROM forum_topics t
  WHERE ((t.id = forum_posts.topic_id) AND (t.status = 'published'::text) AND ((t.lab_id IS NULL) OR (EXISTS ( SELECT 1
           FROM lab_attempts a
          WHERE ((a.user_id = auth.uid()) AND (a.lab_id = t.lab_id))))))))));
ALTER POLICY "create own forum posts" ON public."forum_posts" WITH CHECK (((auth.uid() = author_id) AND (status = 'published'::text) AND (EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.username IS NOT NULL)))) AND (EXISTS ( SELECT 1
   FROM forum_topics t
  WHERE ((t.id = forum_posts.topic_id) AND (t.status = 'published'::text) AND (t.is_locked = false) AND ((t.lab_id IS NULL) OR (EXISTS ( SELECT 1
           FROM lab_attempts a
          WHERE ((a.user_id = auth.uid()) AND (a.lab_id = t.lab_id))))))))));
ALTER POLICY "read own plan snapshots" ON public."trade_plan_snapshots" USING ((auth.uid() = user_id));
ALTER POLICY "read own journal reviews" ON public."journal_reviews" USING ((auth.uid() = user_id));
ALTER POLICY "update own journal reviews" ON public."journal_reviews" USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));
ALTER POLICY "read own site orders" ON public."site_orders" USING ((auth.uid() = user_id));
ALTER POLICY "read own site order items" ON public."site_order_items" USING ((EXISTS ( SELECT 1
   FROM site_orders o
  WHERE ((o.id = site_order_items.order_id) AND (o.user_id = auth.uid())))));
ALTER POLICY "read own subscriptions" ON public."site_subscriptions" USING ((auth.uid() = user_id));
ALTER POLICY "read own tool passes" ON public."user_tool_passes" USING ((auth.uid() = user_id));
ALTER POLICY "users read own checkout intents" ON public."checkout_intents" USING ((auth.uid() = user_id));
ALTER POLICY "replay learner reads own practice" ON public."replay_practice_sessions_v135" USING ((auth.uid() = user_id));
ALTER POLICY "members read commons topics" ON public."commons_topics" USING ((((status = 'published'::text) OR (author_user_id = auth.uid())) AND (EXISTS ( SELECT 1
   FROM commons_forums f
  WHERE (f.forum_code = commons_topics.forum_code)))));
ALTER POLICY "members read commons posts" ON public."commons_posts" USING ((((status = 'published'::text) OR (author_user_id = auth.uid())) AND (EXISTS ( SELECT 1
   FROM commons_topics t
  WHERE (t.id = commons_posts.topic_id)))));
ALTER POLICY "users read own commons bookmarks" ON public."commons_bookmarks" USING (((user_id = auth.uid()) AND (EXISTS ( SELECT 1
   FROM commons_topics t
  WHERE (t.id = commons_bookmarks.topic_id)))));
ALTER POLICY "users read own commons subscriptions" ON public."commons_topic_subscriptions" USING (((user_id = auth.uid()) AND (EXISTS ( SELECT 1
   FROM commons_topics t
  WHERE (t.id = commons_topic_subscriptions.topic_id)))));
COMMIT;
