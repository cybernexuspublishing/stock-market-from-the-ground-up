-- Single-use service-role QA account orchestration; no public/admin actor impersonation.
-- Task authorised by owner in conversation 2026-10-26; no LIVE commerce.
create extension if not exists pg_net;
create table if not exists public.qa_provision_once_20261026 (
 id uuid primary key default gen_random_uuid(),
 token_hash text not null check (token_hash ~ '^[0-9a-f]{64}$'),
 status text not null default 'pending' check (status in ('pending','running','complete','failed')),
 created_at timestamptz not null default now(),
 consumed_at timestamptz,
 completed_at timestamptz,
 summary jsonb not null default '{}'::jsonb
);
alter table public.qa_provision_once_20261026 enable row level security;
revoke all on public.qa_provision_once_20261026 from PUBLIC, anon, authenticated;
grant select, update on public.qa_provision_once_20261026 to service_role;
comment on table public.qa_provision_once_20261026 is 'One-time noncommercial QA provisioning control; no email, DOB, credential or JWT values stored.';
