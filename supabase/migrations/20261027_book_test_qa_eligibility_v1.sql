-- QA eligibility uses immutable Owner-selected UUID allowlist, never editable usernames.
BEGIN;
CREATE OR REPLACE FUNCTION public.gu_book_test_eligible_v1()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $fn$
 SELECT jsonb_build_object('eligible',EXISTS(
 SELECT 1 FROM public.gu_book_test_qa_v1 q JOIN public.profiles p ON p.id=q.user_id
 LEFT JOIN public.admin_user_flags f ON f.user_id=q.user_id
 WHERE q.user_id=auth.uid() AND q.enabled AND p.account_kind='member'
 AND p.deleted_at IS NULL AND coalesce(f.status,'active')='active'
 ));
$fn$;
REVOKE ALL ON FUNCTION public.gu_book_test_eligible_v1() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.gu_book_test_eligible_v1() TO authenticated,service_role;
COMMIT;