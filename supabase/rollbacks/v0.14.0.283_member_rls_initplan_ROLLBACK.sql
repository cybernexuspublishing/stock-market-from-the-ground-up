-- v0.14.0.283 rollback | restore pre-optimization RLS expressions.
-- Reverses only policy evaluation form, without dropping rows or policies.
BEGIN;
ALTER POLICY "read own profile" ON public."profiles" USING (auth.uid() = id);
ALTER POLICY "update own profile" ON public."profiles" USING (auth.uid() = id);
ALTER POLICY "insert own profile" ON public."profiles" WITH CHECK (auth.uid() = id);
ALTER POLICY "read own progress" ON public."lab_progress" USING (auth.uid() = user_id);
ALTER POLICY "insert own progress" ON public."lab_progress" WITH CHECK (auth.uid() = user_id);
ALTER POLICY "update own progress" ON public."lab_progress" USING (auth.uid() = user_id);
ALTER POLICY "delete own progress" ON public."lab_progress" USING (auth.uid() = user_id);
ALTER POLICY "read own lab attempts" ON public."lab_attempts" USING (auth.uid() = user_id);
ALTER POLICY "insert own lab attempts" ON public."lab_attempts" WITH CHECK (auth.uid() = user_id);
ALTER POLICY "members read own site lab progress" ON public."site_lab_progress" USING (user_id = auth.uid());
ALTER POLICY "members create own site lab progress" ON public."site_lab_progress" WITH CHECK (user_id = auth.uid());
ALTER POLICY "members update own site lab progress" ON public."site_lab_progress" USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
ALTER POLICY "members delete own site lab progress" ON public."site_lab_progress" USING (user_id = auth.uid());
ALTER POLICY "read own entitlements" ON public."entitlements" USING (auth.uid() = user_id);
ALTER POLICY "members read own competency evidence" ON public."competency_evidence" USING (auth.uid() = user_id);
ALTER POLICY "read own library" ON public."user_library" USING (auth.uid() = user_id);
ALTER POLICY "read own plan grants" ON public."user_plan_grants" USING (auth.uid() = user_id);
COMMIT;
