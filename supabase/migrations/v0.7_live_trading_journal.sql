-- v0.7 Live Trading Journal + Plan Lock + MFE/MAE + Review Queue
-- Additive migration. Run after the v0.6 interactive-learning migration.

-- Existing v0.6 entries are preserved. Draft records may now exist before a final decision is selected.
alter table public.decision_journal alter column decision drop not null;

alter table public.decision_journal add column if not exists journal_type text;
alter table public.decision_journal add column if not exists status text;

-- Preserve v0.6 journal history as learning/simulator records rather than silently relabeling it as live trading.
update public.decision_journal set journal_type='paper' where journal_type is null;
update public.decision_journal set status='closed' where status is null;
alter table public.decision_journal alter column journal_type set default 'live';
alter table public.decision_journal alter column status set default 'draft';
alter table public.decision_journal alter column journal_type set not null;
alter table public.decision_journal alter column status set not null;
alter table public.decision_journal add column if not exists direction text;
alter table public.decision_journal add column if not exists exit_date date;
alter table public.decision_journal add column if not exists entry_time_et time;
alter table public.decision_journal add column if not exists exit_time_et time;
alter table public.decision_journal add column if not exists session_label text;
alter table public.decision_journal add column if not exists account_label text;
alter table public.decision_journal add column if not exists catalyst_context text;
alter table public.decision_journal add column if not exists market_context text;
alter table public.decision_journal add column if not exists entry_reason_category text;
alter table public.decision_journal add column if not exists entry_reason text;
alter table public.decision_journal add column if not exists entry_trigger text;
alter table public.decision_journal add column if not exists no_trade_condition text;
alter table public.decision_journal add column if not exists planned_entry numeric;
alter table public.decision_journal add column if not exists actual_entry numeric;
alter table public.decision_journal add column if not exists planned_stop numeric;
alter table public.decision_journal add column if not exists planned_target numeric;
alter table public.decision_journal add column if not exists share_quantity numeric;
alter table public.decision_journal add column if not exists planned_exit_reason_category text;
alter table public.decision_journal add column if not exists planned_exit_reason text;
alter table public.decision_journal add column if not exists actual_exit numeric;
alter table public.decision_journal add column if not exists highest_while_open numeric;
alter table public.decision_journal add column if not exists lowest_while_open numeric;
alter table public.decision_journal add column if not exists fees numeric not null default 0;
alter table public.decision_journal add column if not exists actual_exit_reason_category text;
alter table public.decision_journal add column if not exists actual_exit_reason text;
alter table public.decision_journal add column if not exists no_trade_reason text;
alter table public.decision_journal add column if not exists plan_followed text;
alter table public.decision_journal add column if not exists process_grade text;
alter table public.decision_journal add column if not exists emotion_before text;
alter table public.decision_journal add column if not exists emotion_during text;
alter table public.decision_journal add column if not exists emotion_after text;
alter table public.decision_journal add column if not exists mistakes text[] not null default '{}';
alter table public.decision_journal add column if not exists tags text[] not null default '{}';
alter table public.decision_journal add column if not exists gross_pnl numeric;
alter table public.decision_journal add column if not exists net_pnl numeric;
alter table public.decision_journal add column if not exists risk_per_share numeric;
alter table public.decision_journal add column if not exists initial_planned_risk numeric;
alter table public.decision_journal add column if not exists r_multiple numeric;
alter table public.decision_journal add column if not exists mfe_per_share numeric;
alter table public.decision_journal add column if not exists mae_per_share numeric;
alter table public.decision_journal add column if not exists mfe_dollars numeric;
alter table public.decision_journal add column if not exists mae_dollars numeric;
alter table public.decision_journal add column if not exists mfe_r numeric;
alter table public.decision_journal add column if not exists mae_r numeric;
alter table public.decision_journal add column if not exists mfe_capture_pct numeric;
alter table public.decision_journal add column if not exists duration_minutes integer;
alter table public.decision_journal add column if not exists plan_locked_at timestamptz;
alter table public.decision_journal add column if not exists closed_at timestamptz;

