-- Cyber Nexus | v0.14.0.81 | OWNER REVIEW REQUIRED
-- Existing Supabase production database ONLY. Run ONCE if the Owner confirms
-- the five currently listed book records are approved for sale preparations.
-- ONLY mark catalog SALE readiness; NEVER activate a payment path.
-- KDP/KDP Select, ISBNs, Amazon URLs, manuscripts, publication badges,
-- author/title/description, prices, refunds and physical checkout all unchanged.
BEGIN;
DO $verify$
DECLARE matching integer;
BEGIN
 IF to_regclass('public.catalog_products') IS NULL THEN
  RAISE EXCEPTION 'EXISTING_BOOK_CATALOG_MISSING';
 END IF;
 SELECT COUNT(*) INTO matching
 FROM public.catalog_products WHERE product_type='book' AND product_code IN
 ('FOUNDATION_BOOK_1','FOUNDATION_BOOK_2','FOUNDATION_BOOK_3',
  'DAY_TRADING_BOOK_1','READING_THE_TAPE');
 IF matching<>5 THEN
  RAISE EXCEPTION 'BOOK_CATALOG_MISMATCH: expected five distinct pre-existing book rows; got %', matching;
 END IF;
END $verify$;
-- This is a catalog-preparation status, NOT a published eBook payment offer.
-- All payment controls stay unchanged. Book content and KDP are Owner-managed.
UPDATE public.catalog_products
 SET store_visible=true,sales_status='published'
 WHERE product_type='book' AND product_code IN
 ('FOUNDATION_BOOK_1','FOUNDATION_BOOK_2','FOUNDATION_BOOK_3',
  'DAY_TRADING_BOOK_1','READING_THE_TAPE');
-- Read back the non-sensitive flags. The owner will manually edit the
-- independent KDP fields / prices / product approvals when ready.
SELECT product_code,title,publication_status,sales_status,store_visible,
       website_checkout_enabled,direct_digital_enabled,
       direct_physical_enabled,kdp_select
FROM public.catalog_products
WHERE product_type='book' AND product_code IN
 ('FOUNDATION_BOOK_1','FOUNDATION_BOOK_2','FOUNDATION_BOOK_3',
  'DAY_TRADING_BOOK_1','READING_THE_TAPE')
ORDER BY product_code;
COMMIT;
