-- SMFGU direct advertising: signed LIVE Stripe invoice settlement / reversal.
-- Only the service role can invoke the verifier, AFTER Stripe signature + account +
-- provider retrieval checks. No browser, anon, or authenticated client can grant a payment.
create table if not exists public.gu_ad_live_event_log_v1 (
 event_id text primary key check (event_id ~ '^evt_[A-Za-z0-9_]{6,}$'),
 campaign_id bigint not null references public.ad_campaigns(id),
 invoice_ref text not null check (invoice_ref ~ '^in_[A-Za-z0-9_]{6,}$'),
 event_type text not null check (event_type in ('invoice.paid','charge.refunded','charge.dispute.created')),
 recorded_at timestamptz not null default now()
);
create index if not exists gu_ad_live_event_log_campaign_v1
 on public.gu_ad_live_event_log_v1(campaign_id, recorded_at desc);
alter table public.gu_ad_live_event_log_v1 enable row level security;
revoke all on public.gu_ad_live_event_log_v1 from public,anon,authenticated;
grant select,insert on public.gu_ad_live_event_log_v1 to service_role;
create or replace function public.gu_ad_signed_live_apply_v1(
 p_event text,p_campaign bigint,p_invoice text,p_type text,
 p_amount integer,p_customer text
) returns jsonb language plpgsql security definer
 set search_path=pg_catalog,pg_temp as $fn$
declare c public.ad_campaigns%rowtype;
begin
 if p_event !~ '^evt_[A-Za-z0-9_]{6,}$'
    or p_invoice !~ '^in_[A-Za-z0-9_]{6,}$'
    or p_customer !~ '^cus_[A-Za-z0-9_]{6,}$'
    or p_type not in ('invoice.paid','charge.refunded','charge.dispute.created')
    or p_amount is null or p_amount<0
 then return jsonb_build_object('ok',false,'reason','INVALID_SIGNED_EVENT'); end if;
 perform pg_advisory_xact_lock(20261031,301);
 select * into c from public.ad_campaigns where id=p_campaign for update;
 if not found or c.amount_cents<100 or c.stripe_invoice_id is distinct from p_invoice
    or c.stripe_customer_id is distinct from p_customer
    or c.approval_state<>'approved' or c.approved_by is null
    or not exists(select 1 from public.admin_user_roles r
      where r.user_id=c.approved_by and r.role_code='OWNER')
 then return jsonb_build_object('ok',false,'reason','INVOICE_CAMPAIGN_OWNER_BINDING_MISMATCH'); end if;
 if exists(select 1 from public.gu_ad_live_event_log_v1 where event_id=p_event)
 then return jsonb_build_object('ok',true,'replayed',true,'campaignId',c.id);end if;
 if p_type='invoice.paid' then
  if p_amount<c.amount_cents then return jsonb_build_object('ok',false,'reason','UNDERPAID');end if;
  if c.payment_state in ('refunded','disputed') then
   return jsonb_build_object('ok',false,'reason','REVERSED_INVOICE_CANNOT_RESTORE');end if;
  insert into public.gu_ad_order_evidence_v014226
   (campaign_id,invoice_ref,provider,expected_amount_cents,paid_amount_cents,
    verified_by,payment_mode,state)
   values(c.id,p_invoice,'stripe',c.amount_cents,p_amount,c.approved_by,'live','verified_paid')
   on conflict(invoice_ref) do nothing;
  if not exists(select 1 from public.gu_ad_order_evidence_v014226
   where invoice_ref=p_invoice and campaign_id=c.id
    and state='verified_paid' and payment_mode='live')
  then return jsonb_build_object('ok',false,'reason','INVOICE_EVIDENCE_CONFLICT'); end if;
  update public.ad_campaigns set payment_state='verified_paid',
   last_verified_invoice=p_invoice,updated_at=now()
   where id=c.id and payment_state in ('unpaid','verified_paid');
 else
  -- Any validated partial refund or new dispute pauses serving. Conservative.
  update public.gu_ad_order_evidence_v014226
   set state=case when p_type='charge.refunded' then 'refunded' else 'disputed' end
   where campaign_id=c.id and invoice_ref=p_invoice and state='verified_paid';
  update public.ad_campaigns set
   payment_state=case when p_type='charge.refunded' and c.payment_state<>'disputed'
     then 'refunded' else 'disputed' end,
   status=case when status in ('active','scheduled') then 'paused' else status end,
   updated_at=now() where id=c.id;
 end if;
 insert into public.gu_ad_live_event_log_v1(event_id,campaign_id,invoice_ref,event_type)
 values(p_event,c.id,p_invoice,p_type);
 return jsonb_build_object('ok',true,'replayed',false,'campaignId',c.id,
  'paymentState',(select payment_state from public.ad_campaigns where id=c.id),
  'published',false);
end $fn$;
revoke all on function public.gu_ad_signed_live_apply_v1(text,bigint,text,text,integer,text)
 from public,anon,authenticated;
grant execute on function public.gu_ad_signed_live_apply_v1(text,bigint,text,text,integer,text) to service_role;
