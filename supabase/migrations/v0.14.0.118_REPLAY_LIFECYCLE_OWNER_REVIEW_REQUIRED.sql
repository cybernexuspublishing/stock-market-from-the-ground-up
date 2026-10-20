-- v0.14.0.118 | Owner review required | single replay-to-Journal lifecycle installer.
-- SUPERSEDES v94 and v115 for new installs. If already installed, replaces SAME RPC in place.
-- Do NOT install v94/v115 after v118; preserves same link table and RPC, no duplicate system.
-- Dependency: installed v0.6 decision_journal, v0.7 trade_plan_snapshots,
-- and v0.14.0.92 private replay objects. No data seeded or altered during
-- review. Do not install before the separate read-only dependency preflight.
-- One RPC call commits session finish, first-decision Journal snapshot, link.
BEGIN;

CREATE TABLE IF NOT EXISTS public.gu_replay_journal_links_v01494 (
 session_id uuid PRIMARY KEY REFERENCES public.gu_replay_sessions_v01492(id) ON DELETE CASCADE,
 journal_id bigint NOT NULL UNIQUE REFERENCES public.decision_journal(id) ON DELETE CASCADE,
 user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 dataset_code text NOT NULL REFERENCES public.market_datasets(dataset_code),
 recorded_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS gu_replay_journal_links_user_v01494
 ON public.gu_replay_journal_links_v01494(user_id,recorded_at DESC);
ALTER TABLE public.gu_replay_journal_links_v01494 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.gu_replay_journal_links_v01494 FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT ON public.gu_replay_journal_links_v01494 TO service_role;

CREATE OR REPLACE FUNCTION public.v01494_replay_finish_to_journal(
 p_session uuid,p_user uuid
) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER
SET search_path=public,pg_temp AS $$
DECLARE
 s public.gu_replay_sessions_v01492%ROWTYPE;
 m public.market_datasets%ROWTYPE;
 b public.gu_replay_bars_v01492%ROWTYPE;
 existing_id bigint;
 new_journal_id bigint;
 canonical_ticker text;
 original_fictional boolean;
 provenance_label text;
 canonical_decision text;
 journal_status text;
 first_date date;
 direction_value text;
BEGIN
 IF p_user IS NULL OR p_session IS NULL THEN
  RAISE EXCEPTION 'Missing replay identity';
 END IF;
 -- Protect every finalization from duplicate/reordered concurrent requests.
 SELECT * INTO s FROM public.gu_replay_sessions_v01492
  WHERE id=p_session AND user_id=p_user FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Replay not found for this member'; END IF;

 SELECT journal_id INTO existing_id
  FROM public.gu_replay_journal_links_v01494
  WHERE session_id=p_session AND user_id=p_user;
 IF FOUND THEN
  IF s.status <> 'finished' THEN
   RAISE EXCEPTION 'Replay/Journal consistency check failed';
  END IF;
  RETURN jsonb_build_object('journalId',existing_id,
    'barsSeen',s.current_index+1,'alreadyLinked',true);
 END IF;
 IF s.status <> 'active' OR s.expires_at<=now() OR
    NOT s.decision_locked OR s.locked_at IS NULL OR
    s.decision NOT IN ('ENTER','WATCH','NO_TRADE','OBSERVE') OR
    length(btrim(coalesce(s.reasoning,''))) NOT BETWEEN 20 AND 2000 OR
    (s.decision<>'ENTER' AND s.decision_plan IS NOT NULL) THEN
  RAISE EXCEPTION 'Replay is not eligible for finalization';
 END IF;

 -- Hold the source row lock through the transaction so an Owner revocation
 -- and a replay finalization cannot cross without a deterministic ordering.
 SELECT * INTO m FROM public.market_datasets
  WHERE dataset_code=s.dataset_code FOR SHARE;
 IF NOT FOUND OR m.status <> 'published' OR m.dataset_type <> 'ohlcv'
  OR m.metadata->>'licensed_for_member_display' IS DISTINCT FROM 'true'
  OR m.metadata->>'evidence_verified' IS DISTINCT FROM 'true'
  OR coalesce(btrim(m.source_attribution),'')=''
  OR coalesce(btrim(m.license_note),'')=''
  OR coalesce(btrim(m.metadata->>'corporate_action_policy'),'')='' THEN
  RAISE EXCEPTION 'Historical dataset rights or verification withdrawn';
 END IF;

 SELECT * INTO b FROM public.gu_replay_bars_v01492
  WHERE dataset_code=s.dataset_code AND bar_index=0;
 IF NOT FOUND THEN RAISE EXCEPTION 'Verified first observation not available'; END IF;
 IF s.current_index<0 OR NOT EXISTS (
  SELECT 1 FROM public.gu_replay_bars_v01492
  WHERE dataset_code=s.dataset_code AND bar_index=s.current_index
 ) THEN RAISE EXCEPTION 'Replay cursor does not reference observed evidence'; END IF;

 original_fictional:=(m.metadata->>'original_synthetic')='true';
 provenance_label:=CASE WHEN original_fictional THEN 'ORIGINAL FICTIONAL simulation'
  ELSE 'Rights-reviewed historical replay' END;
 canonical_ticker:=upper(btrim(coalesce(m.ticker,'')));
 IF canonical_ticker !~ '^[A-Z0-9.-]{1,12}$' THEN
  RAISE EXCEPTION 'Dataset ticker requires Owner correction';
 END IF;
 first_date:=(b.bar_at AT TIME ZONE 'UTC')::date;
 canonical_decision:=CASE s.decision
  WHEN 'NO_TRADE' THEN 'NO TRADE'
  WHEN 'OBSERVE' THEN 'OBSERVATION ONLY'
  ELSE s.decision END;
 journal_status:=CASE WHEN s.decision='NO_TRADE' THEN 'no_trade' ELSE 'planned' END;
 direction_value:=CASE WHEN s.decision='ENTER' THEN
  CASE s.decision_plan->>'side' WHEN 'BUY' THEN 'LONG'
   WHEN 'SELL' THEN 'SHORT' ELSE NULL END ELSE NULL END;

 -- No actual entry/exit, fill, P&L, R-multiple, grading or skill score:
 -- OHLCV cannot prove any of them. This is a first-decision observation.
 INSERT INTO public.decision_journal(
  user_id,ticker,trade_date,journal_type,status,decision,
  direction,session_label,setup,evidence,market_context,
  plan_locked_at,share_quantity
 ) VALUES (
  p_user,canonical_ticker,first_date,'historical_lab',journal_status,
  canonical_decision,direction_value,'Historical replay',
  provenance_label||' ('||s.dataset_code||')',
  s.reasoning,
  provenance_label||'. No actual market fill. First bar timestamp '||
    (b.bar_at AT TIME ZONE 'UTC')::text||
    ' UTC. Licensed source: '||left(m.source_attribution,200)||
    '. This is not a confirmed trade.',
  s.locked_at,
  CASE WHEN s.decision='ENTER' AND s.decision_plan->>'quantity' ~ '^[0-9]{1,7}$'
   THEN (s.decision_plan->>'quantity')::numeric ELSE NULL END
 ) RETURNING id INTO new_journal_id;

 -- Existing Journal UI treats presence of a snapshot as immutable plan.
 INSERT INTO public.trade_plan_snapshots(journal_id,user_id,snapshot,locked_at)
 VALUES (new_journal_id,p_user,
  jsonb_build_object(
    'journal_type','historical_lab','ticker',canonical_ticker,
    'trade_date',first_date,'direction',direction_value,
    'session_label','Historical replay',
    'setup',provenance_label||' ('||s.dataset_code||')',
    'decision',canonical_decision,'evidence',s.reasoning,
    'market_context',provenance_label||', not a real fill',
    'originalSynthetic',original_fictional,
    'replayDatasetKind',CASE WHEN original_fictional THEN 'original_fictional' ELSE 'rights_reviewed_historical' END,
    'replaySessionId',s.id,'datasetCode',s.dataset_code,
    'firstBarAt',b.bar_at,'firstDecisionLockedAt',s.locked_at,
    'firstDecisionReasoning',s.reasoning,
    'initialOrderAssumptions',s.decision_plan,
    'outcomeVerified',false,'graded',false),
  s.locked_at);
 INSERT INTO public.gu_replay_journal_links_v01494(
   session_id,journal_id,user_id,dataset_code
 ) VALUES(s.id,new_journal_id,p_user,s.dataset_code);
 UPDATE public.gu_replay_sessions_v01492
  SET status='finished',finished_at=now()
  WHERE id=s.id AND user_id=p_user AND status='active';
 IF NOT FOUND THEN
  RAISE EXCEPTION 'Concurrent replay finalization conflict';
 END IF;
 -- Every completed replay receives the EXISTING 1D/7D/30D review schedule.
 -- A NO_TRADE row may already have tasks created by the v0.7 insert trigger.
 -- ON CONFLICT leaves any original review dates and notes untouched.
 INSERT INTO public.journal_reviews(journal_id,user_id,review_stage,due_at)
 SELECT new_journal_id,p_user,st.stage,now()+st.delay
 FROM (VALUES('1D'::text,interval '1 day'),
  ('7D'::text,interval '7 days'),('30D'::text,interval '30 days'))
 AS st(stage,delay)
 ON CONFLICT (journal_id,review_stage) DO NOTHING;
 RETURN jsonb_build_object('journalId',new_journal_id,
  'barsSeen',s.current_index+1,'alreadyLinked',false);
END;$$;
REVOKE ALL ON FUNCTION public.v01494_replay_finish_to_journal(uuid,uuid)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.v01494_replay_finish_to_journal(uuid,uuid)
 TO service_role;
-- Durable replay first-decision immutability. This rejects privileged accidental
-- overwrites as well as stale browser retries. An unlocked expired session
-- may still be retired without fabricating a locked decision.
CREATE OR REPLACE FUNCTION public.gu_v014118_replay_lock_integrity()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER
SET search_path=public,pg_temp AS $gu118_session$
BEGIN
 IF OLD.status='finished' AND to_jsonb(NEW) IS DISTINCT FROM to_jsonb(OLD) THEN
   RAISE EXCEPTION 'Completed replay sessions are immutable';
 END IF;
 IF OLD.decision_locked THEN
   IF NEW.decision_locked IS DISTINCT FROM true OR
    NEW.decision IS DISTINCT FROM OLD.decision OR
    NEW.reasoning IS DISTINCT FROM OLD.reasoning OR
    NEW.decision_plan IS DISTINCT FROM OLD.decision_plan OR
    NEW.locked_at IS DISTINCT FROM OLD.locked_at OR
    NEW.dataset_code IS DISTINCT FROM OLD.dataset_code OR
    NEW.user_id IS DISTINCT FROM OLD.user_id OR
    NEW.expires_at IS DISTINCT FROM OLD.expires_at OR
    NEW.current_index < OLD.current_index OR
    NEW.current_index > OLD.current_index+1 THEN
      RAISE EXCEPTION 'First replay decision and revealed cursor are immutable';
   END IF;
 ELSIF NEW.decision_locked THEN
   IF OLD.status<>'active' OR NEW.status<>'active' OR
      OLD.current_index<>0 OR NEW.current_index<>0 OR
      (NEW.decision IS NULL OR NEW.decision NOT IN ('ENTER','WATCH','NO_TRADE','OBSERVE')) OR
      char_length(btrim(coalesce(NEW.reasoning,''))) NOT BETWEEN 20 AND 2000 OR
      NEW.locked_at IS NULL OR NEW.user_id IS DISTINCT FROM OLD.user_id OR
      NEW.dataset_code IS DISTINCT FROM OLD.dataset_code OR
      (NEW.decision<>'ENTER' AND NEW.decision_plan IS NOT NULL) THEN
    RAISE EXCEPTION 'Replay decision must be locked on first bar only';
   END IF;
 ELSIF NEW.current_index IS DISTINCT FROM OLD.current_index THEN
   RAISE EXCEPTION 'Replay cannot advance without a locked first decision';
 END IF;
 IF NEW.current_index>OLD.current_index AND
   (OLD.status<>'active' OR NEW.status<>'active' OR
    NEW.current_index<>OLD.current_index+1) THEN
  RAISE EXCEPTION 'Replay must advance exactly one bar at a time';
 END IF;
 RETURN NEW;
END $gu118_session$;
DROP TRIGGER IF EXISTS gu_replay_first_decision_integrity_v014118
 ON public.gu_replay_sessions_v01492;
CREATE TRIGGER gu_replay_first_decision_integrity_v014118
 BEFORE UPDATE ON public.gu_replay_sessions_v01492
 FOR EACH ROW EXECUTE FUNCTION public.gu_v014118_replay_lock_integrity();
REVOKE ALL ON FUNCTION public.gu_v014118_replay_lock_integrity()
 FROM PUBLIC,anon,authenticated;

-- Replay-linked journals are evidence of the FIRST observation, not confirmed
-- brokerage transactions. Allow only personal REFLECTION fields to change.
-- Never let an authenticated direct-table UPDATE fabricate fills, gains, grades,
-- statuses or different first decisions after server finalization.
CREATE OR REPLACE FUNCTION public.gu_v014118_replay_journal_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path=public,pg_temp AS $gu118_journal$
BEGIN
 IF EXISTS (SELECT 1 FROM public.gu_replay_journal_links_v01494 l
    WHERE l.journal_id=OLD.id) THEN
  IF TG_OP='DELETE' THEN
   RAISE EXCEPTION 'Linked replay learning evidence cannot be deleted through ordinary Journal actions';
  END IF;
  IF (to_jsonb(NEW)-'updated_at'-'result_note'-'lesson'-'emotion_after'-'mistakes'-'tags')
   IS DISTINCT FROM
   (to_jsonb(OLD)-'updated_at'-'result_note'-'lesson'-'emotion_after'-'mistakes'-'tags') THEN
   RAISE EXCEPTION 'Replay outcome, first decision and grade fields cannot be edited';
  END IF;
 END IF;
 IF TG_OP='DELETE' THEN RETURN OLD; END IF;
 RETURN NEW;
END $gu118_journal$;
DROP TRIGGER IF EXISTS gu_replay_journal_immutable_v014118 ON public.decision_journal;
CREATE TRIGGER gu_replay_journal_immutable_v014118
 BEFORE UPDATE OR DELETE ON public.decision_journal
 FOR EACH ROW EXECUTE FUNCTION public.gu_v014118_replay_journal_guard();
REVOKE ALL ON FUNCTION public.gu_v014118_replay_journal_guard()
 FROM PUBLIC,anon,authenticated;

-- Existing Journal review queue is reused, not duplicated. This private
-- companion stores a time-locked pre-reveal reflection and later comparison.
CREATE TABLE IF NOT EXISTS public.gu_replay_review_locks_v014118 (
 review_id bigint PRIMARY KEY REFERENCES public.journal_reviews(id) ON DELETE CASCADE,
 journal_id bigint NOT NULL REFERENCES public.decision_journal(id),
 user_id uuid NOT NULL REFERENCES auth.users(id),
 pre_reveal_note text NOT NULL CHECK(char_length(pre_reveal_note) BETWEEN 20 AND 3000),
 locked_at timestamptz NOT NULL DEFAULT now(),
 revealed_at timestamptz,
 post_reveal_note text,
 completed_at timestamptz,
 CONSTRAINT gu_replay_review_complete_after_reveal_v014118 CHECK(
  completed_at IS NULL OR (revealed_at IS NOT NULL AND post_reveal_note IS NOT NULL))
);
CREATE INDEX IF NOT EXISTS gu_replay_review_member_v014118
 ON public.gu_replay_review_locks_v014118(user_id,review_id);
ALTER TABLE public.gu_replay_review_locks_v014118 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.gu_replay_review_locks_v014118 FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE ON public.gu_replay_review_locks_v014118 TO service_role;

-- Once the learner records an outcome-hidden observation it must be immutable
-- even against accidental future trusted-service updates.
CREATE OR REPLACE FUNCTION public.gu_v014118_replay_review_note_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER
SET search_path=public,pg_temp AS $gu118_pre_note$
BEGIN
 IF NEW.review_id IS DISTINCT FROM OLD.review_id OR
  NEW.journal_id IS DISTINCT FROM OLD.journal_id OR
  NEW.user_id IS DISTINCT FROM OLD.user_id OR
  NEW.pre_reveal_note IS DISTINCT FROM OLD.pre_reveal_note OR
  NEW.locked_at IS DISTINCT FROM OLD.locked_at OR
  (OLD.revealed_at IS NOT NULL AND NEW.revealed_at IS DISTINCT FROM OLD.revealed_at) OR
  (OLD.completed_at IS NOT NULL AND to_jsonb(NEW) IS DISTINCT FROM to_jsonb(OLD))
 THEN RAISE EXCEPTION 'Immutable replay review sequence cannot be rewritten';
 END IF;
 RETURN NEW;
END $gu118_pre_note$;
DROP TRIGGER IF EXISTS gu_replay_review_immutable_v014118
 ON public.gu_replay_review_locks_v014118;
CREATE TRIGGER gu_replay_review_immutable_v014118
 BEFORE UPDATE ON public.gu_replay_review_locks_v014118
 FOR EACH ROW EXECUTE FUNCTION public.gu_v014118_replay_review_note_guard();
REVOKE ALL ON FUNCTION public.gu_v014118_replay_review_note_guard()
 FROM PUBLIC,anon,authenticated;

-- Authenticated direct Journal writes must not bypass the pre-reveal lock,
-- reveal and completion sequence for replay-linked evidence. The service-only
-- transaction below is the writer. Ordinary journal reviews stay unchanged.
CREATE OR REPLACE FUNCTION public.gu_v014118_protect_replay_review()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path=public,pg_temp AS $gu118_review_guard$
BEGIN
 -- SECURITY DEFINER is required to examine private service-only link rows.
 -- Determine the CALLER'S PostgREST role from request JWT / SET ROLE, not
 -- current_user (which is function owner inside a definer function).
 IF EXISTS(SELECT 1 FROM public.gu_replay_journal_links_v01494
     WHERE journal_id=OLD.journal_id) AND
    coalesce(nullif(current_setting('request.jwt.claim.role',true),''),
             nullif(current_setting('role',true),'none'),'')<>'service_role' AND
    (NEW.review_notes IS DISTINCT FROM OLD.review_notes OR
     NEW.completed_at IS DISTINCT FROM OLD.completed_at) THEN
    RAISE EXCEPTION 'Replay review must follow the server-locked evidence sequence';
 END IF;
 RETURN NEW;
END $gu118_review_guard$;
DROP TRIGGER IF EXISTS gu_replay_review_write_guard_v014118 ON public.journal_reviews;
CREATE TRIGGER gu_replay_review_write_guard_v014118
 BEFORE UPDATE ON public.journal_reviews FOR EACH ROW
 EXECUTE FUNCTION public.gu_v014118_protect_replay_review();
REVOKE ALL ON FUNCTION public.gu_v014118_protect_replay_review()
 FROM PUBLIC,anon,authenticated;

-- SECURITY INVOKER, service_role only; p_actor is verified at the Cloudflare
-- boundary, then crosschecked here against the journal owner and link.
CREATE OR REPLACE FUNCTION public.gu_v014118_review_transaction(
 p_actor uuid,p_review bigint,p_action text,p_note text DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER
SET search_path=public,pg_temp AS $gu118_review_rpc$
DECLARE
 r public.journal_reviews%ROWTYPE;
 locked public.gu_replay_review_locks_v014118%ROWTYPE;
 note text:=btrim(coalesce(p_note,''));
BEGIN
 IF p_actor IS NULL OR p_review IS NULL OR p_review<=0 OR
  p_action IS NULL OR p_action NOT IN ('lock','reveal','complete') THEN
   RAISE EXCEPTION 'Invalid replay review request';
 END IF;
 SELECT * INTO r FROM public.journal_reviews
 WHERE id=p_review AND user_id=p_actor AND
 EXISTS(SELECT 1 FROM public.gu_replay_journal_links_v01494 l
  WHERE l.journal_id=journal_reviews.journal_id AND l.user_id=p_actor)
 FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Replay review not available for this member'; END IF;
 IF r.due_at>now() THEN RAISE EXCEPTION 'This review stage is not due yet'; END IF;
 SELECT * INTO locked FROM public.gu_replay_review_locks_v014118
  WHERE review_id=r.id AND user_id=p_actor FOR UPDATE;
 IF p_action='lock' THEN
  IF FOUND THEN
   RETURN jsonb_build_object('ok',true,'locked',true,'alreadyLocked',true,
    'revealed',locked.revealed_at IS NOT NULL);
  END IF;
  IF r.completed_at IS NOT NULL OR char_length(note) NOT BETWEEN 20 AND 3000 THEN
    RAISE EXCEPTION 'A new 20-3000 character outcome-hidden observation is required';
  END IF;
  INSERT INTO public.gu_replay_review_locks_v014118(
   review_id,journal_id,user_id,pre_reveal_note
  ) VALUES(r.id,r.journal_id,p_actor,note);
  RETURN jsonb_build_object('ok',true,'locked',true,'alreadyLocked',false,'revealed',false);
 ELSIF p_action='reveal' THEN
  IF NOT FOUND OR r.completed_at IS NOT NULL THEN
    RAISE EXCEPTION 'Lock your outcome-hidden notes before reveal';
  END IF;
  UPDATE public.gu_replay_review_locks_v014118
   SET revealed_at=coalesce(revealed_at,now()) WHERE review_id=r.id;
  RETURN jsonb_build_object('ok',true,'locked',true,'revealed',true);
 ELSIF p_action='complete' THEN
  IF NOT FOUND OR locked.revealed_at IS NULL THEN
    RAISE EXCEPTION 'You must lock evidence and reveal before completing review';
  END IF;
  IF r.completed_at IS NOT NULL THEN
    RETURN jsonb_build_object('ok',true,'alreadyComplete',true);
  END IF;
  IF char_length(note) NOT BETWEEN 20 AND 3000 THEN
   RAISE EXCEPTION 'A 20-3000 character post-reveal comparison is required';
  END IF;
  UPDATE public.journal_reviews SET review_notes=note,completed_at=now()
   WHERE id=r.id AND user_id=p_actor AND completed_at IS NULL;
  UPDATE public.gu_replay_review_locks_v014118
   SET post_reveal_note=note,completed_at=now() WHERE review_id=r.id;
  RETURN jsonb_build_object('ok',true,'completed',true,'alreadyComplete',false);
 END IF;
 RAISE EXCEPTION 'Unknown replay review action';
END $gu118_review_rpc$;
REVOKE ALL ON FUNCTION public.gu_v014118_review_transaction(uuid,bigint,text,text)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.gu_v014118_review_transaction(uuid,bigint,text,text)
 TO service_role;
NOTIFY pgrst,'reload schema';
COMMIT;
-- DO NOT delete already-created links/journals on rollback.
-- Use the existing GU_REPLAY_JOURNAL_V01494_ENABLED kill switch and
-- separately review restoration of the former function and triggers.
