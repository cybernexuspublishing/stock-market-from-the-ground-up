-- v0.14.0.30 AFTER reviewed staging migration; read-only verification.
BEGIN TRANSACTION READ ONLY;
WITH checks(label,pass) AS (VALUES
 ('digital_table_installed',to_regclass('public.gu_digital_books_v01430') IS NOT NULL),
 ('private_bucket_installed',EXISTS(SELECT 1 FROM storage.buckets WHERE id='gu-digital-ebooks' AND public=false)),
 ('owner_read_installed',to_regprocedure('public.gu_owner_digital_books_get_v01430()') IS NOT NULL),
 ('owner_save_installed',to_regprocedure('public.gu_owner_digital_books_save_v01430(text,boolean,timestamp with time zone,boolean,boolean,boolean,text,timestamp with time zone)') IS NOT NULL),
 ('offer_guard_installed',to_regprocedure('public.gu_digital_offer_status_v01430(text)') IS NOT NULL),
 ('owned_purchase_checker_installed',to_regprocedure('public.gu_digital_paid_owned_v01430(text,uuid)') IS NOT NULL),
 ('download_checker_installed',to_regprocedure('public.gu_digital_book_can_download_v01430(text)') IS NOT NULL),
 ('member_library_rpc_installed',to_regprocedure('public.gu_my_digital_books_v01430()') IS NOT NULL),
 ('anon_cannot_read_private_metadata', NOT COALESCE(has_table_privilege('anon','public.gu_digital_books_v01430','SELECT'),false)),
 ('member_cannot_read_private_metadata', NOT COALESCE(has_table_privilege('authenticated','public.gu_digital_books_v01430','SELECT'),false)),
 ('anon_owner_save_denied', NOT COALESCE(has_function_privilege('anon',to_regprocedure('public.gu_owner_digital_books_save_v01430(text,boolean,timestamp with time zone,boolean,boolean,boolean,text,timestamp with time zone)'), 'EXECUTE'),false)),
 ('private_title_rls',coalesce((SELECT relrowsecurity FROM pg_class WHERE oid=to_regclass('public.gu_digital_books_v01430')),false)),
 ('upload_owner_policy_installed',EXISTS(SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='gu_v01430_owner_digital_upload')),
 ('no_title_direct_update_anon',NOT COALESCE(has_table_privilege('anon','public.gu_digital_books_v01430','UPDATE'),false)),
 ('no_title_direct_update_member',NOT COALESCE(has_table_privilege('authenticated','public.gu_digital_books_v01430','UPDATE'),false))
)
SELECT label,pass FROM checks ORDER BY label;
-- See actual policies; verify other storage policies do not inadvertently allow
-- general READ of this private bucket. No user content is selected.
SELECT policyname,cmd,roles,qual,with_check FROM pg_policies
WHERE schemaname='storage' AND tablename='objects' ORDER BY policyname;
ROLLBACK;
