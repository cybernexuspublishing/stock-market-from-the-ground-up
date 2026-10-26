\set ON_ERROR_STOP on
-- Isolated PG16 regression for the ACTUAL production migration. No user data.
CREATE TABLE public.platform_plans(plan_code text PRIMARY KEY,price_cents integer,
 billing_interval text,includes_all_tools boolean);
CREATE TABLE public.user_plan_grants(user_id uuid,plan_code text,status text,starts_at timestamptz,ends_at timestamptz);
CREATE TABLE public.site_subscriptions(user_id uuid,plan_code text,status text,current_period_end timestamptz);
CREATE TABLE public.admin_user_roles(user_id uuid,role_code text,expires_at timestamptz);
CREATE TABLE public.admin_user_flags(user_id uuid,status text);
CREATE TABLE public.profiles(id uuid PRIMARY KEY,account_kind text,deleted_at timestamptz);
CREATE TABLE public.entitlements(user_id uuid,product_key text,status text,ends_at timestamptz);
CREATE TABLE public.user_tool_passes(user_id uuid,tool_code text,status text,current_period_end timestamptz,ends_at timestamptz);
CREATE TABLE public.admin_audit_log(action text,target_type text,target_id text,details jsonb);
INSERT INTO public.platform_plans VALUES
('ONDEMAND_MONTHLY',1999,'month',false),('FULL_MONTHLY',6999,'month',true);
CREATE OR REPLACE FUNCTION public.user_has_tool_access(target_user uuid,target_tool text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
declare info jsonb;begin
  if target_user is null then return false; end if;
  if exists(select 1 from public.admin_user_roles where user_id=target_user and role_code='OWNER' and (expires_at is null or expires_at>now())) then return true; end if;
  if exists(select 1 from public.user_plan_grants g join public.platform_plans p on p.plan_code=g.plan_code where g.user_id=target_user and g.status in ('active','trialing') and g.starts_at<=now() and (g.ends_at is null or g.ends_at>now()) and p.includes_all_tools=true) then return true; end if;
  if exists(select 1 from public.site_subscriptions s join public.platform_plans p on p.plan_code=s.plan_code where s.user_id=target_user and s.status in ('active','trialing') and (s.current_period_end is null or s.current_period_end>now()) and p.includes_all_tools=true) then return true; end if;
  if exists(select 1 from public.entitlements e where e.user_id=target_user and e.product_key='full_learning_access' and e.status in ('active','trialing') and (e.ends_at is null or e.ends_at>now())) then return true; end if;
  if exists(select 1 from public.user_tool_passes up where up.user_id=target_user and up.tool_code=target_tool and up.status in ('active','trialing') and (coalesce(up.current_period_end,up.ends_at) is null or coalesce(up.current_period_end,up.ends_at)>now())) then return true; end if;
  return false;
end;$function$;
-- Three simulated real members and a synthetic Showcase account.
INSERT INTO public.profiles(id,account_kind)
VALUES('11111111-1111-4111-8111-111111111111','member'),
 ('22222222-2222-4222-8222-222222222222','member'),
 ('33333333-3333-4333-8333-333333333333','member'),
 ('44444444-4444-4444-8444-444444444444','member');
-- Before the new migration, a valid $19.99 plan does NOT authorize the product.
INSERT INTO public.user_plan_grants VALUES
 ('11111111-1111-4111-8111-111111111111','ONDEMAND_MONTHLY','active',now()-interval '1 hour',now()+interval '10 days'),
 ('22222222-2222-4222-8222-222222222222','ONDEMAND_MONTHLY','active',now()-interval '20 days',now()-interval '1 second'),
 ('33333333-3333-4333-8333-333333333333','FULL_MONTHLY','active',now()-interval '2 days',now()+interval '10 days'),
 ('44444444-4444-4444-8444-444444444444','ONDEMAND_MONTHLY','active',now()-interval '1 day',now()+interval '10 days');
INSERT INTO public.admin_user_roles VALUES ('44444444-4444-4444-8444-444444444444','SHOWCASE_VIEWER',NULL);
DO $$
BEGIN
 IF public.user_has_tool_access('11111111-1111-4111-8111-111111111111','ONDEMAND_TRAINING')
 THEN RAISE EXCEPTION 'Legacy function should reproduce known missing-plan defect'; END IF;
END $$;
\i supabase/migrations/20261026_training_membership_entitlement_fix.sql
DO $$
DECLARE member uuid:='11111111-1111-4111-8111-111111111111';
 expired uuid:='22222222-2222-4222-8222-222222222222';
 full_member uuid:='33333333-3333-4333-8333-333333333333';
 showcase uuid:='44444444-4444-4444-8444-444444444444';
BEGIN
 IF NOT public.user_has_tool_access(member,'ONDEMAND_TRAINING')
 THEN RAISE EXCEPTION 'Paid training member denied intended Academy entitlement'; END IF;
 IF public.user_has_tool_access(member,'MARKET_TUTOR')
 OR public.user_has_tool_access(member,'JOURNAL_ANALYTICS')
 OR public.user_has_tool_access(member,'INTERACTIVE_LEARNING')
 OR public.user_has_tool_access(member,'MARKET_SIMULATOR')
 THEN RAISE EXCEPTION 'Training-only subscription accidentally unlocked unrelated tools'; END IF;
 IF public.user_has_tool_access(expired,'ONDEMAND_TRAINING')
 OR public.user_has_tool_access(showcase,'ONDEMAND_TRAINING')
 THEN RAISE EXCEPTION 'Expired or Showcase training access must be denied'; END IF;
 IF NOT public.user_has_tool_access(full_member,'MARKET_TUTOR')
 THEN RAISE EXCEPTION 'Existing Full Platform entitlement regressed'; END IF;
 IF public.user_has_tool_access(NULL,'ONDEMAND_TRAINING')
 THEN RAISE EXCEPTION 'Missing identity was authorized'; END IF;
END $$;

-- A genuine subscription route, not just an Owner-issued plan grant.
DELETE FROM public.user_plan_grants WHERE user_id='11111111-1111-4111-8111-111111111111';
INSERT INTO public.site_subscriptions VALUES
 ('11111111-1111-4111-8111-111111111111','ONDEMAND_MONTHLY','active',now()+interval '10 days');
DO $$
BEGIN
 IF NOT public.user_has_tool_access('11111111-1111-4111-8111-111111111111','ONDEMAND_TRAINING')
 THEN RAISE EXCEPTION 'Subscription did not convey intended training'; END IF;
END $$;
UPDATE public.site_subscriptions SET current_period_end=now()-interval '1 second';
DO $$
BEGIN
 IF public.user_has_tool_access('11111111-1111-4111-8111-111111111111','ONDEMAND_TRAINING')
 THEN RAISE EXCEPTION 'Expired subscription retained paid training'; END IF;
END $$;
UPDATE public.site_subscriptions SET current_period_end=now()+interval '10 days';
INSERT INTO public.admin_user_flags VALUES('11111111-1111-4111-8111-111111111111','suspended');
DO $$
BEGIN
 IF public.user_has_tool_access('11111111-1111-4111-8111-111111111111','ONDEMAND_TRAINING')
 THEN RAISE EXCEPTION 'Suspended account retained restricted training access'; END IF;
END $$;

-- Restore rollback safety invariant, then verify reversible SQL.
DELETE FROM public.site_subscriptions;
DELETE FROM public.user_plan_grants WHERE plan_code='ONDEMAND_MONTHLY';
\i supabase/rollbacks/20261026_training_membership_entitlement_fix_ROLLBACK.sql
DO $$
BEGIN
 IF position('target_tool=''ONDEMAND_TRAINING''' in
  pg_get_functiondef('public.user_has_tool_access(uuid,text)'::regprocedure))<>0
 THEN RAISE EXCEPTION 'Rollback failed to restore original function'; END IF;
 IF NOT public.user_has_tool_access('33333333-3333-4333-8333-333333333333','MARKET_TUTOR')
 THEN RAISE EXCEPTION 'Rollback broke existing Full Platform tool grant'; END IF;
END $$;
SELECT 'PASS training-only product entitlement + expiry/restricted/Showcase/negative tools + rollback' AS result;
