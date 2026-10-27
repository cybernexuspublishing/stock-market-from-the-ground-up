ALTER TABLE public.gu_owner_zero_live_batches_v1
 ADD COLUMN IF NOT EXISTS signed_webhook_event_id text,
 ADD COLUMN IF NOT EXISTS signed_webhook_verified_at timestamptz;
CREATE UNIQUE INDEX IF NOT EXISTS gu_owner_zero_live_batch_event_unique_v1
 ON public.gu_owner_zero_live_batches_v1(signed_webhook_event_id)
 WHERE signed_webhook_event_id IS NOT NULL;