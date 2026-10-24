-- The Stock Market: From the Ground Up | Crownlight Sparks admin balance management
-- Depends on v0.14.0.163_QUESTION_PASS_LEDGER_OWNER_REVIEW_REQUIRED.sql.
-- SOURCE ONLY: a licensed Supabase owner must review, back up, apply and verify.
-- This migration grants no Sparks and creates no Stripe product.
begin;
alter table public.groundup_question_pass_buckets
 drop constraint if exists groundup_question_pass_buckets_source_check;
alter table public.groundup_question_pass_buckets
 add constraint groundup_question_pass_buckets_source_check
 check (source in ('included','purchased','manual'));

alter table public.groundup_question_pass_buckets
 drop constraint if exists groundup_qp_expiration_policy;
alter table public.groundup_question_pass_buckets
 add constraint groundup_qp_expiration_policy check (
  (source in ('purchased','manual') and billing_period_ends_at is null and expires_at is null)
  or (source='included' and billing_period_ends_at is not null and expires_at is not null
   and expires_at = billing_period_ends_at + interval '60 days')
 );

create table if not exists public.groundup_question_pass_adjustments (
 id uuid primary key default gen_random_uuid(),
 actor_user_id uuid not null references auth.users(id) on delete restrict,
 user_id uuid not null references auth.users(id) on delete restrict,
 request_id uuid not null,
 operation text not null check (operation in ('add','remove','set')),
 requested_value integer not null check (requested_value>=0 and requested_value<=100000),
 delta integer not null,
 previous_available integer not null check (previous_available>=0),
 resulting_available integer not null check (resulting_available>=0),
 reason text not null check (char_length(reason) between 10 and 500),
 created_at timestamptz not null default now(),
 unique(actor_user_id,request_id)
);
create index if not exists idx_groundup_qp_adjustment_member
 on public.groundup_question_pass_adjustments (user_id,created_at desc);
alter table public.groundup_question_pass_adjustments enable row level security;
revoke all on public.groundup_question_pass_adjustments from public,anon,authenticated;
grant select,insert on public.groundup_question_pass_adjustments to service_role;

create or replace function public.groundup_question_pass_adjust(
 p_actor_id uuid,p_user_id uuid,p_operation text,p_value integer,
 p_reason text,p_request_id uuid
) returns jsonb language plpgsql volatile security definer set search_path=public,pg_temp
as $$
declare v_previous integer;v_delta integer;v_remaining integer;v_take integer;
 v_row record;v_existing record;v_balance jsonb;
