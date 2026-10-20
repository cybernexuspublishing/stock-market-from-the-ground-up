-- v0.14.0.99 | COMPLETE THE EXISTING 30-COMPETENCY FRAMEWORK
-- No new Supabase project, schema duplication, synthetic grades, or history.
-- The checked-in v0.13.4 source establishes 29, not the promised 30.
BEGIN;
DO $$ DECLARE n integer; BEGIN
 IF to_regclass('public.competency_definitions') IS NULL THEN
  RAISE EXCEPTION 'Missing existing competency framework; do not recreate the table';
 END IF;
 SELECT count(*) INTO n FROM public.competency_definitions;
 IF n NOT BETWEEN 29 AND 30 THEN
  RAISE EXCEPTION 'Existing catalog unexpectedly has % definitions; review source before installing',n;
 END IF;
 IF n=30 AND NOT EXISTS(SELECT 1 FROM public.competency_definitions WHERE competency_code='REPLAY_DISCIPLINE') THEN
  RAISE EXCEPTION '30 existing approved competencies; refusing to invent a 31st';
 END IF;
END $$;
INSERT INTO public.competency_definitions(
 competency_code,category,name,description,mastery_definition,pass_score,
 mastery_score,minimum_evidence,sort_order,metadata
) VALUES (
 'REPLAY_DISCIPLINE','Decision Process','Replay Evidence Chronology',
 'Separate the evidence available before a locked decision from later prices, outcomes and headlines; distinguish fictional author-created simulations from independently sourced historical cases.',
 'Repeat evidence locks, verified timestamp checks and independently reviewed decisions across unseen cases, with no future-information leaks.',
 85,95,12,550,
 '{"keywords":["replay","no-lookahead","hindsight","future bar","decision boundary","observation boundary"],"tool_keywords":["replay","simulator","historical"],"mastery_pass_streak":4}'::jsonb
) ON CONFLICT(competency_code) DO NOTHING;
DO $$ DECLARE n integer; BEGIN
 SELECT count(*) INTO n FROM public.competency_definitions;
 IF n<>30 THEN RAISE EXCEPTION 'Rollback: expected 30 definitions, found %',n; END IF;
END $$;
NOTIFY pgrst,'reload schema';
COMMIT;
