-- v0.8 Market Simulator + v0.7 journal hotfix
-- Run after v0.7_live_trading_journal.sql.

-- Defensive repair: journal_type should never be null. The v0.7 UI hotfix also prevents
-- journal_type from being overwritten with NULL while saving a pre-trade plan.
update public.decision_journal
set journal_type='paper'
where journal_type is null;

alter table public.decision_journal alter column journal_type set default 'live';
alter table public.decision_journal alter column journal_type set not null;

-- Simulator provenance. These fields intentionally store metadata and summary results,
-- not the uploaded candle dataset itself.
alter table public.decision_journal add column if not exists simulator_source text;
alter table public.decision_journal add column if not exists simulator_source_label text;
alter table public.decision_journal add column if not exists simulator_fill_policy text;
alter table public.decision_journal add column if not exists simulator_ambiguous_bar_count integer not null default 0;
alter table public.decision_journal add column if not exists simulator_version text default 'v0.8';

do $$ begin
  if not exists (select 1 from pg_constraint where conname='decision_journal_sim_source_check') then
    alter table public.decision_journal add constraint decision_journal_sim_source_check
      check (simulator_source is null or simulator_source in ('csv_upload','verified_lab','licensed_api','user_connected_api'));
  end if;
  if not exists (select 1 from pg_constraint where conname='decision_journal_sim_fill_policy_check') then
    alter table public.decision_journal add constraint decision_journal_sim_fill_policy_check
      check (simulator_fill_policy is null or simulator_fill_policy in ('manual_on_ambiguous','stop_first','target_first'));
  end if;
  if not exists (select 1 from pg_constraint where conname='decision_journal_sim_ambiguous_check') then
    alter table public.decision_journal add constraint decision_journal_sim_ambiguous_check
      check (simulator_ambiguous_bar_count >= 0);
  end if;
end $$;

create index if not exists decision_journal_user_simulator_idx
  on public.decision_journal(user_id, simulator_source, trade_date desc)
  where simulator_source is not null;

-- Existing decision_journal RLS remains authoritative. These grants simply make the
-- newly added columns available under the existing own-row policies.
grant select,insert,update on public.decision_journal to authenticated;
