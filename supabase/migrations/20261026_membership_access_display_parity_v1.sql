-- Access-summary alignment only; fixes stale marketing/Account access status.
-- No grants, Stripe, customer profiles, or checkout settings changed.
BEGIN;
DO $guard$
BEGIN
 IF md5(pg_get_functiondef('public.my_platform_access_before_v135()'::regprocedure))<>'86c9def09a479ad351f6b867c9b86f43'
 THEN RAISE EXCEPTION 'MEMBERSHIP_ACCESS_DISPLAY_FUNCTION_DRIFT'; END IF;
 IF has_function_privilege('anon','public.my_platform_access_before_v135()','EXECUTE')
 OR has_function_privilege('authenticated','public.my_platform_access_before_v135()','EXECUTE')
 THEN RAISE EXCEPTION 'LEGACY_ACCESS_HELPER_EXPOSED'; END IF;
END $guard$;
CREATE OR REPLACE FUNCTION public.my_platform_access_before_v135()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_uid uuid := auth.uid();
  v_staff_roles text[] := array[]::text[];
  v_selected_plan text := 'FREE';
  v_selected_plan_name text := 'Free Membership';
  v_renewal_at timestamptz := null;
  v_starts_at timestamptz := null;
  v_expires_at timestamptz := null;
  v_ad_free boolean := false;
  v_has_all_tools boolean := false;
  v_has_all_books boolean := false;
  v_legacy_full boolean := false;
  v_is_owner boolean := false;
  v_control_panel boolean := false;
  v_tools jsonb := '[]'::jsonb;
  v_books jsonb := '[]'::jsonb;
  v_passes jsonb := '[]'::jsonb;
  v_accessrow record;
