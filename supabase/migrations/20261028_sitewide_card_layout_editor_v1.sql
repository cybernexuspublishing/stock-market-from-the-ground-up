-- Sitewide Layout Editor v1: public presentation overrides, SERVER-ONLY mutations.
-- Grants no entitlement, billing, content or user profile privileges.
begin;
create table if not exists public.gu_site_card_layout_v1(
 page_key text not null check(page_key ~ '^[a-z0-9-]{1,64}$'),
 card_key text not null check(card_key ~ '^[a-zA-Z0-9_:.-]{1,128}$'),
 width_pct integer check(width_pct between 30 and 100),
 min_height_px integer check(min_height_px between 80 and 1200),
 sort_index integer check(sort_index between 0 and 300),
 updated_by uuid references auth.users(id),
 updated_at timestamptz not null default now(),
 primary key(page_key,card_key)
);
create table if not exists public.gu_site_card_layout_audit_v1(
 id bigint generated always as identity primary key,
 page_key text not null,card_key text not null,
 operation text not null,
 before_value jsonb,after_value jsonb,
 actor_id uuid,changed_at timestamptz not null default now()
);
create or replace function public.gu_site_card_layout_audit_trigger_v1() returns trigger
 language plpgsql security definer set search_path='public','pg_temp'
as $$
begin
 insert into public.gu_site_card_layout_audit_v1(page_key,card_key,operation,before_value,after_value,actor_id)
 values(coalesce(new.page_key,old.page_key),coalesce(new.card_key,old.card_key),tg_op,
 to_jsonb(old),to_jsonb(new),coalesce(new.updated_by,old.updated_by));
 return coalesce(new,old);
end $$;
drop trigger if exists gu_site_card_layout_audit_v1 on public.gu_site_card_layout_v1;
create trigger gu_site_card_layout_audit_v1 after insert or update or delete
 on public.gu_site_card_layout_v1 for each row execute function public.gu_site_card_layout_audit_trigger_v1();
alter table public.gu_site_card_layout_v1 enable row level security;
alter table public.gu_site_card_layout_audit_v1 enable row level security;
revoke all on public.gu_site_card_layout_v1 from public,anon,authenticated;
revoke all on public.gu_site_card_layout_audit_v1 from public,anon,authenticated;
grant select,insert,update,delete on public.gu_site_card_layout_v1 to service_role;
grant select,insert on public.gu_site_card_layout_audit_v1 to service_role;
commit;
