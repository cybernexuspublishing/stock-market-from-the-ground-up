-- v0.14.0.0 ADDITIVE, REVIEW BEFORE EXECUTION. Existing Cloudflare/Supabase
-- deployment is not modified by storing this migration in GitHub.
-- PRECONDITION: prior platform_plans, admin_audit_log, user_has_tool_access,
-- auth.users and admin roles schema already exist. Verify first via read-only SQL.
begin;

-- Proposed 100-member founding offer. PRIVATE, INACTIVE, and UNPURCHASABLE.
-- Actual payment-provider variants, order fulfillment, expiry terms and consent
-- MUST be reviewed before Owner may separately launch the offer.
insert into public.platform_plans
 (plan_code,name,description,price_cents,billing_interval,active,public_visible,ad_free,includes_all_tools,includes_all_books,checkout_url,sort_order,metadata)
values
 ('FOUNDING_MONTHLY','Founding Member — Monthly','Founding-member proposal: full first-party platform access at an introductory price. Enrollment is not open.',4999,'month',false,false,false,true,true,null,25,'{"founding_offer":true,"maximum_invites":100,"launch_state":"draft","no_checkout":true}'::jsonb),
 ('FOUNDING_ANNUAL','Founding Member — Annual','Founding-member proposal: full first-party platform access at an introductory annual price. Enrollment is not open.',49900,'year',false,false,false,true,true,null,35,'{"founding_offer":true,"maximum_invites":100,"launch_state":"draft","no_checkout":true}'::jsonb)
on conflict(plan_code) do nothing;

-- Transactional Owner plan availability change and matching audit entry.
-- Plans cannot be made purchasable by this RPC. Existing grants are unaffected.
create or replace function public.v014_owner_plan_visibility(
 p_actor uuid,p_code text,p_active boolean,p_visible boolean,p_pause_checkout boolean
) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare oldrow record; newrow record;
begin
 if p_actor is null or not exists(
  select 1 from public.admin_user_roles r join public.profiles p on p.id=r.user_id
  where r.user_id=p_actor and r.role_code='OWNER' and (r.expires_at is null or r.expires_at>now()) and p.account_kind='member'
 ) then raise exception 'OWNER role required'; end if;
 if p_code='FREE' and not p_active then raise exception 'FREE account fallback cannot be disabled; public marketing visibility may be hidden'; end if;
 select plan_code,active,public_visible,checkout_enabled into oldrow from public.platform_plans where plan_code=p_code for update;
 if not found then raise exception 'Plan does not exist'; end if;
 -- Prevent accidentally publishing unapproved founding offer; launch has a separate milestone.
 if p_code in ('FOUNDING_MONTHLY','FOUNDING_ANNUAL') and (p_active or p_visible) then
  raise exception 'Founding offer is a draft pending verified provider and onboarding acceptance';
 end if;
 update public.platform_plans set active=p_active, public_visible=p_visible,
   checkout_enabled=case when not p_active or not p_visible or p_pause_checkout then false else checkout_enabled end,
   updated_at=now() where plan_code=p_code
 returning plan_code,active,public_visible,checkout_enabled into newrow;
 insert into public.admin_audit_log(actor_user_id,action,target_type,target_id,details)
 values(p_actor,'v014.plan_visibility_update','platform_plan',p_code,
   jsonb_build_object('before',jsonb_build_object('active',oldrow.active,'public_visible',oldrow.public_visible,'checkout_enabled',oldrow.checkout_enabled),'after',jsonb_build_object('active',newrow.active,'public_visible',newrow.public_visible,'checkout_enabled',newrow.checkout_enabled)));
 return jsonb_build_object('ok',true,'planCode',newrow.plan_code,'active',newrow.active,'publicVisible',newrow.public_visible,'checkoutEnabled',newrow.checkout_enabled);
end;$$;
revoke all on function public.v014_owner_plan_visibility(uuid,text,boolean,boolean,boolean) from public,anon,authenticated;
grant execute on function public.v014_owner_plan_visibility(uuid,text,boolean,boolean,boolean) to service_role;

