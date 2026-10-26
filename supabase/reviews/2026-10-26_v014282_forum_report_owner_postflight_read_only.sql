-- v0.14.0.282 | Read-only postflight, omits personal data.
BEGIN READ ONLY;
SELECT count(*) AS conflicting_reporter_identities
 FROM public.forum_reports WHERE reporter_id IS NOT NULL
   AND reporter_user_id IS NOT NULL AND reporter_id<>reporter_user_id;
SELECT conname,pg_get_constraintdef(oid) AS expression
 FROM pg_constraint WHERE conrelid='public.forum_reports'::regclass
   AND conname='forum_reports_reporter_identity_consistency_v014282';
SELECT policyname,permissive,cmd,roles,qual FROM pg_policies
 WHERE schemaname='public' AND tablename='forum_reports'
 ORDER BY policyname;
SELECT has_table_privilege('anon','public.forum_reports','SELECT') AS anon_can_read,
 has_table_privilege('authenticated','public.forum_reports','SELECT') AS member_can_read,
 has_table_privilege('authenticated','public.forum_reports','INSERT') AS member_can_insert,
 has_table_privilege('authenticated','public.forum_reports','UPDATE') AS member_can_update;
COMMIT;
