-- v0.14.0.282 | ROLLBACK | Forum report ownership coherence.
-- Restore previous policy names and drop only the newly added consistency constraint.
-- No forum report rows or member records are changed.
BEGIN;
DROP POLICY IF EXISTS "forum_reports_own_identity_v014282" ON public.forum_reports;
DROP POLICY IF EXISTS "read own forum reports" ON public.forum_reports;
DROP POLICY IF EXISTS "users read own reports" ON public.forum_reports;
CREATE POLICY "read own forum reports" ON public.forum_reports
 AS PERMISSIVE FOR SELECT TO authenticated USING (auth.uid() = reporter_id);
CREATE POLICY "users read own reports" ON public.forum_reports
 AS PERMISSIVE FOR SELECT TO authenticated USING (auth.uid() = reporter_user_id);
ALTER TABLE public.forum_reports
 DROP CONSTRAINT IF EXISTS forum_reports_reporter_identity_consistency_v014282;
COMMIT;
