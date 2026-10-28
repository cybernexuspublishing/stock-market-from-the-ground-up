-- Reference migration. Applied to the production project via protected Supabase migration.
create table if not exists public.gu_store_layout_v1(
 singleton boolean primary key default true check(singleton),
 tool_columns integer not null default 5 check(tool_columns between 2 and 6),
 tool_rows integer not null default 6 check(tool_rows between 1 and 12),
 catalog_columns integer not null default 5 check(catalog_columns between 2 and 6),
 catalog_rows integer not null default 3 check(catalog_rows between 1 and 12),
 updated_at timestamptz not null default now()
);
insert into public.gu_store_layout_v1(singleton) values(true) on conflict(singleton) do nothing;
alter table public.gu_store_layout_v1 enable row level security;
revoke all on public.gu_store_layout_v1 from public,anon,authenticated;
grant select on public.gu_store_layout_v1 to anon,authenticated;
grant update(tool_columns,tool_rows,catalog_columns,catalog_rows) on public.gu_store_layout_v1 to authenticated;
create policy gu_store_layout_public_select_v1 on public.gu_store_layout_v1 for select to anon,authenticated using(true);
create policy gu_store_layout_owner_update_v1 on public.gu_store_layout_v1 for update to authenticated using((select public.gu_store_owner_v014297())) with check((select public.gu_store_owner_v014297()));
