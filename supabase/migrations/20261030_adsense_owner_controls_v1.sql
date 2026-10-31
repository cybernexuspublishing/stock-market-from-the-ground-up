create table if not exists public.gu_adsense_controls_v1 (
 singleton boolean primary key default true check (singleton),
 publisher_id text not null default 'ca-pub-6531971840615114' check (publisher_id='ca-pub-6531971840615114'),
 approved boolean not null default false,
 enabled boolean not null default false,
 pages jsonb not null default '{"/index.html":false,"/knowledge-database.html":false,"/store.html":false,"/advertise.html":false}'::jsonb,
 updated_at timestamptz not null default now(),
 check (enabled=false or approved=true)
);
insert into public.gu_adsense_controls_v1(singleton) values(true) on conflict do nothing;
alter table public.gu_adsense_controls_v1 enable row level security;
revoke all on public.gu_adsense_controls_v1 from anon,authenticated,public;
grant select,update on public.gu_adsense_controls_v1 to service_role;