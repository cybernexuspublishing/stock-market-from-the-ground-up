-- v0.14.0.35 owner review. READ ONLY, one result table.
WITH chk(name,ok) AS (VALUES
('platform_plans',to_regclass('public.platform_plans') IS NOT NULL),
('user_plan_grants',to_regclass('public.user_plan_grants') IS NOT NULL),
('site_subscriptions',to_regclass('public.site_subscriptions') IS NOT NULL),
('catalog_products',to_regclass('public.catalog_products') IS NOT NULL),
('digital_rights',to_regclass('public.gu_digital_books_v01430') IS NOT NULL),
('profiles',to_regclass('public.profiles') IS NOT NULL),
('admin_flags',to_regclass('public.admin_user_flags') IS NOT NULL),
('admin_roles',to_regclass('public.admin_user_roles') IS NOT NULL),
('private_storage',to_regclass('storage.objects') IS NOT NULL),
('paid_order_validator',to_regprocedure('public.gu_digital_paid_owned_v01430(text,uuid)') IS NOT NULL),
('download_validator',to_regprocedure('public.gu_digital_book_can_download_v01430(text)') IS NOT NULL),
('library_reader',to_regprocedure('public.gu_my_digital_books_v01430()') IS NOT NULL),
('plan_records', (SELECT count(*)=4 FROM public.platform_plans WHERE plan_code IN
 ('FULL_MONTHLY','FULL_ANNUAL','LIFETIME','PICK_WHAT_YOU_WANT'))),
('canonical_books',(SELECT count(*)=5 FROM public.catalog_products WHERE product_type='book'
 AND product_code IN ('FOUNDATION_BOOK_1','FOUNDATION_BOOK_2','FOUNDATION_BOOK_3',
 'DAY_TRADING_BOOK_1','READING_THE_TAPE')))
)
SELECT name,ok FROM chk ORDER BY name;
