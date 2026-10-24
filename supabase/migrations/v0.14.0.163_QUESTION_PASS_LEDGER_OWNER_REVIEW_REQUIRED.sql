-- The Stock Market: From the Ground Up | D11 learning credits
-- Owner review required before execution. NO credit grants, payments, or
-- production ledger migration are executed by this source-only commit.
-- Free explanations/retries NEVER spend a Question Pass.
begin;
create table if not exists public.groundup_question_pass_buckets (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 source text not null check (source in ('included','purchased')),
 origin_key text not null,
 initial_credits integer not null check (initial_credits >= 1),
 remaining_credits integer not null check (remaining_credits >= 0 and remaining_credits <= initial_credits),
 issued_at timestamptz not null default now(),
 billing_period_ends_at timestamptz,
 expires_at timestamptz,
 created_at timestamptz not null default now(),
 constraint groundup_qp_unique_origin unique (user_id,origin_key),
 constraint groundup_qp_expiration_policy check (
  (source='purchased' and billing_period_ends_at is null and expires_at is null)
  or (source='included' and billing_period_ends_at is not null
    and expires_at = billing_period_ends_at + interval '60 days')
 )
);
create index if not exists idx_groundup_qp_available
 on public.groundup_question_pass_buckets(user_id,source,expires_at)
 where remaining_credits>0;

create table if not exists public.groundup_question_pass_spends (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 bucket_id uuid not null references public.groundup_question_pass_buckets(id),
 request_id uuid not null,
 attempt_id uuid not null,
 lab_id text not null,
 question_id text not null,
 action text not null check (action in ('reveal','skip')),
 spent_at timestamptz not null default now(),
 constraint groundup_qp_once_per_request unique (user_id,request_id),
 constraint groundup_qp_once_per_question unique (user_id,attempt_id,lab_id,question_id)
);
create index if not exists idx_groundup_qp_spends_user
 on public.groundup_question_pass_spends(user_id,spent_at desc);

alter table public.groundup_question_pass_buckets enable row level security;
alter table public.groundup_question_pass_spends enable row level security;
revoke all on public.groundup_question_pass_buckets from public,anon,authenticated;
revoke all on public.groundup_question_pass_spends from public,anon,authenticated;
grant select,insert,update,delete on public.groundup_question_pass_buckets to service_role;
grant select,insert on public.groundup_question_pass_spends to service_role;

create or replace function public.groundup_question_pass_summary(p_user_id uuid)
returns jsonb language plpgsql stable security definer set search_path=public,pg_temp
as $$
declare v_included integer; v_purchased integer; v_next_expiry timestamptz;
begin
 if p_user_id is null then raise exception 'Invalid member' using errcode='22023';end if;
 select
  coalesce(sum(remaining_credits) filter(where source='included'),0)::integer,
  coalesce(sum(remaining_credits) filter(where source='purchased'),0)::integer,
  min(expires_at) filter(where source='included')
 into v_included,v_purchased,v_next_expiry
 from public.groundup_question_pass_buckets
 where user_id=p_user_id and remaining_credits>0
  and (expires_at is null or expires_at>now());
 return jsonb_build_object('included',v_included,'purchased',v_purchased,
  'available',v_included+v_purchased,'nextExpiry',v_next_expiry);
end $$;

create or replace function public.groundup_question_pass_spend(
 p_user_id uuid,p_attempt_id uuid,p_lab_id text,p_question_id text,
 p_action text,p_request_id uuid
) returns jsonb language plpgsql volatile security definer set search_path=public,pg_temp
as $$
declare v_existing public.groundup_question_pass_spends%rowtype;
 v_bucket public.groundup_question_pass_buckets%rowtype;
 v_balance jsonb;
begin
 if p_user_id is null or p_attempt_id is null or p_request_id is null
  or p_lab_id !~ '^F[23]-C[0-9]{2}-L[0-9]{2}$'
  or p_question_id not in ('body','range','percent','dollars','shares','vwap')
  or p_action not in ('reveal','skip') then
  return jsonb_build_object('ok',false,'error','Invalid credit request');
 end if;
 -- Serializes all spends per user, even if simultaneous tabs, and makes
 -- repeated requests safe (a browser retry must not spend twice).
 perform pg_advisory_xact_lock(hashtextextended(p_user_id::text,489301));
 select * into v_existing from public.groundup_question_pass_spends
  where user_id=p_user_id and
   (request_id=p_request_id or
   (attempt_id=p_attempt_id and lab_id=p_lab_id and question_id=p_question_id))
  order by spent_at limit 1;
 if found then
  if v_existing.action<>p_action then
   return jsonb_build_object('ok',false,'error','This question already used a different pass action');
  end if;
  return jsonb_build_object('ok',true,'alreadyUsed',true,'action',v_existing.action,
   'balance',public.groundup_question_pass_summary(p_user_id));
 end if;
 select * into v_bucket from public.groundup_question_pass_buckets
  where user_id=p_user_id and remaining_credits>0
   and (expires_at is null or expires_at>clock_timestamp())
  order by case when source='included' then 0 else 1 end,
   expires_at asc nulls last,issued_at,id
  for update limit 1;
 if not found then
  return jsonb_build_object('ok',false,'error','No Question Pass Credits available',
   'balance',public.groundup_question_pass_summary(p_user_id));
 end if;
 update public.groundup_question_pass_buckets
  set remaining_credits=remaining_credits-1 where id=v_bucket.id;
 insert into public.groundup_question_pass_spends
  (user_id,bucket_id,request_id,attempt_id,lab_id,question_id,action)
  values(p_user_id,v_bucket.id,p_request_id,p_attempt_id,p_lab_id,p_question_id,p_action);
 v_balance:=public.groundup_question_pass_summary(p_user_id);
 return jsonb_build_object('ok',true,'alreadyUsed',false,'action',p_action,
  'balance',v_balance);
end $$;

revoke all on function public.groundup_question_pass_summary(uuid) from public,anon,authenticated;
revoke all on function public.groundup_question_pass_spend(uuid,uuid,text,text,text,uuid)
 from public,anon,authenticated;
grant execute on function public.groundup_question_pass_summary(uuid) to service_role;
grant execute on function public.groundup_question_pass_spend(uuid,uuid,text,text,text,uuid)
 to service_role;
commit;

-- GRANT POLICY (NOT EXECUTED): Included allocations must originate in an
-- independently reconciled billing-period event; create one bucket per unique
-- originating billing period with expires_at=period_end + interval '60 days'.
-- Purchased allocations require a verified paid order and unique origin_key.
-- Counts/prices are intentionally NOT assumed or granted by this migration.