-- PRIVATE source instructional content: NONE of the book's full Lab steps
-- are held in the public repo or static /data directory.
create table if not exists public.lab_instruction_v014 (
 lab_id text primary key,
 book_number integer not null check(book_number between 1 and 3),
 content jsonb not null check(jsonb_typeof(content)='object'),
 source_status text not null default 'book_authored_unverified_market',
 created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
alter table public.lab_instruction_v014 enable row level security;
revoke all on public.lab_instruction_v014 from anon,authenticated;
grant all on public.lab_instruction_v014 to service_role;

-- PRIVATE approved instructional bank. No public question answers in JSON assets.
create table if not exists public.lab_training_sets_v014 (
 lab_id text not null,version integer not null default 1 check(version>0),
 review_state text not null default 'draft' check(review_state in ('draft','reviewed')),
 source_status text not null default 'book_authored_unverified_market',
 title text not null,questions jsonb not null default '[]'::jsonb,
 answer_key jsonb not null default '{}'::jsonb,
 reviewed_by uuid references auth.users(id),reviewed_at timestamptz,
 created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
 constraint questions_array check(jsonb_typeof(questions)='array'),
 constraint answers_object check(jsonb_typeof(answer_key)='object'),
 primary key(lab_id,version)
);
create table if not exists public.lab_training_attempts_v014 (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 lab_id text not null,
 set_version integer not null, foreign key(lab_id,set_version) references public.lab_training_sets_v014(lab_id,version), mode text not null check(mode in ('guided','practice','blind','assessment')),
 step_index integer not null default 0 check(step_index>=0),
 responses jsonb not null default '[]'::jsonb, score integer,
 report jsonb,completed_at timestamptz,created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index if not exists lab_training_attempts_v014_user_idx on public.lab_training_attempts_v014(user_id,created_at desc);
-- Exactly one unfinished version-pinned session per learner/lab/mode.
create unique index if not exists lab_training_attempts_v014_one_open
  on public.lab_training_attempts_v014(user_id,lab_id,mode)
  where completed_at is null;
alter table public.lab_training_sets_v014 enable row level security;
alter table public.lab_training_attempts_v014 enable row level security;
revoke all on public.lab_training_sets_v014,public.lab_training_attempts_v014 from anon,authenticated;
grant all on public.lab_training_sets_v014,public.lab_training_attempts_v014 to service_role;
-- Seed ONE mathematically reviewable book-authored example, not a fabricated tape/chart.
-- Historical OHLC has NOT been independently verified using licensed data.
-- NO ANSWER KEYS ARE STORED IN THE PUBLIC GITHUB REPOSITORY.
-- Apply the separate owner-only private answer seed after this schema.


-- Per-user atomic attempt creation with concurrency-safe quota. The browser
-- cannot create an assessment merely by calling PostgREST on its own.
create or replace function public.v014_training_start(p_actor uuid,p_lab text,p_mode text)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare s record; resultrow record; uses_24h integer;
begin
 if p_actor is null or p_mode not in ('guided','practice','blind','assessment') then raise exception 'Invalid training request'; end if;
 if not public.user_has_tool_access(p_actor,'ONDEMAND_TRAINING') then raise exception 'Training entitlement required'; end if;
 if not exists(select 1 from public.profiles where id=p_actor and account_kind='member') then raise exception 'Real member account required';end if;
 select * into s from public.lab_training_sets_v014 where lab_id=p_lab and review_state='reviewed' order by version desc limit 1;
 if not found then raise exception 'Reviewed lesson not available';end if;
 perform pg_advisory_xact_lock(hashtextextended(p_actor::text,142001));
 -- Idempotent start: reusing an unfinished attempt never resets its progress.
 select * into resultrow from public.lab_training_attempts_v014
 where user_id=p_actor and lab_id=p_lab and mode=p_mode and completed_at is null
 order by created_at desc limit 1 for update;
 if found then
  return jsonb_build_object('id',resultrow.id,'lab_id',resultrow.lab_id,'mode',resultrow.mode,
    'step_index',resultrow.step_index,'set_version',resultrow.set_version,'completed_at',null,'resumed',true);
 end if;
 select count(*) into uses_24h from public.lab_training_attempts_v014 where user_id=p_actor and created_at>now()-interval '24 hours';
 if uses_24h>=40 then raise exception 'Daily practice attempt limit reached';end if;
 insert into public.lab_training_attempts_v014(user_id,lab_id,set_version,mode)
 values(p_actor,p_lab,s.version,p_mode) returning * into resultrow;
 return jsonb_build_object('id',resultrow.id,'lab_id',resultrow.lab_id,'mode',resultrow.mode,'step_index',0,'set_version',resultrow.set_version,'completed_at',null);
end;$$;
revoke all on function public.v014_training_start(uuid,text,text) from public,anon,authenticated;
grant execute on function public.v014_training_start(uuid,text,text) to service_role;

-- One SQL transaction locks the attempt, compares the NEXT answer, and advances once.
-- Client cannot skip a question, change an earlier answer or choose its own score.
create or replace function public.v014_training_answer(p_actor uuid,p_attempt uuid,p_answer text,p_expected_step integer)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare a record; s record; question jsonb; key jsonb; result_ok boolean; value_num numeric; key_num numeric; tolerance numeric; next_responses jsonb; n int; next_step int; scored int; final_report jsonb; prev jsonb;
begin
 select * into a from public.lab_training_attempts_v014 where id=p_attempt and user_id=p_actor for update;
 if not found then raise exception 'Attempt not found or unauthorized'; end if;
 if a.completed_at is not null then raise exception 'Attempt already completed'; end if;
 -- Mandatory CAS: concurrent/retried answer submissions cannot grade question N+1.
 if p_expected_step is distinct from a.step_index then raise exception 'Stale training step. Resume current attempt.'; end if;
 if not public.user_has_tool_access(p_actor,'ONDEMAND_TRAINING') then raise exception 'Training entitlement has expired'; end if;
 select * into s from public.lab_training_sets_v014 where lab_id=a.lab_id and version=a.set_version and review_state='reviewed';
 if not found then raise exception 'Reviewed answer key unavailable'; end if;
 n=jsonb_array_length(s.questions);if a.step_index>=n then raise exception 'Attempt is already at its final step';end if;
 question=s.questions->a.step_index;key=s.answer_key->(question->>'id');
 if key is null or length(trim(p_answer))=0 or length(p_answer)>600 then raise exception 'A valid response is required'; end if;
 if question->>'kind'='number' then
  if p_answer !~ '^[-+]?[0-9]{1,12}(\.[0-9]{1,8})?$' then raise exception 'Enter a numeric answer';end if;
  value_num=p_answer::numeric;key_num=(key #>> '{}')::numeric;
  tolerance=coalesce((question->>'tolerance')::numeric,0);
  result_ok=abs(value_num-key_num)<=tolerance;
 else result_ok=(upper(trim(p_answer))=upper(key #>> '{}'));
 end if;
 prev=jsonb_build_object('questionId',question->>'id','answer',trim(p_answer),'correct',result_ok);
 next_responses=a.responses||jsonb_build_array(prev);next_step=a.step_index+1;
 if next_step<n then
  update public.lab_training_attempts_v014 set responses=next_responses,step_index=next_step,updated_at=now() where id=p_attempt;
  return jsonb_build_object('ok',true,'complete',false,'correct',case when a.mode='guided' then to_jsonb(result_ok) else 'null'::jsonb end,
   'explanation',case when a.mode='guided' then to_jsonb(question->>'explanation') else 'null'::jsonb end,'stepIndex',next_step);
 end if;
 select count(*) into scored from jsonb_array_elements(next_responses) as item(answer) where (item.answer->>'correct')::boolean;
 final_report=jsonb_build_object('score',round((scored::numeric/n)*100),'correct',scored,'total',n,
  'sourceStatus',s.source_status,'note','Grade assesses authored mechanical answers, not verified historical market tape or live trading skill.',
  'details',(select jsonb_agg(jsonb_build_object('question',q->>'prompt','answer',s.answer_key->(q->>'id'),'submitted',next_responses->((ordinality-1)::integer)->>'answer','correct',next_responses->((ordinality-1)::integer)->'correct','explanation',q->>'explanation') order by ordinality) from jsonb_array_elements(s.questions) with ordinality as t(q,ordinality)));
 update public.lab_training_attempts_v014 set responses=next_responses,step_index=next_step,score=(final_report->>'score')::integer,report=final_report,completed_at=now(),updated_at=now() where id=p_attempt;
 return jsonb_build_object('ok',true,'complete',true,'report',final_report);
end;$$;
revoke all on function public.v014_training_answer(uuid,uuid,text,integer) from public,anon,authenticated;
grant execute on function public.v014_training_answer(uuid,uuid,text,integer) to service_role;


-- Atomic forum reports prevent race conditions that bypass a 10/24-hour quota.
create or replace function public.v014_community_report(
 p_actor uuid,p_type text,p_content text,p_reason text,p_details text
) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare count24 integer;
begin
 if not exists(select 1 from public.profiles where id=p_actor and account_kind='member') then raise exception 'Member account required'; end if;
 if p_type not in ('topic','post') or p_reason not in ('spam','harassment','scam','privacy','misinformation','other')
 or p_content !~ '^commons:(topic|post):[0-9]+$' or length(coalesce(p_details,''))>500 then raise exception 'Invalid report'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_actor::text,142003));
 select count(*) into count24 from public.forum_reports where reporter_user_id=p_actor and created_at>now()-interval '24 hours';
 if count24>=10 then raise exception 'Report quota reached';end if;
 if exists(select 1 from public.forum_reports where reporter_user_id=p_actor and content_id=p_content and created_at>now()-interval '24 hours') then raise exception 'Already reported';end if;
 insert into public.forum_reports(reporter_user_id,content_type,content_id,reason,details,status)
 values(p_actor,p_type,p_content,p_reason,p_details,'open');
 return jsonb_build_object('ok',true);
end;$$;
revoke all on function public.v014_community_report(uuid,text,text,text,text) from public,anon,authenticated;
grant execute on function public.v014_community_report(uuid,text,text,text,text) to service_role;

-- Grant Web Solutions: segregated *draft* client project registry. No client site
-- is published, billed, granted member access or routed to a customer domain.
create table if not exists public.gws_client_drafts_v014 (
 id uuid primary key default gen_random_uuid(),
 project_code text not null unique check(project_code ~ '^[A-Z][A-Z0-9_]{2,63}$'),
 label text not null check(length(label) between 3 and 120),
 contact_label text,
 status text not null default 'draft' check(status in ('draft','review','archived')),
 page_title text not null default 'Untitled Site',
 page_summary text not null default '',
 page_blocks jsonb not null default '[]'::jsonb check(jsonb_typeof(page_blocks)='array'),
 created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
 constraint gws_blocks_length check(pg_column_size(page_blocks)<45000)
);
alter table public.gws_client_drafts_v014 enable row level security;
revoke all on public.gws_client_drafts_v014 from public,anon,authenticated;
grant all on public.gws_client_drafts_v014 to service_role;

notify pgrst,'reload schema';
commit;
