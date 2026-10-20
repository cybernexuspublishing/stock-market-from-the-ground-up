-- Disposable PG16 ONLY, never live Supabase.
-- Start from tests/fixtures/v014118_replay_lifecycle_schema.sql then this fixture.
CREATE TABLE public.platform_plans(
 plan_code text PRIMARY KEY,name text NOT NULL,description text,price_cents integer NOT NULL,
 active boolean NOT NULL DEFAULT true,ad_free boolean DEFAULT false,
 metadata jsonb NOT NULL DEFAULT '{}'::jsonb,updated_at timestamptz DEFAULT now());
INSERT INTO public.platform_plans(plan_code,name,description,price_cents,metadata,ad_free)
VALUES('FREE','Free','Original 10 records / 3 saves',0,
 '{"journal_limit":10,"simulator_sessions_month":3}'::jsonb,false),
 ('FULL_MONTHLY','Monthly Membership','Current price',6999,'{}'::jsonb,false);
ALTER TABLE public.decision_journal ADD COLUMN simulator_source text;
CREATE OR REPLACE FUNCTION public.user_has_tool_access(p_user uuid,p_tool text)
RETURNS boolean LANGUAGE sql STABLE AS $$
 SELECT CASE WHEN p_tool='JOURNAL_ANALYTICS'
 THEN current_setting('app.paid_journal',true)='yes'
 WHEN p_tool='MARKET_SIMULATOR'
 THEN current_setting('app.paid_simulator',true)='yes'
 ELSE false END;
$$;
CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
 SELECT nullif(current_setting('app.member',true),'')::uuid
$$;
GRANT USAGE ON SCHEMA auth TO authenticated;
GRANT SELECT ON public.platform_plans TO authenticated;
