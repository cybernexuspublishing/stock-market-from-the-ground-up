-- v0.13.5 atomic paid-order fulfillment and reversal.
-- Apply AFTER v0.13.5_FINAL_COMMERCE_ASSESSMENTS.sql.
-- Does not enable checkout or direct digital sales.
begin;
create or replace function public.apply_order_webhook_v135(
 p_intent text, p_provider_order text, p_action text,
 p_total_cents integer, p_currency text
) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare i public.checkout_intents%rowtype; o public.site_orders%rowtype;
 p public.catalog_products%rowtype; is_new boolean; lib_id bigint;
 component record; book_code text; ledger_id bigint; prior_id bigint;
 paid_record bigint; nowish timestamptz:=now();
begin
 if p_intent is null or p_provider_order !~ '^[A-Za-z0-9_-]{1,100}$'
    or p_action not in ('order_created','order_refunded') or p_total_cents<0 then
  return jsonb_build_object('ok',false,'reason','invalid');end if;
 perform pg_advisory_xact_lock(hashtextextended('v135:order:'||p_provider_order,0));
 select * into i from public.checkout_intents where intent_id=p_intent for update;
 if not found then return jsonb_build_object('ok',false,'reason','unknown_intent');end if;
 if public.is_showcase_account_v135(i.user_id) then
  return jsonb_build_object('ok',false,'reason','showcase_denied');end if;
 if i.provider<>'LEMON_SQUEEZY' or i.currency<>upper(coalesce(p_currency,'')) then
  return jsonb_build_object('ok',false,'reason','payment_mismatch');end if;
 if p_action='order_created' and i.status in ('refunded','canceled') then
  return jsonb_build_object('ok',false,'reason','intentionally_closed');end if;
 if p_action='order_created' and p_total_cents<i.amount_cents then
  return jsonb_build_object('ok',false,'reason','amount_less_than_quote');end if;
 if i.status not in ('provider_created','paid','refunded','canceled') then
  return jsonb_build_object('ok',false,'reason','bad_intent_state');end if;
 select * into o from public.site_orders where provider='LEMON_SQUEEZY' and provider_order_id=p_provider_order for update;
 if found and (o.user_id is distinct from i.user_id) then
  return jsonb_build_object('ok',false,'reason','order_user_conflict');end if;
 if not found then
  if p_action='order_refunded' then return jsonb_build_object('ok',false,'reason','unknown_order');end if;
  insert into public.site_orders(user_id,provider,provider_order_id,status,currency,subtotal_cents,total_cents,paid_at,
   metadata) values(i.user_id,'LEMON_SQUEEZY',p_provider_order,'paid',upper(p_currency),p_total_cents,
    p_total_cents,nowish,jsonb_build_object('intent',p_intent,'fulfillment','v135')) returning * into o;
 elsif p_action='order_refunded' then
  update public.site_orders set status='refunded',refunded_at=nowish where id=o.id;
 elsif o.status in ('refunded','partially_refunded') then
  return jsonb_build_object('ok',false,'reason','order_already_refunded');
 end if;
 if p_action='order_refunded' then
  update public.checkout_intents set status='canceled',updated_at=nowish where intent_id=i.intent_id;
  for component in select * from public.order_entitlement_ledger_v135
   where provider='LEMON_SQUEEZY' and provider_order_id=p_provider_order and status='active' for update loop
   if component.created_by_this_order then
    if component.entitlement_kind='book_companion' then
     delete from public.user_library where user_id=i.user_id
       and product_code=component.product_code and access_type='companion'
       and source_channel='direct_site' and source_reference=p_provider_order;
    elsif component.entitlement_kind='plan' then
     update public.user_plan_grants set status='canceled',updated_at=nowish
      where user_id=i.user_id and plan_code=component.product_code and source='payment_webhook'
        and source_reference=p_provider_order and status in ('active','trialing');
    end if;
   end if;
   update public.order_entitlement_ledger_v135 set status='refunded',revoked_at=nowish where id=component.id;
  end loop;
  return jsonb_build_object('ok',true,'action','refunded','orderId',o.id);
 end if;
 if i.status='paid' then return jsonb_build_object('ok',true,'action','already_paid','orderId',o.id);end if;
 insert into public.site_order_items(order_id,product_code,description,quantity,unit_price_cents,total_cents)
 values(o.id,i.item_code,i.item_code,1,i.amount_cents,i.amount_cents)
 on conflict do nothing;
 if i.item_type='plan' and i.item_code='LIFETIME' then
   select exists(select 1 from public.user_plan_grants where user_id=i.user_id
    and plan_code='LIFETIME' and status in ('active','trialing') and (ends_at is null or ends_at>now())) into is_new;
   if not is_new then
    insert into public.user_plan_grants(user_id,plan_code,status,starts_at,source,source_reference,metadata)
    values(i.user_id,'LIFETIME','active',nowish,'payment_webhook',p_provider_order,
     jsonb_build_object('provider','LEMON_SQUEEZY','intent',p_intent));end if;
   insert into public.order_entitlement_ledger_v135(provider_order_id,user_id,product_code,entitlement_kind,created_by_this_order)
    values(p_provider_order,i.user_id,'LIFETIME','plan',not is_new) on conflict do nothing;
 elsif i.item_type in ('book','bundle') then
   select * into p from public.catalog_products where product_code=i.item_code;
   if not found or p.website_checkout_enabled is distinct from true then
    raise exception 'Book or bundle is not authorized for website checkout';end if;
   -- Customers only receive digital delivery when KDP Select constraints permit.
   if coalesce(i.metadata->>'format','')='digital' then
    if p.kdp_select or p.direct_digital_enabled is distinct from true then
      raise exception 'Digital commerce disabled or KDP Select exclusivity is active';end if;
   elsif coalesce(i.metadata->>'format','') in ('paperback','hardcover') then
    if p.direct_physical_enabled is distinct from true then
      raise exception 'Physical fulfillment is not enabled';end if;
   else raise exception 'Checkout intent is missing authorized book format';end if;
   for component in
    (select i.item_code as code where i.item_type='book'
     union all
     select bc.book_code as code from public.book_bundle_components_v135 bc
      where i.item_type='bundle' and bc.bundle_code=i.item_code)
   loop
    if i.item_type='bundle' and coalesce(i.metadata->>'format','')='digital' and
      exists(select 1 from public.catalog_products cp where cp.product_code=component.code and cp.kdp_select)
    then raise exception 'Bundle digital delivery is prohibited during a component KDP Select term';end if;
    select id into prior_id from public.user_library where user_id=i.user_id
       and product_code=component.code and access_type='companion'
       and (expires_at is null or expires_at>now()) limit 1;
    if prior_id is null then
     insert into public.user_library(user_id,product_code,access_type,source_channel,source_reference,metadata)
     values(i.user_id,component.code,'companion','direct_site',p_provider_order,
      jsonb_build_object('checkoutIntent',p_intent,'format',i.metadata->>'format'))
     on conflict(user_id,product_code,access_type) do update
      set expires_at=null,source_channel='direct_site',source_reference=excluded.source_reference,
        metadata=public.user_library.metadata||excluded.metadata
      where public.user_library.expires_at is not null and public.user_library.expires_at<=now();
    end if;
    insert into public.order_entitlement_ledger_v135(provider_order_id,user_id,product_code,entitlement_kind,created_by_this_order)
    values(p_provider_order,i.user_id,component.code,'book_companion',prior_id is null)
    on conflict do nothing;
    prior_id:=null;
   end loop;
 end if;
 update public.checkout_intents set status='paid',updated_at=nowish where intent_id=i.intent_id;
 return jsonb_build_object('ok',true,'action','paid','orderId',o.id);
end;$$;
revoke all on function public.apply_order_webhook_v135(text,text,text,integer,text) from public,anon,authenticated;
grant execute on function public.apply_order_webhook_v135(text,text,text,integer,text) to service_role;
notify pgrst,'reload schema';
commit;
