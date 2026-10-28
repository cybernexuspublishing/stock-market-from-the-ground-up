-- Owner correction: Restore Upcoming Releases and all individual authored book listings.
-- This does not create customer charges, fabricate purchase URLs, mark an
-- unpublished edition as published, change KDP settings or enable digital delivery.
-- Public membership visibility remains Free and Founder 14/30/60 only.
BEGIN;
UPDATE public.catalog_products
SET store_visible=true,sales_status='selling',updated_at=now()
WHERE product_type='book'
  AND product_code IN ('FOUNDATION_BOOK_1','FOUNDATION_BOOK_2','FOUNDATION_BOOK_3','DAY_TRADING_BOOK_1','READING_THE_TAPE')
  AND (store_visible IS DISTINCT FROM true OR sales_status IS DISTINCT FROM 'selling');
UPDATE public.gu_storefront_items_v014174
SET visible=true,status='listed',updated_at=now(),version=version+1
WHERE category='book'
  AND sku IN ('book:FOUNDATION_BOOK_1','book:FOUNDATION_BOOK_2','book:FOUNDATION_BOOK_3',
     'book:DAY_TRADING_BOOK_1','book:READING_THE_TAPE')
  AND (visible IS DISTINCT FROM true OR status IS DISTINCT FROM 'listed');
-- Only the canonical series preview; keep the obsolete duplicate bundle hidden.
UPDATE public.gu_storefront_items_v014174
SET visible=true,updated_at=now(),version=version+1
WHERE sku='book:FOUNDATIONS_COMPLETE_SERIES' AND visible IS DISTINCT FROM true;
-- Upcoming Releases is an informational catalogue. The previously hidden,
-- unaccepted Boot Camps, features and future tools may be explored, not bought.
UPDATE public.gu_storefront_items_v014174
SET visible=true,updated_at=now(),version=version+1
WHERE category IN ('bootcamp','feature','tool')
  AND status IN ('coming_soon','in_development','ready_for_review')
  AND sale_ready=false AND visible IS DISTINCT FROM true;
-- Obsolete Sparks package catalogues and the duplicate Foundations bundle
-- remain hidden until an approved offer and fulfillment record exists.
UPDATE public.gu_storefront_items_v014174
SET visible=false,updated_at=now(),version=version+1
WHERE (sku='book:FOUNDATIONS_COMPLETE_BUNDLE'
 OR (category='addon' AND sku IN ('addon:SPARKS_10','addon:SPARKS_30','addon:SPARKS_75')))
 AND visible IS DISTINCT FROM false;
-- Keep purchases gated by channels: all five current book listings have
-- no independently verified direct-delivery assets or order handlers.
-- Do NOT set website_checkout_enabled or sale_ready without a purchasable channel.
INSERT INTO public.admin_audit_log(actor_user_id,action,target_type,target_id,details)
SELECT (SELECT user_id FROM public.admin_user_roles WHERE role_code='OWNER'
 AND (expires_at IS NULL OR expires_at>now()) ORDER BY granted_at LIMIT 1),
 'commerce.owner_republish_books_and_upcoming_20261028','catalog','BOOKS_AND_UPCOMING',
 jsonb_build_object('owner_directive','show_all_authored_books_and_upcoming',
 'book_catalog_visible',true,'upcoming_visible',true,'retailer_links','owner-supplied-where-available',
 'no_unverified_book_charge',true,'unreleased_items_not_for_sale',true);
COMMIT;