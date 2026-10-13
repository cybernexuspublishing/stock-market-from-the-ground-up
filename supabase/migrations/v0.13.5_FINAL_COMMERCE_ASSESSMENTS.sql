-- The Stock Market: From the Ground Up / v0.13.5 final integration
-- ADDITIVE, requires all three preceding v0.13.5 migrations.
-- No payment activation, no Showcase entitlements, no destructive data migrations.
begin;

-- A completed website order is the authority for its entitlement provenance.
-- Existing member book rights are not overwritten simply by another purchase.
create table if not exists public.order_entitlement_ledger_v135 (
 id bigint generated always as identity primary key,
 provider text not null default 'LEMON_SQUEEZY',
 provider_order_id text not null,
 user_id uuid not null references auth.users(id) on delete cascade,
 product_code text not null,
 entitlement_kind text not null check(entitlement_kind in ('book_companion','plan','tool')),
 granted_record_id text,
 created_by_this_order boolean not null default false,
 status text not null default 'active' check(status in ('active','refunded','chargeback','voided')),
 created_at timestamptz not null default now(),revoked_at timestamptz,
 unique(provider,provider_order_id,product_code,entitlement_kind)
);
create index if not exists order_ledger_v135_user_idx on public.order_entitlement_ledger_v135(user_id,created_at desc);
alter table public.order_entitlement_ledger_v135 enable row level security;
revoke all on public.order_entitlement_ledger_v135 from anon,authenticated;
grant all on public.order_entitlement_ledger_v135 to service_role;
grant usage,select on sequence public.order_entitlement_ledger_v135_id_seq to service_role;

-- Bundle format is explicit, and each component is a separately known book.
insert into public.catalog_products(product_code,product_type,family,title,short_title,author,publisher,
 description,active,sort_order,kdp_select,companion_access,book_key_trial_days,direct_digital_enabled,
 direct_physical_enabled,metadata)
values('FOUNDATIONS_COMPLETE_SERIES','bundle','foundations',
 'The Stock Market Foundations Complete Series — Books I–III','Foundations Complete Series',
 'J. S. Grant','Crown & Lantern Press',
 'The three-book Foundations series. Direct physical bundle sale is disabled pending verified fulfillment, pricing and publication.',
 true,45,true,true,0,false,false,
 '{"format_status":"awaiting_publication","checkout_ready":false,"contents":["FOUNDATION_BOOK_1","FOUNDATION_BOOK_2","FOUNDATION_BOOK_3"]}'::jsonb)
on conflict(product_code) do nothing;
-- Prevent a previous draft or admin mistake from enabling this unfinished bundle.
update public.catalog_products set website_checkout_enabled=false,direct_digital_enabled=false,
 direct_physical_enabled=false,updated_at=now()
where product_code='FOUNDATIONS_COMPLETE_SERIES';
create table if not exists public.book_bundle_components_v135 (
 bundle_code text not null references public.catalog_products(product_code) on delete restrict,
 book_code text not null references public.catalog_products(product_code) on delete restrict,
 sort_order integer not null, primary key(bundle_code,book_code)
);
insert into public.book_bundle_components_v135(bundle_code,book_code,sort_order) values
('FOUNDATIONS_COMPLETE_SERIES','FOUNDATION_BOOK_1',10),
('FOUNDATIONS_COMPLETE_SERIES','FOUNDATION_BOOK_2',20),
('FOUNDATIONS_COMPLETE_SERIES','FOUNDATION_BOOK_3',30)
on conflict do nothing;
alter table public.book_bundle_components_v135 enable row level security;
revoke all on public.book_bundle_components_v135 from anon,authenticated;
grant select on public.book_bundle_components_v135 to anon,authenticated,service_role;
grant all on public.book_bundle_components_v135 to service_role;
create policy "v135 public can see bundle components" on public.book_bundle_components_v135 for select to anon,authenticated using (true);

