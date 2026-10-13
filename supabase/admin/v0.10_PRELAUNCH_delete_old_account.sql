-- PRE-LAUNCH ACCOUNT RESET
-- Purpose: remove the old test account so the username Adissel can be reused.
-- Run this in Supabase SQL Editor BEFORE creating stockmarketfromthegroundup@gmail.com.
-- Target account only: Adissel89@gmail.com

begin;

-- Delete the authentication account. Related profile, journal, library, role,
-- forum, and other user-owned rows with ON DELETE CASCADE are removed with it.
delete from auth.users
where lower(email) = lower('Adissel89@gmail.com');

-- Defensive cleanup for an impossible/legacy orphaned profile record, if one exists.
delete from public.profiles p
where lower(p.username) = lower('Adissel')
  and not exists (select 1 from auth.users u where u.id = p.id);

-- If the deleted test account redeemed Book Keys, cascade deletion removes its
-- redemption rows. Recalculate key counts from the remaining redemption table
-- so test usage does not remain in the live counters.
do $$
begin
  if to_regclass('public.book_keys') is not null
     and to_regclass('public.book_key_redemptions') is not null
     and exists (select 1 from information_schema.columns where table_schema='public' and table_name='book_key_redemptions' and column_name='book_key_id')
     and exists (select 1 from information_schema.columns where table_schema='public' and table_name='book_keys' and column_name='redemption_count') then
    execute 'update public.book_keys k set redemption_count=(select count(*) from public.book_key_redemptions r where r.book_key_id=k.id)';
  end if;
end $$;

commit;

-- Verification: both should return 0 rows before the new account is created.
select id, email, created_at
from auth.users
where lower(email) = lower('Adissel89@gmail.com');

select id, username, display_name
from public.profiles
where lower(username) = lower('Adissel');
