-- v0.13.3 verification — run after v0.13.3_FRONTEND_FREEZE_LABS_COMMONS.sql

select 'site_version' as check_name, setting_key, value
from public.site_settings where setting_key in ('site.version','site.frontend_frozen')
order by setting_key;

select 'lab_counts' as check_name,
       count(*) filter (where lab_id ~ '^F1-C[0-9]{2}-L[0-9]{2}$') as foundation_1,
       count(*) filter (where lab_id ~ '^F2-C[0-9]{2}-L[0-9]{2}$') as foundation_2,
       count(*) filter (where lab_id ~ '^F3-C[0-9]{2}-L[0-9]{2}$') as foundation_3,
       count(*) filter (where lab_id ~ '^DT-C[0-9]{2}-L[0-9]{2}$') as day_trading,
       count(*) filter (where lab_id ~ '^TAPE-C[0-9]{2}-L[0-9]{2}$') as reading_the_tape,
       count(*) filter (where lab_id ~ '^SITE-[0-9]{3}$') as site_exclusive,
       count(*) as catalog_total
from public.platform_labs
where active=true and registry_visible=true
  and (lab_id ~ '^F[123]-C[0-9]{2}-L[0-9]{2}$'
       or lab_id ~ '^DT-C[0-9]{2}-L[0-9]{2}$'
       or lab_id ~ '^TAPE-C[0-9]{2}-L[0-9]{2}$'
       or lab_id ~ '^SITE-[0-9]{3}$');

select 'locked_foundations_ids' as check_name,
       count(*) as locked_foundation_count,
       count(*) filter (where public_sample) as public_samples
from public.platform_labs
where lab_id ~ '^F[123]-C[0-9]{2}-L[0-9]{2}$';

select 'supplemental_patterns' as check_name,
       count(*) filter (where lab_id ~ '^DT-C[0-9]{2}-L[0-9]{2}$') as day_trading,
       count(*) filter (where lab_id ~ '^TAPE-C[0-9]{2}-L[0-9]{2}$') as tape,
       count(*) filter (where lab_id ~ '^SITE-[0-9]{3}$') as site_exclusive
from public.platform_labs;

select 'commons_guides' as check_name,
       count(*) as guide_count,
       count(*) filter (where is_pinned) as pinned,
       count(*) filter (where is_official) as official
from public.commons_topics
where legacy_source_code like 'V0133_%' and status='published';

select 'cover_images' as check_name,product_code,short_title,cover_image_url,publication_status,kdp_select,direct_digital_enabled
from public.catalog_products
where product_code in ('FOUNDATION_BOOK_1','FOUNDATION_BOOK_2','FOUNDATION_BOOK_3','DAY_TRADING_BOOK_1','READING_THE_TAPE')
order by sort_order,product_code;

select 'commons_nav' as check_name,item_code,label,href,active,public_visible
from public.site_navigation_items where item_code='TOP_COMMONS';

select 'lab_progress_table' as check_name,to_regclass('public.site_lab_progress') as relation_name;

select 'acceptance_console' as check_name,count(*) as item_count
from public.qa_acceptance_items
where item_code in ('AUTH','HOME','DASHBOARD','SETTINGS','MEMBERSHIP','BOOKS','STORE','CHECKOUT','COMMONS','LABS','JOURNAL','SIMULATOR','TUTOR','DOCS','SUPPORT','NOTIFICATIONS','ADVERTISING','POLICIES','ADMIN','TEST_ACCOUNTS','MOBILE','ACCESSIBILITY','ERROR_STATES');