begin
  if v_uid is null then
    return jsonb_build_object(
      'authenticated',false,'planCode','FREE','planName','Free Membership',
      'staffRoles',v_staff_roles,'controlPanel',false,'adFree',false,
      'tools','[]'::jsonb,'books','[]'::jsonb,'toolPasses','[]'::jsonb
    );
  end if;

  -- Prevent stale plan labels and paid inclusion flags on restricted accounts.
  if not exists(select 1 from public.profiles p where p.id=v_uid
       and p.account_kind='member' and p.deleted_at is null)
    or exists(select 1 from public.admin_user_flags f where f.user_id=v_uid
       and lower(f.status) in ('restricted','suspended')) then
    return jsonb_build_object(
      'authenticated',true,'planCode','FREE','planName','Free Membership',
      'staffRoles','[]'::jsonb,'controlPanel',false,'adFree',false,
      'allTools',false,'allBooks',false,
      'tools','[]'::jsonb,'books','[]'::jsonb,'toolPasses','[]'::jsonb,
      'startsAt',null,'renewsAt',null,'expiresAt',null
    );
  end if;

  select coalesce(array_agg(distinct aur.role_code) filter(where aur.role_code is not null),array[]::text[])
    into v_staff_roles
    from public.admin_user_roles aur
    where aur.user_id=v_uid and (aur.expires_at is null or aur.expires_at>now());

  v_is_owner := 'OWNER'=any(v_staff_roles);

  select exists(
    select 1
    from public.admin_user_roles aur
    join public.admin_role_permissions arp on arp.role_code=aur.role_code
    where aur.user_id=v_uid
      and (aur.expires_at is null or aur.expires_at>now())
      and arp.permission_code='control_panel.access'
  ) into v_control_panel;

  if v_is_owner then
    v_selected_plan:='LIFETIME';
    v_selected_plan_name:='Lifetime Membership';
    v_ad_free:=true;
    v_has_all_tools:=true;
    v_has_all_books:=true;
  else
    select z.* into v_accessrow
    from (
      select
        g.plan_code,
        p.name,
        p.ad_free,
        p.includes_all_tools,
        p.includes_all_books,
        g.starts_at,
        null::timestamptz as renews_at,
        g.ends_at as plan_expires_at,
        'admin_grant'::text as source_kind,
        case when g.ends_at is null then 0 else 1 end as source_rank
      from public.user_plan_grants g
      join public.platform_plans p on p.plan_code=g.plan_code
      where g.user_id=v_uid and p.active=true
        and g.status in ('trialing','active')
        and g.starts_at<=now()
        and (g.ends_at is null or g.ends_at>now())

      union all

      select
        s.plan_code,
        p.name,
        p.ad_free,
        p.includes_all_tools,
        p.includes_all_books,
        s.created_at as starts_at,
        s.current_period_end as renews_at,
        null::timestamptz as plan_expires_at,
        'subscription'::text as source_kind,
        1 as source_rank
      from public.site_subscriptions s
      join public.platform_plans p on p.plan_code=s.plan_code
      where s.user_id=v_uid and p.active=true
        and s.status in ('trialing','active')
        and ((p.billing_interval='lifetime' and s.current_period_end is null) or (s.current_period_end is not null and s.current_period_end>now()))
    ) z
    order by
      case z.plan_code
        when 'LIFETIME' then 1
        when 'FULL_ANNUAL' then 2
        when 'FULL_MONTHLY' then 3
        when 'PICK_WHAT_YOU_WANT' then 4
        when 'FREE' then 10
        else 8
      end,
      z.source_rank,
      coalesce(z.plan_expires_at,z.renews_at,'infinity'::timestamptz) desc,
      z.starts_at desc
    limit 1;

    if v_accessrow.plan_code is not null then
      v_selected_plan:=v_accessrow.plan_code;
      v_selected_plan_name:=v_accessrow.name;
      v_starts_at:=v_accessrow.starts_at;
      v_renewal_at:=v_accessrow.renews_at;
      v_expires_at:=v_accessrow.plan_expires_at;
      v_ad_free:=v_accessrow.ad_free;
      v_has_all_tools:=v_accessrow.includes_all_tools;
      v_has_all_books:=v_accessrow.includes_all_books;
    else
      select exists(
        select 1 from public.entitlements e
        where e.user_id=v_uid
          and e.product_key='full_learning_access'
          and e.status in ('active','trialing')
          and (e.starts_at is null or e.starts_at<=now())
          and (e.ends_at is null or e.ends_at>now())
      ) into v_legacy_full;

      if v_legacy_full then
        v_selected_plan:='BOOK_TRIAL';
        v_selected_plan_name:='Trial Membership';
        v_has_all_tools:=true;
        select min(e.starts_at),max(e.ends_at)
          into v_starts_at,v_expires_at
          from public.entitlements e
          where e.user_id=v_uid
            and e.product_key='full_learning_access'
            and e.status in ('active','trialing')
            and (e.ends_at is null or e.ends_at>now());
      end if;
    end if;
  end if;

  select coalesce(jsonb_agg(q.x order by q.x->>'name'),'[]'::jsonb) into v_passes
  from (
    select jsonb_build_object(
      'toolCode',t.tool_code,'name',t.name,'href',t.href,'status',up.status,
      'startsAt',up.starts_at,'renewsAt',up.current_period_end,'expiresAt',up.ends_at,
      'cancelAtPeriodEnd',up.cancel_at_period_end
    ) as x
    from public.user_tool_passes up
    join public.platform_tools t on t.tool_code=up.tool_code
    where up.user_id=v_uid
      and up.status in ('trialing','active')
      and up.starts_at<=now()
      and (up.ends_at is null or up.ends_at>now()) and (up.current_period_end is null or up.current_period_end>now()) and (up.provider is null or up.ends_at is not null or up.current_period_end is not null)
  ) q;

  if v_selected_plan='FREE' and jsonb_array_length(v_passes)>0 then
    v_selected_plan:='PICK_WHAT_YOU_WANT';
    v_selected_plan_name:='Pick What You Want Membership';
    v_ad_free:=false;
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'toolCode',t.tool_code,'name',t.name,'category',t.category,'href',t.href,'status',t.status,
    'description',t.description,
    'included',
      public.user_has_tool_access(v_uid,t.tool_code),
    'freePreview',t.free_preview,'individualPriceCents',t.individual_price_cents
  ) order by t.sort_order),'[]'::jsonb) into v_tools
  from public.platform_tools t
  where t.active=true and t.public_visible=true;

  select coalesce(jsonb_agg(jsonb_build_object(
    'productCode',c.product_code,'title',c.title,'shortTitle',c.short_title,'family',c.family,
    'publicationStatus',c.publication_status,
    'included',v_has_all_books or exists(
      select 1 from public.user_library ul
      where ul.user_id=v_uid and ul.product_code=c.product_code
        and (ul.expires_at is null or ul.expires_at>now())
    ),
    'source',case when v_has_all_books then 'membership' else (
      select ul.source_channel from public.user_library ul
      where ul.user_id=v_uid and ul.product_code=c.product_code
        and (ul.expires_at is null or ul.expires_at>now())
      order by ul.granted_at desc limit 1
    ) end
  ) order by c.sort_order),'[]'::jsonb) into v_books
  from public.catalog_products c
  where c.active=true and c.product_type='book';

  return jsonb_build_object(
    'authenticated',true,'planCode',v_selected_plan,'planName',v_selected_plan_name,
    'startsAt',v_starts_at,'renewsAt',v_renewal_at,'expiresAt',v_expires_at,'adFree',v_ad_free,
    'controlPanel',v_control_panel,'allTools',v_has_all_tools,'allBooks',v_has_all_books,
    'staffRoles',v_staff_roles,'toolPasses',v_passes,'tools',v_tools,'books',v_books
  );
end;$function$;

REVOKE ALL ON FUNCTION public.my_platform_access_before_v135() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.my_platform_access_before_v135() TO service_role;
DO $postflight$
BEGIN
 IF strpos(pg_get_functiondef('public.my_platform_access_before_v135()'::regprocedure),'public.user_has_tool_access(v_uid,t.tool_code)')=0
  OR strpos(pg_get_functiondef('public.my_platform_access_before_v135()'::regprocedure),'p.active=true')=0
  OR has_function_privilege('anon','public.my_platform_access_before_v135()','EXECUTE')
  OR has_function_privilege('authenticated','public.my_platform_access_before_v135()','EXECUTE')
 THEN RAISE EXCEPTION 'DISPLAY_ENTITLEMENT_PARITY_POSTFLIGHT_FAILED'; END IF;
END $postflight$;
INSERT INTO public.admin_audit_log(action,target_type,target_id,details)
VALUES('membership_access_display_parity_v1','membership_access','ACCOUNT_SUMMARY',
 jsonb_build_object('no_live_payments',true,'no_member_grant_changes',true,
 'affected_function','my_platform_access_before_v135',
 'policy','Account display uses central tool resolver; active plans and actual billing terms only.'));
COMMIT;
