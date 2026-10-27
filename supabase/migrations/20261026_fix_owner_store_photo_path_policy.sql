-- Stock Market From the Ground Up / Store product photographs
-- Migration v1.0 / 2026-10-26
-- Repair incorrect backslash escaping in the existing Owner photo INSERT RLS.
-- No edits to digital book storage, checkout, customer orders or entitlements.
BEGIN;
DO $pre$ BEGIN
 IF to_regprocedure('public.gu_store_owner_v014297()') IS NULL
 OR NOT EXISTS(SELECT 1 FROM storage.buckets WHERE id='gu-store-photos'
    AND public=true AND file_size_limit=5242880)
 THEN RAISE EXCEPTION 'OWNER_STORE_PHOTOS_PREREQUISITES_MISSING';
 END IF;
END $pre$;

DROP POLICY IF EXISTS gu_store_photos_owner_upload_v014297 ON storage.objects;
CREATE POLICY gu_store_photos_owner_upload_v014297 ON storage.objects
 FOR INSERT TO authenticated
 WITH CHECK (
   bucket_id='gu-store-photos'
   AND public.gu_store_owner_v014297()
   AND split_part(name,'/',1)=auth.uid()::text
   AND name ~ '^[a-f0-9-]{36}/[A-Z0-9_]{3,64}/[a-z0-9_-]{10,60}[.](jpg|jpeg|png|webp)$'
 );
COMMIT;
