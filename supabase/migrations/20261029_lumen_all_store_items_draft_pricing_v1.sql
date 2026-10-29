-- One catalog-wide, draft-only Lumen cost registry, without creating
-- additional products or activating billing. Each store item has one record.
BEGIN;
CREATE TABLE IF NOT EXISTS public.gu_lumen_item_prices_v1(
 sku text PRIMARY KEY REFERENCES public.gu_storefront_items_v014174(sku) ON DELETE CASCADE,
 custom_full_lumens integer CHECK(custom_full_lumens BETWEEN 1 AND 10000000),
 partial_discount_allowed boolean NOT NULL DEFAULT true,
 full_redemption_allowed boolean NOT NULL DEFAULT true,
 release_state text NOT NULL DEFAULT 'draft' CHECK(release_state IN ('draft','review_required','retired')),
 version integer NOT NULL DEFAULT 1 CHECK(version>0),
 updated_by uuid,
 updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.gu_lumen_item_prices_v1 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.gu_lumen_item_prices_v1 FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE ON public.gu_lumen_item_prices_v1 TO service_role;
CREATE TABLE IF NOT EXISTS public.gu_lumen_item_prices_history_v1(
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 sku text NOT NULL,
 before jsonb NOT NULL,
 after jsonb NOT NULL,
 changed_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.gu_lumen_item_prices_history_v1 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.gu_lumen_item_prices_history_v1 FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT ON public.gu_lumen_item_prices_history_v1 TO service_role;
CREATE OR REPLACE FUNCTION public.gu_lumen_item_prices_audit_v1()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path='pg_catalog','pg_temp'
AS $fn$ BEGIN
 INSERT INTO public.gu_lumen_item_prices_history_v1(sku,before,after)
 VALUES(NEW.sku,to_jsonb(OLD),to_jsonb(NEW)); RETURN NEW;
END $fn$;
DROP TRIGGER IF EXISTS gu_lumen_item_prices_audit_v1 ON public.gu_lumen_item_prices_v1;
CREATE TRIGGER gu_lumen_item_prices_audit_v1
 AFTER UPDATE ON public.gu_lumen_item_prices_v1 FOR EACH ROW
 EXECUTE FUNCTION public.gu_lumen_item_prices_audit_v1();
REVOKE ALL ON FUNCTION public.gu_lumen_item_prices_audit_v1() FROM PUBLIC,anon,authenticated;
INSERT INTO public.gu_lumen_item_prices_v1(sku)
SELECT sku FROM public.gu_storefront_items_v014174
ON CONFLICT(sku) DO NOTHING;
-- A 100%-Lumen purchase can eventually use custom_full_lumens,
-- but this column does not authorize a wallet debit or fulfillment.
COMMIT;