-- Source-controlled, private rubrics. No real grading without an approved case.
-- The teacher's answer key is NEVER returned to students.
create table if not exists public.competency_cases_v135 (
 case_code text primary key,
 competency_code text not null references public.competency_definitions(competency_code),
 title text not null,description text,
 questions jsonb not null default '[]'::jsonb,
 answer_key jsonb not null default '{}'::jsonb,
 active boolean not null default false,
 reviewed_by uuid references auth.users(id), reviewed_at timestamptz,
 version integer not null default 1 check(version>=1),
 created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
 constraint v135_case_questions_array check(jsonb_typeof(questions)='array'),
 constraint v135_case_answers_object check(jsonb_typeof(answer_key)='object')
);
create table if not exists public.competency_attempts_v135 (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 case_code text not null references public.competency_cases_v135(case_code),
 case_version integer not null,
 answers jsonb not null,
 submitted_at timestamptz not null default now(),
 scored_at timestamptz not null default now(),
 final_score numeric(5,2) check(final_score between 0 and 100),
 critical_errors integer not null default 0 check(critical_errors>=0),
 unique(user_id,case_code)
);
create index if not exists competency_attempts_v135_user_idx on public.competency_attempts_v135(user_id,submitted_at desc);

alter table public.competency_cases_v135 enable row level security;
alter table public.competency_attempts_v135 enable row level security;
revoke all on public.competency_cases_v135,public.competency_attempts_v135 from anon,authenticated;
grant all on public.competency_cases_v135,public.competency_attempts_v135 to service_role;

-- A submitted assessment cannot be modified by an admin or a student. Retesting
-- requires a NEW approved case, not overwriting the first attempt.
create or replace function public.v135_refuse_assessment_change()
returns trigger language plpgsql set search_path=public,pg_temp as $$
begin raise exception 'Submitted assessment evidence is immutable';end;$$;
drop trigger if exists v135_assessment_immutable on public.competency_attempts_v135;
create trigger v135_assessment_immutable before update or delete on public.competency_attempts_v135
for each row execute function public.v135_refuse_assessment_change();

create or replace function public.v135_protect_scored_case()
returns trigger language plpgsql set search_path=public,pg_temp as $$
begin
 if (new.questions,new.answer_key,new.competency_code,new.version) is distinct from
    (old.questions,old.answer_key,old.competency_code,old.version)
    and exists(select 1 from public.competency_attempts_v135 a where a.case_code=old.case_code)
 then raise exception 'Scored competency case cannot be silently rewritten';end if;
 return new;
end;$$;
drop trigger if exists v135_case_integrity on public.competency_cases_v135;
create trigger v135_case_integrity before update on public.competency_cases_v135
for each row execute function public.v135_protect_scored_case();

-- Atomic, first-decision-only assessment submission. No self-grading.
-- Question format: [{"id":"Q1","dimension":"knowledge","prompt":"...",
--   "options":[{"code":"A","label":"..."}],"critical":false}].
-- answer_key format: {"Q1":"A"}. All four dimensions MUST exist in approved cases.
create or replace function public.submit_competency_case_v135(
 p_user uuid,p_case text,p_answers jsonb
) returns jsonb
language plpgsql security definer set search_path=public,pg_temp as $$
declare c public.competency_cases_v135%rowtype;
 q jsonb; dim text; qid text; selected text; wanted text;
 valid_q integer:=0; total_q integer:=0;
 dim_correct integer; dim_total integer; score numeric(5,2); errors integer:=0;
 total_correct integer:=0; id uuid; threshold numeric(5,2); qbad boolean;
