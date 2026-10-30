-- Correct the V3 atomic Journal transfer's ambiguous unqualified journal_id reads.
-- Retain the complete existing function body and existing Free quota trigger.
BEGIN;
DO $fix$
DECLARE body text;
BEGIN
 SELECT pg_get_functiondef(oid) INTO body FROM pg_proc
 WHERE pronamespace='public'::regnamespace
   AND proname='gu_watchlist_to_journal_v3'
   AND pg_get_function_identity_arguments(oid)='p_user uuid, p_plan bigint';
 IF body IS NULL THEN RAISE EXCEPTION 'V3 Journal transfer RPC missing';END IF;
 IF strpos(body,'SELECT journal_id INTO existing_id')=0 THEN
  IF strpos(body,'SELECT gu_watchlist_journal_transfers_v3.journal_id')>0 THEN RETURN; END IF;
  RAISE EXCEPTION 'V3 RPC source changed; manual review required';
 END IF;
 body:=replace(body,
   'SELECT journal_id INTO existing_id'||chr(10)||'   FROM public.gu_watchlist_journal_transfers_v3',
   'SELECT gu_watchlist_journal_transfers_v3.journal_id INTO existing_id'||chr(10)||
   '   FROM public.gu_watchlist_journal_transfers_v3');
 body:=replace(body,
   'SELECT journal_id INTO existing_id FROM public.gu_journal_research_links_v1',
   'SELECT gu_journal_research_links_v1.journal_id INTO existing_id FROM public.gu_journal_research_links_v1');
 IF strpos(body,'SELECT journal_id INTO existing_id')>0 THEN
  RAISE EXCEPTION 'Ambiguous V3 column reference still present';
 END IF;
 EXECUTE body;
END $fix$;
COMMIT;