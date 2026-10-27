-- Disposable PostgreSQL ONLY: fake reviewed question set, synthetic prices/answers.
-- These are NOT the real B01 keys and never authorize publication in Supabase.
\set ON_ERROR_STOP on
CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
CREATE ROLE service_role NOLOGIN;
CREATE TABLE public.lab_training_sets_v014(
 lab_id text NOT NULL, version integer NOT NULL, review_state text NOT NULL,
 questions jsonb NOT NULL, answer_key jsonb NOT NULL,source_status text NOT NULL,
 PRIMARY KEY(lab_id,version)
);
CREATE TABLE public.lab_training_attempts_v014(
 id uuid PRIMARY KEY,user_id uuid NOT NULL,lab_id text NOT NULL,
 set_version integer NOT NULL,mode text NOT NULL,step_index integer NOT NULL DEFAULT 0,
 responses jsonb NOT NULL DEFAULT '[]'::jsonb,score integer,report jsonb,
 completed_at timestamptz,updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE OR REPLACE FUNCTION public.user_has_tool_access(p_user uuid,p_tool text)
RETURNS boolean LANGUAGE sql STABLE AS $$
 SELECT p_user='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid
  AND p_tool='ONDEMAND_TRAINING' $$;
-- Only to satisfy the migration's preflight; the migration installs the
-- complete actual production grading function captured in the source review.
CREATE OR REPLACE FUNCTION public.v014_training_answer(
 p_actor uuid,p_attempt uuid,p_answer text,p_expected_step integer)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp
AS $dummy$ BEGIN
 -- Stale training step. creditFraction
 RETURN '{}'::jsonb;
END $dummy$;
INSERT INTO public.lab_training_sets_v014 VALUES(
 'SYNTHETIC-B01-FIXTURE',97,'reviewed',
 jsonb_build_array(
  jsonb_build_object('id','Q1','kind','choice','prompt','FICTIONAL: Is an invented price bar evidence of an actual fill?','options',jsonb_build_array('Observation only','Guaranteed execution'),'explanation','OHLC cannot prove an exact execution without trade confirmations, liquidity and a real order lifecycle.'),
  jsonb_build_object('id','Q2','kind','choice','prompt','FICTIONAL: No volume available; what decision is responsible?','options',jsonb_build_array('No trade','Trade without a plan'),'criticalOnWrong',true,'explanation','Lack of relevant evidence should not justify a risky entry. A no-trade decision is valid.'),
  jsonb_build_object('id','Q3','kind','number','prompt','FICTIONAL: Independently calculate the fraction shown in the example.','tolerance',0.02,'partialTolerance',0.10,'partialCreditPct',40,'explanation','Apply the given illustrative formula, keep units and round at the specified precision.')
 ),
 '{"Q1":"Observation only","Q2":"No trade","Q3":25.00}'::jsonb,
 'original_hypothetical_unreviewed_fixture'
);
