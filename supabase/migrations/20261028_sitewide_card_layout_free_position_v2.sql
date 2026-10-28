-- Crownlight Layout Studio V2: presentation-only drag offsets.
-- No role/entitlement/payment changes; all writes stay in the existing role-gated Pages Function.
BEGIN;
ALTER TABLE public.gu_site_card_layout_v1
 ADD COLUMN IF NOT EXISTS offset_x_px integer,
 ADD COLUMN IF NOT EXISTS offset_y_px integer;
DO $$
BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.gu_site_card_layout_v1'::regclass AND conname='gu_site_card_layout_v1_offset_x_px_check') THEN
  ALTER TABLE public.gu_site_card_layout_v1
   ADD CONSTRAINT gu_site_card_layout_v1_offset_x_px_check
   CHECK (offset_x_px IS NULL OR offset_x_px BETWEEN -280 AND 280);
 END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.gu_site_card_layout_v1'::regclass AND conname='gu_site_card_layout_v1_offset_y_px_check') THEN
  ALTER TABLE public.gu_site_card_layout_v1
   ADD CONSTRAINT gu_site_card_layout_v1_offset_y_px_check
   CHECK (offset_y_px IS NULL OR offset_y_px BETWEEN -280 AND 280);
 END IF;
END $$;
COMMIT;
