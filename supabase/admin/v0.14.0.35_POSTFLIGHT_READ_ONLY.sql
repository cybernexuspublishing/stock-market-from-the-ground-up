-- v0.14.0.35 owner review. READ ONLY, one result table, no user IDs or secrets.
WITH chk(name,ok) AS (VALUES
('full_monthly_book_companions',
 (SELECT includes_all_books FROM public.platform_plans WHERE plan_code='FULL_MONTHLY')),
('full_annual_book_companions',
 (SELECT includes_all_books FROM public.platform_plans WHERE plan_code='FULL_ANNUAL')),
('pick_visible_no_checkout',
 (SELECT public_visible AND NOT checkout_enabled AND NOT includes_all_tools AND NOT includes_all_books
  FROM public.platform_plans WHERE plan_code='PICK_WHAT_YOU_WANT')),
('lifetime_download_rights_function_installed',
 to_regprocedure('public.gu_lifetime_ebook_eligible_v01435(uuid,text)') IS NOT NULL),
('private_metadata_no_member_select',
 NOT coalesce(has_table_privilege('authenticated','public.gu_digital_books_v01430','SELECT'),false)),
('private_metadata_no_anon_select',
 NOT coalesce(has_table_privilege('anon','public.gu_digital_books_v01430','SELECT'),false)),
('lifetime_function_not_direct_member_callable',
 NOT coalesce(has_function_privilege('authenticated',to_regprocedure('public.gu_lifetime_ebook_eligible_v01435(uuid,text)'),'EXECUTE'),false)),
('lifetime_function_not_direct_anon_callable',
 NOT coalesce(has_function_privilege('anon',to_regprocedure('public.gu_lifetime_ebook_eligible_v01435(uuid,text)'),'EXECUTE'),false)),
('download_function_installed',
 to_regprocedure('public.gu_digital_book_can_download_v01430(text)') IS NOT NULL),
('my_books_function_installed',
 to_regprocedure('public.gu_my_digital_books_v01430()') IS NOT NULL),
('books_still_with_direct_digital_off_if_in_select',
 NOT EXISTS(SELECT 1 FROM public.catalog_products p WHERE p.kdp_select AND p.direct_digital_enabled))
)
SELECT name,coalesce(ok,false) AS passed FROM chk ORDER BY name;
