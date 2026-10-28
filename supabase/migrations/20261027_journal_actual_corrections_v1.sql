-- Trading Journal actual-trade corrections v1.
-- Append-only private history of post-closure actual changes; original plan remains locked.
create table if not exists public.journal_actual_history_v1 (
 id bigint generated always as identity primary key,
 journal_id bigint not null references public.decision_journal(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 actor_id uuid,
 changed_at timestamptz not null default now(),
 changes jsonb not null check(jsonb_typeof(changes)='object')
);
create index if not exists journal_actual_history_owner_v1 on public.journal_actual_history_v1(user_id,journal_id,changed_at desc,id desc);
alter table public.journal_actual_history_v1 enable row level security;
revoke all on public.journal_actual_history_v1 from public,anon,authenticated;
grant select on public.journal_actual_history_v1 to authenticated;
drop policy if exists journal_actual_history_v1_read_own on public.journal_actual_history_v1;
create policy journal_actual_history_v1_read_own on public.journal_actual_history_v1
 for select to authenticated using(
  user_id=(select auth.uid()) and
  exists(select 1 from public.decision_journal j where j.id=journal_id and j.user_id=(select auth.uid()))
 );
create or replace function private.journal_actual_audit_v1()
returns trigger language plpgsql security definer set search_path=public,pg_temp as $journal_audit$
declare
 key text;
 changed jsonb := '{}'::jsonb;
 fields text[] := array[
 'actual_entry','actual_exit','entry_time_et','exit_time_et','exit_date',
 'highest_while_open','lowest_while_open','fees','plan_followed','process_grade',
 'actual_exit_reason_category','actual_exit_reason','no_trade_reason',
 'emotion_during','emotion_after','mistakes','result_note','lesson',
 'gross_pnl','net_pnl','r_multiple','mfe_r','mae_r','mfe_capture_pct',
 'status','closed_at'
 ];
 previous jsonb := to_jsonb(old);
 current_row jsonb := to_jsonb(new);
begin
 if old.status not in ('closed','reviewed','no_trade') then return new; end if;
 for key in select unnest(fields) loop
  if previous->key is distinct from current_row->key then
   changed:=changed||jsonb_build_object(key,jsonb_build_object('before',previous->key,'after',current_row->key));
  end if;
 end loop;
 if changed<>'{}'::jsonb then
  insert into public.journal_actual_history_v1(journal_id,user_id,actor_id,changes)
    values(new.id,new.user_id,auth.uid(),changed);
 end if;
 return new;
end $journal_audit$;
revoke all on function private.journal_actual_audit_v1() from public,anon,authenticated;
drop trigger if exists journal_actual_audit_v1 on public.decision_journal;
create trigger journal_actual_audit_v1 after update on public.decision_journal
 for each row execute function private.journal_actual_audit_v1();
