-- SMFGU-ACADEMY-ASSESS-001 v1.0 | 2026-10-31
-- Assessment routing only. Private answer keys remain in competency_cases_v135,
-- not in GitHub. No new course or case is automatically activated.
begin;
set local lock_timeout='3s';
set local statement_timeout='30s';
create table if not exists public.gu_academy_protected_cases_v1 (
 program_code text not null check(program_code in ('tape10','indicators10','filings7')),
 day_number smallint not null check(day_number between 1 and 10),
 variant smallint not null check(variant between 1 and 5),
 case_code text not null references public.competency_cases_v135(case_code) on delete restrict,
 source_status text not null default 'original_fictional_case_unreviewed'
  check(source_status in ('original_fictional_case_unreviewed','editorial_review_requested','approved')),
 created_at timestamptz not null default now(),
 primary key(program_code,day_number,variant),
 unique(case_code),
 constraint gu_academy_case_days_v1 check(
  (program_code='filings7' and day_number<=7) or
  (program_code in ('tape10','indicators10') and day_number<=10))
);
alter table public.gu_academy_protected_cases_v1 enable row level security;
revoke all on public.gu_academy_protected_cases_v1 from public,anon,authenticated;
grant select,insert,update on public.gu_academy_protected_cases_v1 to service_role;
comment on table public.gu_academy_protected_cases_v1 is
 'PRIVATE routing of each new Academy day to separately reviewed protected cases. No case keys, grading or client-visible answers.';
commit;
