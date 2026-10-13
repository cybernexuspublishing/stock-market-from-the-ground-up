-- THE STOCK MARKET: FROM THE GROUND UP | v0.13.5 Phase 2
-- Run AFTER the Phase 1 v0.13.5 foundation migration.
-- Stop any previously issued Showcase grants from resolving as REAL access.
-- Preserve prior FUNCTION bodies under non-public names for recoverable rollback.
-- This does not DELETE existing subscription, book, or competency records.
begin;
do $$begin
 if to_regprocedure('public.my_platform_access_before_v135()') is null then
   if to_regprocedure('public.my_platform_access()') is null then
     raise exception 'Missing public.my_platform_access(); verify installed migration sequence';
   end if;
   execute 'alter function public.my_platform_access() rename to my_platform_access_before_v135';
 end if;
end $$;
-- No browser calls to the historic implementation (would bypass Showcase guard).
revoke all on function public.my_platform_access_before_v135() from public,anon,authenticated;
grant execute on function public.my_platform_access_before_v135() to service_role;
create or replace function public.my_platform_access()
returns jsonb language plpgsql security definer set search_path=public,auth,pg_temp as $$
declare uid uuid := auth.uid();
begin
 if uid is not null and public.is_showcase_account_v135(uid) then
   return jsonb_build_object(
     'authenticated',true,'userId',uid,'planCode','FREE','planName','Showcase (Synthetic)',
     'staffRoles',jsonb_build_array('SHOWCASE_VIEWER'),'controlPanel',true,
     'adFree',false,'allTools',false,'allBooks',false,
     'tools','[]'::jsonb,'books','[]'::jsonb,'toolPasses','[]'::jsonb,
     'startsAt',null,'renewsAt',null,'expiresAt',null,
     'synthetic',true,'productionEntitlements',false
   );
 end if;
 return public.my_platform_access_before_v135();
end;$$;
revoke all on function public.my_platform_access() from public,anon,authenticated;
grant execute on function public.my_platform_access() to anon,authenticated,service_role;

-- Backend Admin-only access snapshot also must not claim Lifetime or paid access.
do $$begin
 if to_regprocedure('public.my_platform_access_for_user_before_v135(uuid)') is null then
  if to_regprocedure('public.my_platform_access_for_user(uuid)') is null then
   raise exception 'Missing public.my_platform_access_for_user(uuid)';
  end if;
  execute 'alter function public.my_platform_access_for_user(uuid) rename to my_platform_access_for_user_before_v135';
 end if;
end $$;
revoke all on function public.my_platform_access_for_user_before_v135(uuid) from public,anon,authenticated;
grant execute on function public.my_platform_access_for_user_before_v135(uuid) to service_role;
create or replace function public.my_platform_access_for_user(target_user uuid)
returns jsonb language plpgsql security definer set search_path=public,auth,pg_temp as $$
begin
 if target_user is not null and public.is_showcase_account_v135(target_user) then
  return jsonb_build_object('planCode','FREE','planName','Showcase (Synthetic)',
    'adFree',false,'startsAt',null,'renewsAt',null,'expiresAt',null,
    'synthetic',true,'productionEntitlements',false);
 end if;
 return public.my_platform_access_for_user_before_v135(target_user);
end;$$;
revoke all on function public.my_platform_access_for_user(uuid) from public,anon,authenticated;
grant execute on function public.my_platform_access_for_user(uuid) to service_role;

-- Guard legacy entitlements that the platform used before newer plan grants.
create or replace function public.v135_refuse_legacy_showcase_access()
returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if public.is_showcase_account_v135(new.user_id) then
  -- Allow cleanup into an inactive state; never allow a new/live Showcase grant.
  if tg_table_name='entitlements' and new.status not in ('active','trialing') then
    return new;
  end if;
  if tg_table_name='book_key_redemptions' and new.ends_at<=now() then
    return new;
  end if;
  raise exception 'Synthetic Showcase accounts cannot receive legacy member entitlements or book-key redemptions';
 end if;
 return new;
end;$$;
drop trigger if exists v135_showcase_legacy_grant_guard on public.entitlements;
create trigger v135_showcase_legacy_grant_guard before insert or update on public.entitlements
 for each row execute function public.v135_refuse_legacy_showcase_access();
drop trigger if exists v135_showcase_key_redemption_guard on public.book_key_redemptions;
create trigger v135_showcase_key_redemption_guard before insert or update on public.book_key_redemptions
 for each row execute function public.v135_refuse_legacy_showcase_access();
notify pgrst,'reload schema';
commit;
