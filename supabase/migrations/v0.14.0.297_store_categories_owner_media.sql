-- Owner-authored categories for the one existing catalog_products.family field.
-- New product images: 5 MB raster-only public object bucket; no secrets, no LIVE charge.
BEGIN;
CREATE TABLE IF NOT EXISTS public.gu_store_categories_v014297 (
 slug text PRIMARY KEY CHECK (slug ~ '^[a-z0-9][a-z0-9-]{1,59}$'),
 name text NOT NULL CHECK (length(btrim(name)) BETWEEN 2 AND 90),
 sort_order int NOT NULL DEFAULT 100,
 active boolean NOT NULL DEFAULT true,
 revision integer NOT NULL DEFAULT 1 CHECK (revision>0),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO public.gu_store_categories_v014297(slug,name,sort_order)
SELECT DISTINCT trim(both '-' from regexp_replace(lower(family),'[^a-z0-9]+','-','g')),
 initcap(replace(family,'_',' ')), min(sort_order)
FROM public.catalog_products
WHERE family IS NOT NULL AND family<>'' AND length(family)>1
GROUP BY family
ON CONFLICT (slug) DO NOTHING;
CREATE OR REPLACE FUNCTION public.gu_store_owner_v014297()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
 SELECT auth.uid() IS NOT NULL AND EXISTS (
  SELECT 1 FROM public.profiles p WHERE p.id=auth.uid() AND p.account_kind='member')
  AND EXISTS (
   SELECT 1 FROM public.admin_user_roles r WHERE r.user_id=auth.uid()
    AND r.role_code='OWNER' AND (r.expires_at IS NULL OR r.expires_at>now()))
  AND NOT EXISTS (
   SELECT 1 FROM public.admin_user_flags f WHERE f.user_id=auth.uid()
   AND lower(f.status) IN ('restricted','suspended'))
$$;
REVOKE ALL ON FUNCTION public.gu_store_owner_v014297() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.gu_store_owner_v014297() TO authenticated,service_role;
ALTER TABLE public.gu_store_categories_v014297 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.gu_store_categories_v014297 FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.gu_store_categories_v014297 TO anon,authenticated,service_role;
GRANT INSERT,UPDATE,DELETE ON public.gu_store_categories_v014297 TO authenticated,service_role;
CREATE POLICY gu_store_category_public_read_v014297 ON public.gu_store_categories_v014297
 FOR SELECT TO anon,authenticated USING (active=true OR public.gu_store_owner_v014297());
CREATE POLICY gu_store_category_owner_insert_v014297 ON public.gu_store_categories_v014297
 FOR INSERT TO authenticated WITH CHECK(public.gu_store_owner_v014297());
CREATE POLICY gu_store_category_owner_update_v014297 ON public.gu_store_categories_v014297
 FOR UPDATE TO authenticated USING(public.gu_store_owner_v014297())
 WITH CHECK(public.gu_store_owner_v014297());
CREATE POLICY gu_store_category_owner_delete_v014297 ON public.gu_store_categories_v014297
 FOR DELETE TO authenticated USING(public.gu_store_owner_v014297());
-- Owner uploads are restricted to raster photos in their own namespace.
INSERT INTO storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
VALUES('gu-store-photos','gu-store-photos',true,5242880,
 ARRAY['image/jpeg','image/png','image/webp']::text[])
ON CONFLICT(id) DO NOTHING;
DROP POLICY IF EXISTS gu_store_photos_owner_upload_v014297 ON storage.objects;
CREATE POLICY gu_store_photos_owner_upload_v014297 ON storage.objects
 FOR INSERT TO authenticated
 WITH CHECK(bucket_id='gu-store-photos'
  AND public.gu_store_owner_v014297()
  AND split_part(name,'/',1)=auth.uid()::text
  AND name ~ '^[a-f0-9-]{36}/[A-Z0-9_]{3,64}/[a-z0-9_-]{10,60}\\.(jpg|jpeg|png|webp)$');
DROP POLICY IF EXISTS gu_store_photos_owner_update_v014297 ON storage.objects;
CREATE POLICY gu_store_photos_owner_update_v014297 ON storage.objects
 FOR UPDATE TO authenticated USING(bucket_id='gu-store-photos' AND public.gu_store_owner_v014297()
  AND split_part(name,'/',1)=auth.uid()::text)
 WITH CHECK(bucket_id='gu-store-photos' AND public.gu_store_owner_v014297()
  AND split_part(name,'/',1)=auth.uid()::text);
DROP POLICY IF EXISTS gu_store_photos_owner_delete_v014297 ON storage.objects;
CREATE POLICY gu_store_photos_owner_delete_v014297 ON storage.objects
 FOR DELETE TO authenticated USING(bucket_id='gu-store-photos' AND public.gu_store_owner_v014297()
  AND split_part(name,'/',1)=auth.uid()::text);
COMMIT;