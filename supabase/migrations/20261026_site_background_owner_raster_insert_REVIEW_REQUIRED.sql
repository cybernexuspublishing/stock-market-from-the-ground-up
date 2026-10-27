-- Project: The Stock Market: From the Ground Up
-- Migration: GU-STORE-BACKGROUND-OWNER-UPLOAD-20261026-V1
-- File: supabase/migrations/20261026_site_background_owner_raster_insert_REVIEW_REQUIRED.sql
-- Version 1.0 | Status: REVIEW REQUIRED; NOT INSTALLED BY GITHUB
-- Purpose: Permit Owner-only global background upload into the existing public
-- gu-store-photos bucket. No checkout, entitlements, plans or book rights change.
-- Dependency: gu_store_owner_v014297(); gu-store-photos bucket and existing RLS.
BEGIN;
DO $pre$ BEGIN
 IF to_regprocedure('public.gu_store_owner_v014297()') IS NULL THEN
  RAISE EXCEPTION 'OWNER_MEDIA_PERMISSION_REQUIRED';
 END IF;
 IF NOT EXISTS(SELECT 1 FROM storage.buckets b WHERE b.id='gu-store-photos'
   AND b.public=true AND b.file_size_limit<=5242880) THEN
  RAISE EXCEPTION 'PUBLIC_RASTER_BUCKET_NOT_CONFIGURED';
 END IF;
END $pre$;
-- Additional restricted INSERT policy is intentionally narrow. This corrects
-- ambiguous backslash escaping in the previous generic product-photo policy:
-- [.] matches a literal period with no dependence on SQL escape settings.
DROP POLICY IF EXISTS gu_site_background_owner_insert_v1 ON storage.objects;
CREATE POLICY gu_site_background_owner_insert_v1 ON storage.objects
 FOR INSERT TO authenticated
 WITH CHECK(
  bucket_id='gu-store-photos'
  AND public.gu_store_owner_v014297()
  AND split_part(name,'/',1)=auth.uid()::text
  AND name ~ '^[a-f0-9-]{36}/SITE_BACKGROUND/[a-z0-9_-]{10,60}[.](jpg|jpeg|png|webp)$'
 );
COMMIT;
