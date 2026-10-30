-- Crownlight Watchlist Intelligence V3: one atomic, quota-respecting Journal draft
-- per authenticated member-owned saved Trade-Plan snapshot.
-- Service-role-only RPC; outer Cloudflare endpoint verifies current premium access.
-- This does not change Free limits, membership policies, plan locks or live trading.
BEGIN;
CREATE TABLE IF NOT EXISTS public.gu_watchlist_journal_transfers_v3 (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id bigint NOT NULL REFERENCES public.tool_workspace_records(id) ON DELETE CASCADE,
  journal_id bigint NOT NULL UNIQUE REFERENCES public.decision_journal(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id,plan_id)
);
CREATE INDEX IF NOT EXISTS gu_watchlist_journal_transfers_v3_user_idx
 ON public.gu_watchlist_journal_transfers_v3(user_id,created_at DESC);
ALTER TABLE public.gu_watchlist_journal_transfers_v3 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.gu_watchlist_journal_transfers_v3 FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT ON public.gu_watchlist_journal_transfers_v3 TO service_role;

CREATE OR REPLACE FUNCTION public.gu_watchlist_to_journal_v3(p_user uuid,p_plan bigint)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
 SET search_path TO 'pg_catalog','pg_temp'
AS $function$
DECLARE
  source_row public.tool_workspace_records%ROWTYPE;
  existing_id bigint;
  journal_id bigint;
  data jsonb; modeled jsonb;
  ticker text; direction text; decision text; observed timestamptz;
  published timestamptz; source_time text;
  field_value text;
  entry_price numeric; stop_price numeric; target_price numeric; shares numeric;