-- Add controlled checks idempotently.
do $$ begin
  if not exists (select 1 from pg_constraint where conname='decision_journal_type_check') then
    alter table public.decision_journal add constraint decision_journal_type_check check (journal_type in ('live','paper','observation','historical_lab'));
  end if;
  if not exists (select 1 from pg_constraint where conname='decision_journal_status_check') then
    alter table public.decision_journal add constraint decision_journal_status_check check (status in ('draft','planned','open','closed','no_trade','reviewed'));
  end if;
  if not exists (select 1 from pg_constraint where conname='decision_journal_direction_check') then
    alter table public.decision_journal add constraint decision_journal_direction_check check (direction is null or direction in ('LONG','SHORT'));
  end if;
  if not exists (select 1 from pg_constraint where conname='decision_journal_plan_followed_check') then
    alter table public.decision_journal add constraint decision_journal_plan_followed_check check (plan_followed is null or plan_followed in ('YES','PARTIAL','NO'));
  end if;
  if not exists (select 1 from pg_constraint where conname='decision_journal_process_grade_check') then
    alter table public.decision_journal add constraint decision_journal_process_grade_check check (process_grade is null or process_grade in ('GOOD','MIXED','BAD'));
  end if;
end $$;

create index if not exists decision_journal_user_date_idx on public.decision_journal(user_id,trade_date desc,created_at desc);
create index if not exists decision_journal_user_status_idx on public.decision_journal(user_id,status,trade_date desc);

