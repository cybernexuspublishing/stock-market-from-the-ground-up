-- LIVE applied to Yahoo Supabase on 2026-10-28. Source-controlled schema specification.
-- Display identity is presentation only and does not confer access roles.
alter table public.profiles add column if not exists gender_choice text not null default 'rather_not_say';
do $$ begin
 if not exists(select 1 from pg_constraint where conname='gu_profiles_gender_choice_v1') then
  alter table public.profiles add constraint gu_profiles_gender_choice_v1
   check(gender_choice in ('female','male','rather_not_say'));
 end if;
end $$;
create table if not exists public.gu_member_profile_titles_v1(
 user_id uuid primary key references auth.users(id) on delete cascade,
 selected_title text not null default 'learner',custom_title text,
 updated_at timestamptz not null default now(),
 constraint custom_title_bound check(custom_title is null or char_length(custom_title) between 3 and 26)
);
alter table public.gu_member_profile_titles_v1 enable row level security;
revoke all on public.gu_member_profile_titles_v1 from public,anon,authenticated;
grant select,insert,update on public.gu_member_profile_titles_v1 to service_role;
do $$begin
 if exists(select 1 from pg_constraint where conrelid='public.gu_member_profile_titles_v1'::regclass
   and conname='gu_member_profile_titles_v1_selected_title_check') then
  alter table public.gu_member_profile_titles_v1 drop constraint gu_member_profile_titles_v1_selected_title_check;
 end if;
end $$;
alter table public.gu_member_profile_titles_v1 add constraint gu_member_profile_titles_v1_selected_title_check
 check(selected_title in ('learner','researcher','journaler','founder','book_owner','premium_member','academy_member','custom'));
create table if not exists public.gu_member_custom_title_charges_v1(
 request_id uuid primary key,user_id uuid not null references auth.users(id) on delete cascade,
 title text not null,spark_amount integer not null default 5 check(spark_amount=5),
 charged_at timestamptz not null default now()
);
alter table public.gu_member_custom_title_charges_v1 enable row level security;
revoke all on public.gu_member_custom_title_charges_v1 from public,anon,authenticated;
grant select,insert on public.gu_member_custom_title_charges_v1 to service_role;
create index if not exists gu_member_custom_title_charges_user_v1 on public.gu_member_custom_title_charges_v1(user_id,charged_at);
create or replace function public.gu_member_custom_title_purchase_v1(p_user_id uuid,p_title text,p_request_id uuid)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare n integer:=5;v text:=btrim(p_title);b record;old record;
begin
 if p_user_id is null or p_request_id is null or v !~ '^[A-Za-z0-9][A-Za-z0-9 ._\-]{2,25}$'
 or v ~* '(admin|moderator|mod($|[^[:alpha:]])|owner|operator|staff|employee|support|helpdesk|official|verified|certified|licensed|broker|adviser|advisor|financial|trader[[:space:]]?pro|founder|ambassador|council|security|system|platform|ceo|chief|president|director|superuser|root)' then
  return jsonb_build_object('ok',false,'error','Title is invalid or reserved');
 end if;
 if not exists(select 1 from public.profiles where id=p_user_id and account_kind='member' and deleted_at is null) then
  return jsonb_build_object('ok',false,'error','Member profile unavailable');
 end if;
 perform pg_advisory_xact_lock(hashtextextended(p_user_id::text,489301));
 select user_id,title into old from public.gu_member_custom_title_charges_v1 where request_id=p_request_id;
 if found then
  if old.user_id=p_user_id and old.title=v then return jsonb_build_object('ok',true,'alreadyUsed',true);end if;
  return jsonb_build_object('ok',false,'error','Request identifier is already used');
 end if;
 if coalesce((select sum(remaining_credits) from public.groundup_question_pass_buckets
  where user_id=p_user_id and remaining_credits>0 and (expires_at is null or expires_at>now())),0)<5 then
  return jsonb_build_object('ok',false,'error','At least 5 available Sparks are required');
 end if;
 for b in select id,remaining_credits from public.groundup_question_pass_buckets
  where user_id=p_user_id and remaining_credits>0 and (expires_at is null or expires_at>now())
  order by expires_at asc nulls last,issued_at,id for update loop
   exit when n=0;
   update public.groundup_question_pass_buckets
    set remaining_credits=remaining_credits-least(b.remaining_credits,n) where id=b.id;
   n:=n-least(b.remaining_credits,n);
 end loop;
 if n<>0 then raise exception 'Unable to reconcile available Sparks';end if;
 insert into public.gu_member_custom_title_charges_v1(request_id,user_id,title) values(p_request_id,p_user_id,v);
 insert into public.gu_member_profile_titles_v1(user_id,selected_title,custom_title)
 values(p_user_id,'custom',v)
 on conflict(user_id) do update set selected_title='custom',custom_title=v,updated_at=now();
 return jsonb_build_object('ok',true,'alreadyUsed',false,'charged',5);
end $$;
revoke all on function public.gu_member_custom_title_purchase_v1(uuid,text,uuid) from public,anon,authenticated;
grant execute on function public.gu_member_custom_title_purchase_v1(uuid,text,uuid) to service_role;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('gu-member-avatars','gu-member-avatars',true,1048576,array['image/webp'])
on conflict(id) do nothing;
do $$begin
 if not exists(select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='gu_member_avatars_insert_v1') then
  create policy gu_member_avatars_insert_v1 on storage.objects for insert to authenticated
  with check(bucket_id='gu-member-avatars' and (storage.foldername(name))[1]=(select auth.uid())::text
   and lower(storage.extension(name))='webp' and name ~ ('^'||(select auth.uid())::text||'/[0-9a-f]{32}\.webp$'));
 end if;
 if not exists(select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='gu_member_avatars_delete_v1') then
  create policy gu_member_avatars_delete_v1 on storage.objects for delete to authenticated
  using(bucket_id='gu-member-avatars' and (storage.foldername(name))[1]=(select auth.uid())::text);
 end if;
end $$;
create or replace function public.gu_guard_member_avatar_v1()
returns trigger language plpgsql security invoker set search_path=public,pg_temp as $$
begin
 if current_user='authenticated' then
  if new.avatar_url is distinct from old.avatar_url and new.avatar_url is not null and
   not(new.avatar_url ~ '^https://stock-market-from-the-ground-up-d1r\.pages\.dev/assets/avatars/av-[fmn][1-3]\.svg$'
    or new.avatar_url ~ ('^https://[a-z0-9]{20}\.supabase\.co/storage/v1/object/public/gu-member-avatars/'||new.id::text||'/[0-9a-f]{32}\.webp$'))
  then raise exception 'Only approved avatars are permitted' using errcode='23514';end if;
  if new.bio is distinct from old.bio and char_length(coalesce(new.bio,''))>1000 then
   raise exception 'Biography must be 1000 characters or fewer' using errcode='23514';end if;
 end if;
 return new;
end $$;
drop trigger if exists gu_guard_member_avatar_v1 on public.profiles;
create trigger gu_guard_member_avatar_v1 before update of avatar_url,bio on public.profiles
 for each row execute function public.gu_guard_member_avatar_v1();
revoke all on function public.gu_guard_member_avatar_v1() from public,anon,authenticated;
