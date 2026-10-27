-- Disposable CI PostgreSQL 16 schema only; never apply this fixture to Supabase.
\set ON_ERROR_STOP on
CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
CREATE SCHEMA auth;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS
$$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
GRANT USAGE ON SCHEMA auth TO authenticated;
GRANT EXECUTE ON FUNCTION auth.uid() TO authenticated;
CREATE TABLE public.profiles(id uuid PRIMARY KEY,account_kind text NOT NULL);
CREATE TABLE public.platform_labs(lab_id text PRIMARY KEY,active boolean NOT NULL,registry_visible boolean NOT NULL);
CREATE TABLE public.site_lab_progress(
 user_id uuid NOT NULL,lab_id text NOT NULL,status text NOT NULL,
 responses jsonb NOT NULL DEFAULT '{}'::jsonb,
 started_at timestamptz,updated_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(user_id,lab_id)
);
ALTER TABLE public.site_lab_progress ENABLE ROW LEVEL SECURITY;
GRANT SELECT,INSERT,UPDATE ON public.site_lab_progress TO authenticated;
GRANT SELECT ON public.profiles,public.platform_labs TO authenticated;
CREATE POLICY own_read ON public.site_lab_progress FOR SELECT TO authenticated
 USING (user_id=(SELECT auth.uid()));
CREATE POLICY own_insert ON public.site_lab_progress FOR INSERT TO authenticated
 WITH CHECK (user_id=(SELECT auth.uid()));
CREATE POLICY own_update ON public.site_lab_progress FOR UPDATE TO authenticated
 USING (user_id=(SELECT auth.uid())) WITH CHECK (user_id=(SELECT auth.uid()));
INSERT INTO public.profiles VALUES
('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','member'),
('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','member');
INSERT INTO public.platform_labs VALUES
('F2-C06-L01',true,true),
('DT-C06-L03',true,true);