-- Immutable pre-trade snapshot. Browser users may read their own snapshot but cannot directly create/update/delete it.
create table if not exists public.trade_plan_snapshots (
  id bigint generated always as identity primary key,
  journal_id bigint not null unique references public.decision_journal(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  snapshot jsonb not null,
  locked_at timestamptz not null default now()
);
alter table public.trade_plan_snapshots enable row level security;
drop policy if exists "read own plan snapshots" on public.trade_plan_snapshots;
create policy "read own plan snapshots" on public.trade_plan_snapshots for select to authenticated using (auth.uid()=user_id);
revoke all on public.trade_plan_snapshots from anon, authenticated;
grant select on public.trade_plan_snapshots to authenticated;

create or replace function public.lock_trade_plan(target_journal_id bigint)
returns bigint
language plpgsql
security definer
set search_path=public
as $$
declare
  uid uuid := auth.uid();
  j public.decision_journal%rowtype;
  snap_id bigint;
begin
  if uid is null then raise exception 'Authentication required'; end if;
  select * into j from public.decision_journal where id=target_journal_id and user_id=uid for update;
  if j.id is null then raise exception 'Journal record not found'; end if;

  select id into snap_id from public.trade_plan_snapshots where journal_id=j.id;
  if snap_id is not null then return snap_id; end if;

  insert into public.trade_plan_snapshots(journal_id,user_id,snapshot)
  values(j.id,uid,jsonb_build_object(
    'journal_type',j.journal_type,'ticker',j.ticker,'trade_date',j.trade_date,'direction',j.direction,
    'timeframe',j.timeframe,'session_label',j.session_label,'setup',j.setup,'account_label',j.account_label,
    'catalyst_context',j.catalyst_context,'market_context',j.market_context,
    'evidence',j.evidence,'thesis',j.thesis,'entry_reason_category',j.entry_reason_category,
    'entry_reason',j.entry_reason,'entry_trigger',j.entry_trigger,'invalidation',j.invalidation,
    'no_trade_condition',j.no_trade_condition,'planned_entry',j.planned_entry,'planned_stop',j.planned_stop,
    'planned_target',j.planned_target,'share_quantity',j.share_quantity,
    'planned_exit_reason_category',j.planned_exit_reason_category,'planned_exit_reason',j.planned_exit_reason,
    'decision',j.decision,'emotion_before',j.emotion_before
  )) returning id into snap_id;

  update public.decision_journal
  set plan_locked_at=now(), status=case when status='draft' then 'planned' else status end, updated_at=now()
  where id=j.id;
  return snap_id;
end;$$;
revoke all on function public.lock_trade_plan(bigint) from public,anon;
grant execute on function public.lock_trade_plan(bigint) to authenticated;

-- A locked plan is immutable at the database layer. Actual execution/outcome fields remain editable.
create or replace function public.protect_locked_trade_plan()
returns trigger
language plpgsql
set search_path=public
as $$
begin
  if old.plan_locked_at is not null then
    if new.journal_type is distinct from old.journal_type
      or new.ticker is distinct from old.ticker
      or new.trade_date is distinct from old.trade_date
      or new.direction is distinct from old.direction
      or new.session_label is distinct from old.session_label
      or new.timeframe is distinct from old.timeframe
      or new.setup is distinct from old.setup
      or new.account_label is distinct from old.account_label
      or new.catalyst_context is distinct from old.catalyst_context
      or new.market_context is distinct from old.market_context
      or new.evidence is distinct from old.evidence
      or new.thesis is distinct from old.thesis
      or new.entry_reason_category is distinct from old.entry_reason_category
      or new.entry_reason is distinct from old.entry_reason
      or new.entry_trigger is distinct from old.entry_trigger
      or new.invalidation is distinct from old.invalidation
      or new.no_trade_condition is distinct from old.no_trade_condition
      or new.planned_entry is distinct from old.planned_entry
      or new.planned_stop is distinct from old.planned_stop
      or new.planned_target is distinct from old.planned_target
      or new.share_quantity is distinct from old.share_quantity
      or new.planned_exit_reason_category is distinct from old.planned_exit_reason_category
      or new.planned_exit_reason is distinct from old.planned_exit_reason
      or new.decision is distinct from old.decision
      or new.emotion_before is distinct from old.emotion_before then
      raise exception 'Pre-trade plan is locked and cannot be changed.';
    end if;
  end if;
  return new;
end;$$;

drop trigger if exists protect_locked_trade_plan_trigger on public.decision_journal;
create trigger protect_locked_trade_plan_trigger
before update on public.decision_journal
for each row execute procedure public.protect_locked_trade_plan();

-- Spaced review queue: 1 day, 7 days, and 30 days after a trade/no-trade record is completed.
create table if not exists public.journal_reviews (
  id bigint generated always as identity primary key,
  journal_id bigint not null references public.decision_journal(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  review_stage text not null check (review_stage in ('1D','7D','30D')),
  due_at timestamptz not null,
  completed_at timestamptz,
  review_notes text,
  created_at timestamptz not null default now(),
  unique(journal_id,review_stage)
);
alter table public.journal_reviews enable row level security;
drop policy if exists "read own journal reviews" on public.journal_reviews;
create policy "read own journal reviews" on public.journal_reviews for select to authenticated using (auth.uid()=user_id);
drop policy if exists "update own journal reviews" on public.journal_reviews;
create policy "update own journal reviews" on public.journal_reviews for update to authenticated using (auth.uid()=user_id) with check (auth.uid()=user_id);
revoke all on public.journal_reviews from anon,authenticated;
grant select on public.journal_reviews to authenticated;
grant update (completed_at,review_notes) on public.journal_reviews to authenticated;

create or replace function public.journal_set_timestamps_and_reviews()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
declare base_time timestamptz;
begin
  new.updated_at=now();
  if new.status in ('closed','no_trade') and (old.status is distinct from new.status) then
    new.closed_at=coalesce(new.closed_at,now());
    base_time=new.closed_at;
    insert into public.journal_reviews(journal_id,user_id,review_stage,due_at) values
      (new.id,new.user_id,'1D',base_time+interval '1 day'),
      (new.id,new.user_id,'7D',base_time+interval '7 days'),
      (new.id,new.user_id,'30D',base_time+interval '30 days')
    on conflict(journal_id,review_stage) do nothing;
  end if;
  return new;
end;$$;

drop trigger if exists decision_journal_v07_before_update on public.decision_journal;
create trigger decision_journal_v07_before_update
before update on public.decision_journal
for each row execute procedure public.journal_set_timestamps_and_reviews();

-- Initial insert directly as closed/no_trade also receives review tasks via an after-insert trigger.
create or replace function public.journal_schedule_reviews_after_insert()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
declare base_time timestamptz;
begin
  if new.status in ('closed','no_trade') then
    base_time=coalesce(new.closed_at,new.created_at,now());
    insert into public.journal_reviews(journal_id,user_id,review_stage,due_at) values
      (new.id,new.user_id,'1D',base_time+interval '1 day'),
      (new.id,new.user_id,'7D',base_time+interval '7 days'),
      (new.id,new.user_id,'30D',base_time+interval '30 days')
    on conflict(journal_id,review_stage) do nothing;
  end if;
  return new;
end;$$;
drop trigger if exists decision_journal_v07_after_insert on public.decision_journal;
create trigger decision_journal_v07_after_insert after insert on public.decision_journal for each row execute procedure public.journal_schedule_reviews_after_insert();

-- Existing ownership RLS on decision_journal remains in force. Explicit grants cover the added columns.
grant select,insert,update,delete on public.decision_journal to authenticated;
grant usage,select on sequence public.journal_reviews_id_seq to authenticated;
