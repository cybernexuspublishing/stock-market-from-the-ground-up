-- THE STOCK MARKET: FROM THE GROUND UP | v0.13.5 Phase 2
-- Incremental after v0.13.5_TRAINING_BOOK_ACTIVATION_FOUNDATION.sql.
-- No historical migrations are rerun; no existing member records are altered.
-- Self-reported OnDemand practice is NOT scored competency evidence.
begin;
create table if not exists public.replay_practice_sessions_v135 (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  lab_id text not null,
  ticker text not null check (ticker ~ '^[A-Z0-9.\-]{1,12}$'),
  historical_date date not null,
  timeframe text,
  decision_time_et text not null check(decision_time_et ~ '^([01][0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$'),
  decision text not null check(decision in ('ENTER','WATCH','NO_TRADE')),
  evidence text not null check(length(evidence) between 20 and 6000),
  invalidation text not null check(length(invalidation) between 5 and 2000),
  risk_plan text not null check(length(risk_plan) between 5 and 2000),
  locked_at timestamptz not null default now(),
  reviewed_at timestamptz,
  observed_outcome text check(observed_outcome is null or length(observed_outcome) between 5 and 6000),
  reflection text check(reflection is null or length(reflection) between 5 and 6000),
  provenance text not null default 'learner_reported_third_party_replay',
  metadata jsonb not null default '{}'::jsonb
);
create index if not exists replay_practice_user_time_v135 on public.replay_practice_sessions_v135(user_id,locked_at desc);
alter table public.replay_practice_sessions_v135 enable row level security;
drop policy if exists "replay learner reads own practice" on public.replay_practice_sessions_v135;
create policy "replay learner reads own practice" on public.replay_practice_sessions_v135 for select to authenticated using (auth.uid()=user_id);
revoke all on public.replay_practice_sessions_v135 from public,anon,authenticated;
grant select on public.replay_practice_sessions_v135 to authenticated;
grant all on public.replay_practice_sessions_v135 to service_role;
-- Service endpoints must not rewrite what the learner declared before reviewing playback.
create or replace function public.v135_replay_immutable_decision()
returns trigger language plpgsql set search_path=public,pg_temp as $$
begin
 if new.id is distinct from old.id or new.user_id is distinct from old.user_id
 or new.lab_id is distinct from old.lab_id or new.ticker is distinct from old.ticker
 or new.historical_date is distinct from old.historical_date
 or new.timeframe is distinct from old.timeframe
 or new.decision_time_et is distinct from old.decision_time_et
 or new.decision is distinct from old.decision
 or new.evidence is distinct from old.evidence
 or new.invalidation is distinct from old.invalidation
 or new.risk_plan is distinct from old.risk_plan
 or new.locked_at is distinct from old.locked_at
 or new.provenance is distinct from old.provenance then
   raise exception 'Locked replay decisions cannot be edited after submission';
 end if;
 if old.reviewed_at is not null and
    (new.reviewed_at is distinct from old.reviewed_at
    or new.observed_outcome is distinct from old.observed_outcome
    or new.reflection is distinct from old.reflection) then
   raise exception 'Completed replay reviews cannot be rewritten';
 end if;
 if old.reviewed_at is null and new.reviewed_at is not null then
   if new.observed_outcome is null or length(trim(new.observed_outcome))<5
      or new.reflection is null or length(trim(new.reflection))<5 then
     raise exception 'Outcome and reflection are required for review';
   end if;
 end if;
 return new;
end; $$;
drop trigger if exists v135_replay_decision_lock on public.replay_practice_sessions_v135;
create trigger v135_replay_decision_lock before update on public.replay_practice_sessions_v135
 for each row execute function public.v135_replay_immutable_decision();
-- Never permit scored competency evidence to be generated from these self-reports.
comment on table public.replay_practice_sessions_v135 is 'Learner-declared self-report. Not proof of profitability, mastery, execution or historical tape availability.';
notify pgrst,'reload schema';
commit;