begin
 if p_actor_id is null or p_user_id is null or p_request_id is null
  or p_actor_id=p_user_id or p_operation is null or p_operation not in ('add','remove','set')
  or p_value is null or p_value<0 or p_value>100000
  or (p_operation in ('add','remove') and p_value=0)
  or char_length(btrim(coalesce(p_reason,''))) not between 10 and 500 then
  return jsonb_build_object('ok',false,'error','Invalid adjustment request');
 end if;
 -- Same user-level lock used by the Reveal/Skip spender, preventing
 -- simultaneous owner changes and learner spends from corrupting totals.
 perform pg_advisory_xact_lock(hashtextextended(p_user_id::text,489301));
 select * into v_existing
  from public.groundup_question_pass_adjustments
  where actor_user_id=p_actor_id and request_id=p_request_id;
 if found then
  if v_existing.user_id<>p_user_id or v_existing.operation<>p_operation
   or v_existing.requested_value<>p_value or v_existing.reason<>btrim(p_reason) then
   return jsonb_build_object('ok',false,'error','Adjustment ID belongs to another request');
  end if;
  return jsonb_build_object('ok',true,'alreadyApplied',true,
   'balance',public.groundup_question_pass_summary(p_user_id));
 end if;
 select coalesce(sum(remaining_credits),0)::integer into v_previous
 from public.groundup_question_pass_buckets
 where user_id=p_user_id and remaining_credits>0
 and (expires_at is null or expires_at>clock_timestamp());
 v_delta:=case p_operation when 'add' then p_value when 'remove' then -p_value
  else p_value-v_previous end;
 if v_delta < 0 and -v_delta>v_previous then
  return jsonb_build_object('ok',false,'error','Cannot remove more available Sparks than the member owns');
 end if;
 if v_delta>0 then
  -- Owner-issued Sparks have their own provenance; purchased and billing
  -- allocations are NEVER rewritten to falsely appear as manual purchases.
  insert into public.groundup_question_pass_buckets
   (user_id,source,origin_key,initial_credits,remaining_credits)
  values(p_user_id,'manual','owner-adjustment:'||p_request_id,v_delta,v_delta);
 elsif v_delta<0 then
  v_remaining:=-v_delta;
  for v_row in
   select id,remaining_credits from public.groundup_question_pass_buckets
    where user_id=p_user_id and remaining_credits>0
    and (expires_at is null or expires_at>clock_timestamp())
    order by case source when 'manual' then 0 when 'included' then 1 else 2 end,
     expires_at asc nulls last,issued_at,id
    for update
  loop
   v_take:=least(v_row.remaining_credits,v_remaining);
   update public.groundup_question_pass_buckets
    set remaining_credits=remaining_credits-v_take where id=v_row.id;
   v_remaining:=v_remaining-v_take;
   exit when v_remaining=0;
  end loop;
  if v_remaining<>0 then raise exception 'Spark adjustment could not be completed atomically';end if;
 end if;
 insert into public.groundup_question_pass_adjustments
  (actor_user_id,user_id,request_id,operation,requested_value,delta,
   previous_available,resulting_available,reason)
 values(p_actor_id,p_user_id,p_request_id,p_operation,p_value,v_delta,
  v_previous,v_previous+v_delta,btrim(p_reason));
 insert into public.admin_audit_log
  (actor_user_id,action,target_type,target_id,details)
 values(p_actor_id,'learning.lantern_sparks.adjust','user',p_user_id,
  jsonb_build_object('operation',p_operation,'requestedValue',p_value,
  'delta',v_delta,'before',v_previous,'after',v_previous+v_delta,
  'requestId',p_request_id,'reason',btrim(p_reason)));
 v_balance:=public.groundup_question_pass_summary(p_user_id);
 return jsonb_build_object('ok',true,'alreadyApplied',false,
   'delta',v_delta,'balance',v_balance);
end $$;
revoke all on function public.groundup_question_pass_adjust(uuid,uuid,text,integer,text,uuid)
 from public,anon,authenticated;
grant execute on function public.groundup_question_pass_adjust(uuid,uuid,text,integer,text,uuid)
 to service_role;

-- Updated wallet summary includes independently sourced manual Sparks.
create or replace function public.groundup_question_pass_summary(p_user_id uuid)
returns jsonb language plpgsql stable security definer set search_path=public,pg_temp
as $$
declare vi integer;vp integer;vm integer;ve timestamptz;
begin
 if p_user_id is null then raise exception 'Invalid member' using errcode='22023';end if;
 select
  coalesce(sum(remaining_credits) filter(where source='included'),0)::integer,
  coalesce(sum(remaining_credits) filter(where source='purchased'),0)::integer,
  coalesce(sum(remaining_credits) filter(where source='manual'),0)::integer,
  min(expires_at) filter(where source='included')
 into vi,vp,vm,ve
 from public.groundup_question_pass_buckets
 where user_id=p_user_id and remaining_credits>0
  and (expires_at is null or expires_at>now());
 return jsonb_build_object('included',vi,'purchased',vp,'manual',vm,
  'available',vi+vp+vm,'nextExpiry',ve);
end $$;
revoke all on function public.groundup_question_pass_summary(uuid) from public,anon,authenticated;
grant execute on function public.groundup_question_pass_summary(uuid) to service_role;
commit;