begin
 if p_user is null or p_answers is null or jsonb_typeof(p_answers)<>'object' then
  return jsonb_build_object('ok',false,'reason','invalid_answers');end if;
 if public.is_showcase_account_v135(p_user) or
    (select account_kind from public.profiles where id=p_user) is distinct from 'member' then
  return jsonb_build_object('ok',false,'reason','account_not_eligible');end if;
 select * into c from public.competency_cases_v135 where case_code=p_case and active=true for share;
 if not found or c.reviewed_by is null or c.reviewed_at is null then
  return jsonb_build_object('ok',false,'reason','case_not_published');end if;
 if exists(select 1 from public.competency_attempts_v135 where user_id=p_user and case_code=p_case) then
  return jsonb_build_object('ok',false,'reason','already_submitted');end if;
 if jsonb_array_length(c.questions)<4 or jsonb_array_length(c.questions)>40 then
  raise exception 'Published competency case has an invalid question count';end if;
 select pass_score into threshold from public.competency_definitions where competency_code=c.competency_code;
 -- Each approved question has exactly one expected answer and one scored dimension.
 for q in select value from jsonb_array_elements(c.questions) loop
  qid:=q->>'id';dim:=q->>'dimension';wanted:=c.answer_key->>qid;
  if qid is null or length(qid)>40 or wanted is null or
     dim not in ('knowledge','recognition','decision','process') then
   raise exception 'Published competency case is invalid';end if;
  selected:=p_answers->>qid;
  if selected is null or length(selected)>60 then
   return jsonb_build_object('ok',false,'reason','incomplete_answers');end if;
  if not exists(select 1 from jsonb_array_elements(coalesce(q->'options','[]'::jsonb)) x
    where x->>'code'=selected) then
   return jsonb_build_object('ok',false,'reason','invalid_option');end if;
  total_q:=total_q+1;
  if selected=wanted then total_correct:=total_correct+1;
  elsif coalesce((q->>'critical')::boolean,false) then errors:=errors+1;end if;
 end loop;
 if (select count(*) from jsonb_object_keys(p_answers))<>total_q then
  return jsonb_build_object('ok',false,'reason','unexpected_answers');end if;
 foreach dim in array array['knowledge','recognition','decision','process'] loop
  select count(*),count(*) filter(where p_answers->>(q->>'id')=c.answer_key->>(q->>'id'))
    into dim_total,dim_correct from jsonb_array_elements(c.questions) q
    where q->>'dimension'=dim;
  if dim_total<1 then raise exception 'Approved case missing a scored dimension';end if;
 end loop;
 score:=round(100.0*total_correct/total_q,2);
 insert into public.competency_attempts_v135(user_id,case_code,case_version,answers,final_score,critical_errors)
 values(p_user,p_case,c.version,p_answers,score,errors) returning competency_attempts_v135.id into id;
 foreach dim in array array['knowledge','recognition','decision','process'] loop
   select count(*),count(*) filter(where p_answers->>(q->>'id')=c.answer_key->>(q->>'id'))
    into dim_total,dim_correct from jsonb_array_elements(c.questions) q
    where q->>'dimension'=dim;
   insert into public.competency_evidence(user_id,competency_code,source_type,source_id,
     dimension,score,passed,critical_error,difficulty,weight,metadata)
   values(p_user,c.competency_code,'quiz',id::text,dim,
    round(100.0*dim_correct/dim_total,2),
    round(100.0*dim_correct/dim_total,2)>=threshold,
    exists(select 1 from jsonb_array_elements(c.questions) q
     where q->>'dimension'=dim and coalesce((q->>'critical')::boolean,false)
       and p_answers->>(q->>'id') is distinct from c.answer_key->>(q->>'id')),
    'unseen',1,jsonb_build_object('caseCode',p_case,'caseVersion',c.version,'trusted',true));
 end loop;
 return jsonb_build_object('ok',true,'attemptId',id,'score',score,'criticalErrors',errors,
  'grade','rubric_scored_process_not_trade_outcome');
exception when unique_violation then
 return jsonb_build_object('ok',false,'reason','already_submitted');
end;$$;
revoke all on function public.submit_competency_case_v135(uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.submit_competency_case_v135(uuid,text,jsonb) to service_role;

-- Book activation, purchase, and competency records are never direct browser-writable.
-- Audit trail table for sensitive configuration and admin mutations.
create table if not exists public.operations_events_v135(
 id bigint generated always as identity primary key,actor_user_id uuid references auth.users(id),
 area text not null,action text not null,object_code text,metadata jsonb not null default '{}'::jsonb,
 created_at timestamptz not null default now()
);
alter table public.operations_events_v135 enable row level security;
revoke all on public.operations_events_v135 from anon,authenticated;
grant all on public.operations_events_v135 to service_role;
grant usage,select on sequence public.operations_events_v135_id_seq to service_role;

-- Do not turn on any commerce activation switches from SQL migrations.
insert into public.site_settings(setting_key,category,value,public_read,description)
values ('site.version','site','"0.13.5"'::jsonb,true,'Installed code target; live completion depends on owner verification.')
on conflict(setting_key) do update set value=excluded.value,updated_at=now();
notify pgrst,'reload schema';
commit;