BEGIN
  IF p_user IS NULL OR p_plan IS NULL OR p_plan<=0
  THEN RETURN jsonb_build_object('ok',false,'error','INVALID_PLAN_REFERENCE');END IF;
  -- Serializes competing retries before any Free weekly usage is charged.
  PERFORM pg_advisory_xact_lock(hashtextextended(p_user::text||':WATCHLIST_JOURNAL_V3:'||p_plan::text,0));
  SELECT journal_id INTO existing_id
   FROM public.gu_watchlist_journal_transfers_v3
   WHERE user_id=p_user AND plan_id=p_plan;
  IF FOUND THEN
    RETURN jsonb_build_object('ok',true,'journalId',existing_id,'alreadyExists',true,'quotaDebitedAgain',false);
  END IF;
  -- Legacy manually linked research must not create a second copy.
  SELECT journal_id INTO existing_id FROM public.gu_journal_research_links_v1
   WHERE user_id=p_user AND workbench_record_id=p_plan ORDER BY linked_at ASC LIMIT 1;
  IF FOUND THEN
    RETURN jsonb_build_object('ok',true,'journalId',existing_id,'alreadyExists',true,
      'previouslyLinked',true,'quotaDebitedAgain',false);
  END IF;
  SELECT * INTO source_row FROM public.tool_workspace_records
   WHERE id=p_plan AND user_id=p_user AND tool_code='WATCHLIST_WORKBENCH'
    AND record_type='scenario_review' FOR SHARE;
  IF NOT FOUND OR source_row.payload->>'kind'<>'ADVANCED_TRADE_PLAN_SNAPSHOT_V1'
  THEN RETURN jsonb_build_object('ok',false,'error','PRIVATE_PLAN_NOT_FOUND');END IF;
  data:=source_row.payload->'data';
  modeled:=source_row.payload->'modeled';
  IF jsonb_typeof(data)<>'object'
  THEN RETURN jsonb_build_object('ok',false,'error','INVALID_PLAN_SNAPSHOT');END IF;
  ticker:=upper(data->>'symbol');
  direction:=data->>'direction'; decision:=data->>'decision';
  IF ticker IS NULL OR ticker !~ '^[A-Z][A-Z0-9.-]{0,11}$'
     OR direction NOT IN ('LONG','SHORT')
     OR decision NOT IN ('PLAN','WATCH','REJECT','NO TRADE') THEN
   RETURN jsonb_build_object('ok',false,'error','UNSUPPORTED_PLAN_DECISION');
  END IF;
  source_time:=data->>'asOf';
  IF source_time IS NULL OR source_time !~ '^\\d{4}-\\d{2}-\\d{2}T' THEN
   RETURN jsonb_build_object('ok',false,'error','INVALID_OBSERVATION_TIME');END IF;
  BEGIN observed:=source_time::timestamptz;
  EXCEPTION WHEN invalid_datetime_format OR datetime_field_overflow THEN
   RETURN jsonb_build_object('ok',false,'error','INVALID_OBSERVATION_TIME');END;
  IF observed IS NULL OR observed>now()+interval '5 minutes'
    OR observed<timestamp with time zone '2000-01-01'
  THEN RETURN jsonb_build_object('ok',false,'error','INVALID_OBSERVATION_TIME');END IF;
  published:=NULL;
  source_time:=nullif(data->>'sourceAt','');
  IF source_time IS NOT NULL THEN
   BEGIN published:=source_time::timestamptz;
   EXCEPTION WHEN invalid_datetime_format OR datetime_field_overflow THEN
    RETURN jsonb_build_object('ok',false,'error','INVALID_SOURCE_PUBLICATION');END;
   IF published>observed OR published<timestamp with time zone '2000-01-01'
   THEN RETURN jsonb_build_object('ok',false,'error','SOURCE_AFTER_OBSERVATION');END IF;
  END IF;
  entry_price:=NULL;stop_price:=NULL;target_price:=NULL;shares:=NULL;
  field_value:=coalesce(data->>'entry','');
  IF field_value ~ '^[0-9]{1,7}(\\.[0-9]{1,6})?$'
  THEN entry_price:=nullif(field_value::numeric,0);END IF;
  field_value:=coalesce(data->>'stop','');
  IF field_value ~ '^[0-9]{1,7}(\\.[0-9]{1,6})?$'
  THEN stop_price:=nullif(field_value::numeric,0);END IF;
  field_value:=coalesce(data->>'target1','');
  IF field_value ~ '^[0-9]{1,7}(\\.[0-9]{1,6})?$'
  THEN target_price:=nullif(field_value::numeric,0);END IF;
  field_value:=coalesce(modeled->>'size','');
  IF field_value ~ '^[0-9]{1,7}$' THEN shares:=nullif(field_value::numeric,0);END IF;
  -- The existing enforce_free_journal_limits BEFORE INSERT trigger executes
  -- normally and atomically allocates the existing weekly quota. Never bypass.
  INSERT INTO public.decision_journal
   (user_id,journal_type,ticker,trade_date,status,direction,decision,setup,
    evidence,thesis,invalidation,entry_trigger,no_trade_condition,catalyst_context,
    market_context,planned_entry,planned_stop,planned_target,share_quantity)
  VALUES
   (p_user,'observation',ticker,(observed AT TIME ZONE 'UTC')::date,'draft',
    direction,CASE WHEN decision IN ('REJECT','NO TRADE') THEN 'NO TRADE' ELSE 'WATCH' END,
    left(coalesce(data->>'pattern',''),120),
    left('Workbench saved plan #'||p_plan::text||
      ' at '||source_row.created_at::text||
      '; source: '||coalesce(data->>'source','not recorded')||
      '; source URL: '||coalesce(data->>'sourceUrl','not supplied')||
      '; observed: '||observed::text||
      '. Member-entered research, not independently verified.',2000),
    left(coalesce(data->>'thesis',''),1400),
    left(coalesce(data->>'invalidation',''),1100),
    left(coalesce(data->>'trigger',''),1100),
    left('Cancel if: '||coalesce(data->>'cancel','not recorded')||
      '; alternative: '||coalesce(data->>'alternative','not recorded'),1000),
    left(concat_ws(' | ',data->>'catalyst',data->>'source',data->>'sourceUrl'),1200),
    left('Trend: '||coalesce(data->>'trend','unrecorded')||
     '; levels: '||coalesce(data->>'levels','unrecorded')||
     '; holding: '||coalesce(data->>'holding','unrecorded'),1400),
    entry_price,stop_price,target_price,shares)
  RETURNING id INTO journal_id;
  INSERT INTO public.gu_journal_research_links_v1
   (user_id,journal_id,workbench_record_id,source_observed_at,
    source_published_at,original_saved_at,source_label)
  VALUES (p_user,journal_id,p_plan,observed,published,source_row.created_at,
    'MEMBER_REPORTED_NOT_INDEPENDENTLY_VERIFIED');
  INSERT INTO public.gu_watchlist_journal_transfers_v3(user_id,plan_id,journal_id)
  VALUES (p_user,p_plan,journal_id);
  RETURN jsonb_build_object('ok',true,'journalId',journal_id,'alreadyExists',false,
   'quotaCheckedByExistingTrigger',true,'status','draft','journalType','observation',
   'realExecutionRecorded',false);
END $function$;
REVOKE ALL ON FUNCTION public.gu_watchlist_to_journal_v3(uuid,bigint)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.gu_watchlist_to_journal_v3(uuid,bigint) TO service_role;
COMMIT;