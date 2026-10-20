-- Ephemeral PostgreSQL 16 fixture. NEVER run this fixture against Supabase.
-- Reproduces only the columns required by the real owner-reviewed v118 SQL.
CREATE SCHEMA auth;
CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
CREATE ROLE service_role NOLOGIN BYPASSRLS;
CREATE TABLE auth.users(id uuid PRIMARY KEY);
CREATE TABLE public.market_datasets(
 dataset_code text PRIMARY KEY,
 ticker text,
 title text,
 dataset_type text NOT NULL,
 status text NOT NULL,
 source_attribution text,
 license_note text,
 metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);
CREATE TABLE public.gu_replay_bars_v01492(
 dataset_code text NOT NULL REFERENCES public.market_datasets(dataset_code),
 bar_index integer NOT NULL,
 bar_at timestamptz NOT NULL,
 open numeric NOT NULL,high numeric NOT NULL,low numeric NOT NULL,
 close numeric NOT NULL,volume bigint NOT NULL,
 PRIMARY KEY(dataset_code,bar_index)
);
CREATE TABLE public.gu_replay_sessions_v01492(
 id uuid PRIMARY KEY,user_id uuid NOT NULL REFERENCES auth.users(id),
 dataset_code text NOT NULL REFERENCES public.market_datasets(dataset_code),
 current_index integer NOT NULL DEFAULT 0,
 decision_locked boolean NOT NULL DEFAULT false,
 decision text,reasoning text,decision_plan jsonb,locked_at timestamptz,
 status text NOT NULL DEFAULT 'active',created_at timestamptz NOT NULL DEFAULT now(),
 expires_at timestamptz NOT NULL DEFAULT(now()+interval '24 hours'),
 finished_at timestamptz
);
CREATE TABLE public.decision_journal(
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 user_id uuid NOT NULL REFERENCES auth.users(id),
 ticker text,trade_date date,journal_type text,status text,decision text,
 direction text,session_label text,setup text,evidence text,market_context text,
 plan_locked_at timestamptz,share_quantity numeric,
 created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now(),
 actual_entry numeric,actual_exit numeric,exit_date date,fees numeric DEFAULT 0,
 gross_pnl numeric,net_pnl numeric,r_multiple numeric,process_grade text,
 result_note text,lesson text,emotion_after text,mistakes text[],tags text[]
);
CREATE TABLE public.trade_plan_snapshots(
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 journal_id bigint NOT NULL UNIQUE REFERENCES public.decision_journal(id),
 user_id uuid NOT NULL REFERENCES auth.users(id),
 snapshot jsonb NOT NULL,
 locked_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.journal_reviews(
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 journal_id bigint NOT NULL REFERENCES public.decision_journal(id),
 user_id uuid NOT NULL REFERENCES auth.users(id),
 review_stage text NOT NULL CHECK(review_stage IN ('1D','7D','30D')),
 due_at timestamptz NOT NULL,
 completed_at timestamptz,
 review_notes text,
 created_at timestamptz DEFAULT now(),
 UNIQUE(journal_id,review_stage)
);
CREATE TABLE public.competency_evidence(
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 user_id uuid NOT NULL REFERENCES auth.users(id),
 competency_code text NOT NULL
);
GRANT USAGE ON SCHEMA public TO service_role,authenticated,anon;
GRANT SELECT,INSERT,UPDATE,DELETE ON ALL TABLES IN SCHEMA public TO service_role;
GRANT USAGE,SELECT ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT SELECT,UPDATE(completed_at,review_notes) ON public.journal_reviews TO authenticated;
GRANT SELECT,UPDATE ON public.decision_journal TO authenticated;
GRANT SELECT,UPDATE ON public.gu_replay_sessions_v01492 TO authenticated;

INSERT INTO auth.users(id) VALUES
 ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),
 ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb');
INSERT INTO public.market_datasets(
 dataset_code,ticker,title,dataset_type,status,source_attribution,license_note,metadata
) VALUES
 ('GUSIM_ACCEPTANCE','GUSIM','Private invented exercise','ohlcv','published',
  'First-party original hypothetical training','Original author-owned training',
  '{"original_synthetic":true,"licensed_for_member_display":true,"evidence_verified":true,"corporate_action_policy":"not applicable"}'),
 ('GUSIM_REVOKED','GUSIM','Revoked training','ohlcv','unpublished',
  'First-party original hypothetical training','Original author-owned training',
  '{"original_synthetic":true,"licensed_for_member_display":true,"evidence_verified":true,"corporate_action_policy":"not applicable"}');
INSERT INTO public.gu_replay_bars_v01492(dataset_code,bar_index,bar_at,open,high,low,close,volume)
VALUES
 ('GUSIM_ACCEPTANCE',0,'2026-01-02T14:30:00Z',100,101,99,100.5,1000),
 ('GUSIM_ACCEPTANCE',1,'2026-01-02T14:35:00Z',100.5,102,100,101,1200),
 ('GUSIM_ACCEPTANCE',2,'2026-01-02T14:40:00Z',101,103,100.5,102,1500),
 ('GUSIM_REVOKED',0,'2026-01-02T14:30:00Z',100,101,99,100.5,1000),
 ('GUSIM_REVOKED',1,'2026-01-02T14:35:00Z',100.5,102,100,101,1200);
INSERT INTO public.gu_replay_sessions_v01492(
 id,user_id,dataset_code,decision_locked,decision,reasoning,decision_plan,
 locked_at,current_index
) VALUES
 ('11111111-1111-4111-8111-111111111111','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','GUSIM_ACCEPTANCE',
 true,'ENTER','First observation gives a testable premise; later bars must remain concealed.',
 '{"side":"BUY","type":"MARKET","quantity":10}',now(),1),
 ('22222222-2222-4222-8222-222222222222','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','GUSIM_ACCEPTANCE',
 true,'NO_TRADE','There was insufficient evidence to justify a simulated entry at this point.',
 null,now(),0),
 ('33333333-3333-4333-8333-333333333333','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','GUSIM_REVOKED',
 true,'OBSERVE','Initial observation of fictional prices; source permission was withdrawn.',
 null,now(),0),
 ('44444444-4444-4444-8444-444444444444','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','GUSIM_ACCEPTANCE',
 false,null,null,null,null,0);
