-- v128 disposable PostgreSQL 16 fixture ONLY. NEVER run in Supabase.
-- Seed states the v123 function previously stranded before the v128 migration.
\set ON_ERROR_STOP on
INSERT INTO public.gu_billing_notice_outbox_v014123
(dedup_key,user_id,source_kind,provider_subscription_id,notice_kind,
 delivery_status,attempts,next_attempt_at,lease_token,lease_expires_at)
VALUES
 ('v128-expired-attempt-12','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  'plan','sub_MOCK123','payment_failed','leased',12,now()-interval '1 day',
  '11111111-1111-4111-8111-111111111111',now()-interval '10 minutes'),
 ('v128-due-retry-attempt-12','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  'plan','sub_MOCK123','payment_failed','retry',12,now()-interval '10 minutes',NULL,NULL),
 ('v128-not-expired-attempt-12','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  'plan','sub_MOCK123','payment_failed','leased',12,now()-interval '10 minutes',
  '22222222-2222-4222-8222-222222222222',now()+interval '10 minutes'),
 ('v128-ready-attempt-0','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  'plan','sub_MOCK123','payment_failed','pending',0,now()-interval '10 minutes',NULL,NULL);
