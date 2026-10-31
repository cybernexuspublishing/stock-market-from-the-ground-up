-- Isolated Stripe TEST sponsorship webhook acceptance journal.
-- No LIVE campaign link, credit, or display side effects. Service role only.
create table if not exists public.gu_ad_sponsor_test_webhook_acceptance_v1 (
 event_id text primary key check (event_id ~ '^evt_[A-Za-z0-9_]{6,}$'),
 event_type text not null check (event_type in ('invoice.paid','charge.refunded','charge.dispute.created')),
 invoice_id text not null check (invoice_id ~ '^in_[A-Za-z0-9_]{6,}$'),
 payment_intent_id text check (payment_intent_id is null or payment_intent_id ~ '^pi_[A-Za-z0-9_]{6,}$'),
 charge_id text check (charge_id is null or charge_id ~ '^ch_[A-Za-z0-9_]{6,}$'),
 invoice_total_cents integer not null check (invoice_total_cents = 100),
 amount_refunded_cents integer not null default 0 check (amount_refunded_cents between 0 and 100),
 source text not null default 'stripe_test_signed' check (source='stripe_test_signed'),
 signature_checked boolean not null check (signature_checked = true),
 stripe_provider_checked boolean not null check (stripe_provider_checked = true),
 received_at timestamptz not null default now()
);
create index if not exists gu_ad_sponsor_test_webhook_by_invoice_v1
 on public.gu_ad_sponsor_test_webhook_acceptance_v1(invoice_id, received_at desc);
alter table public.gu_ad_sponsor_test_webhook_acceptance_v1 enable row level security;
revoke all on public.gu_ad_sponsor_test_webhook_acceptance_v1 from public,anon,authenticated;
grant select,insert on public.gu_ad_sponsor_test_webhook_acceptance_v1 to service_role;
