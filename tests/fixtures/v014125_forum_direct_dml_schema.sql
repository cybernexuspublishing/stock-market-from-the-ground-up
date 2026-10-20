-- v125 isolated PostgreSQL 16, NEVER Supabase production.
-- Four content tables, v0.5 column-specific legacy UPDATE grants, service RPC
-- prerequisites and original permissive RLS. No real member data imported.
CREATE SCHEMA auth;
CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
CREATE ROLE service_role NOLOGIN BYPASSRLS;
CREATE TABLE auth.users(id uuid PRIMARY KEY);
INSERT INTO auth.users VALUES
 ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),
 ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb');
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
 SELECT NULLIF(current_setting('app.jwt_member_id',true),'')::uuid
$$;
CREATE TABLE public.profiles(id uuid PRIMARY KEY,account_kind text NOT NULL);
INSERT INTO public.profiles VALUES
 ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','member'),
 ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','member');
CREATE TABLE public.admin_user_flags(user_id uuid,status text);
CREATE TABLE public.admin_user_roles(user_id uuid,role_code text,expires_at timestamptz);
INSERT INTO public.admin_user_roles VALUES
 ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','OWNER',NULL);
CREATE TABLE public.admin_role_permissions(role_code text,permission_code text);
CREATE TABLE public.admin_audit_log(
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 actor_user_id uuid,action text,target_type text,target_id text,details jsonb
);
CREATE TABLE public.forum_topics(
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 author_id uuid NOT NULL,title text NOT NULL,body text NOT NULL,ticker text,
 status text DEFAULT 'published',is_locked boolean DEFAULT false,
 is_pinned boolean DEFAULT false,updated_at timestamptz DEFAULT now()
);
CREATE TABLE public.forum_posts(
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 topic_id bigint NOT NULL,author_id uuid NOT NULL,body text NOT NULL,
 status text DEFAULT 'published',updated_at timestamptz DEFAULT now()
);
CREATE TABLE public.commons_topics(
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 author_user_id uuid NOT NULL,title text NOT NULL,body text NOT NULL,
 status text DEFAULT 'published',is_locked boolean DEFAULT false,
 is_pinned boolean DEFAULT false,is_official boolean DEFAULT false,
 reply_count integer DEFAULT 0,updated_at timestamptz DEFAULT now()
);
CREATE TABLE public.commons_posts(
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 topic_id bigint NOT NULL,author_user_id uuid NOT NULL,body text NOT NULL,
 status text DEFAULT 'published',updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.forum_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commons_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commons_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY legacy_topic_write ON public.forum_topics FOR UPDATE TO authenticated
 USING (author_id=auth.uid()) WITH CHECK(author_id=auth.uid());
CREATE POLICY legacy_post_write ON public.forum_posts FOR UPDATE TO authenticated
 USING (author_id=auth.uid()) WITH CHECK(author_id=auth.uid());
CREATE POLICY commons_topic_write ON public.commons_topics FOR UPDATE TO authenticated
 USING (author_user_id=auth.uid()) WITH CHECK(author_user_id=auth.uid());
CREATE POLICY commons_post_write ON public.commons_posts FOR UPDATE TO authenticated
 USING (author_user_id=auth.uid()) WITH CHECK(author_user_id=auth.uid());
CREATE POLICY legacy_topic_create ON public.forum_topics FOR INSERT TO authenticated
 WITH CHECK(author_id=auth.uid());
CREATE POLICY legacy_post_create ON public.forum_posts FOR INSERT TO authenticated
 WITH CHECK(author_id=auth.uid());
CREATE POLICY commons_topic_create ON public.commons_topics FOR INSERT TO authenticated
 WITH CHECK(author_user_id=auth.uid());
CREATE POLICY commons_post_create ON public.commons_posts FOR INSERT TO authenticated
 WITH CHECK(author_user_id=auth.uid());
CREATE POLICY legacy_topic_read ON public.forum_topics FOR SELECT TO authenticated
 USING(status='published' OR author_id=auth.uid());
CREATE POLICY legacy_post_read ON public.forum_posts FOR SELECT TO authenticated
 USING(status='published' OR author_id=auth.uid());
CREATE POLICY commons_topic_read ON public.commons_topics FOR SELECT TO authenticated
 USING(status='published' OR author_user_id=auth.uid());
CREATE POLICY commons_post_read ON public.commons_posts FOR SELECT TO authenticated
 USING(status='published' OR author_user_id=auth.uid());
GRANT USAGE ON SCHEMA public,auth TO authenticated,service_role;
GRANT EXECUTE ON FUNCTION auth.uid() TO authenticated;
GRANT SELECT ON public.forum_topics,public.forum_posts,public.commons_topics,public.commons_posts TO authenticated;
GRANT INSERT(author_id,title,body,ticker) ON public.forum_topics TO authenticated;
GRANT INSERT(topic_id,author_id,body) ON public.forum_posts TO authenticated;
GRANT INSERT(author_user_id,title,body) ON public.commons_topics TO authenticated;
GRANT INSERT(topic_id,author_user_id,body) ON public.commons_posts TO authenticated;
-- Critical legacy v0.5 column UPDATE grants: REVOKE UPDATE ON TABLE alone
-- does not remove these, so must be tested explicitly.
GRANT UPDATE(title,body,ticker,updated_at) ON public.forum_topics TO authenticated;
GRANT UPDATE(body,updated_at) ON public.forum_posts TO authenticated;
GRANT UPDATE(title,body,updated_at) ON public.commons_topics TO authenticated;
GRANT UPDATE(body,updated_at) ON public.commons_posts TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT USAGE,SELECT ON ALL SEQUENCES IN SCHEMA public TO service_role,authenticated;
INSERT INTO public.forum_topics(author_id,title,body) VALUES
 ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','Original legacy topic','Historical discussion with original research sources');
INSERT INTO public.forum_posts(topic_id,author_id,body) VALUES
 (1,'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','Original evidence');
INSERT INTO public.commons_topics(author_user_id,title,body) VALUES
 ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','Original Commons discussion','Educational discussion for owner review');
INSERT INTO public.commons_posts(topic_id,author_user_id,body) VALUES
 (1,'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','Initial reply observation');
