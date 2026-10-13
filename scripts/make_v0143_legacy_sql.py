from pathlib import Path
root=Path(__file__).resolve().parents[1]
s=(root/'supabase/migrations/v0.5_identity_settings_forum.sql').read_text()
out=root/'supabase/migrations/v0.14.0.3_LEGACY_FORUM_READ_ISOLATION.sql'
header='''-- v0.14.0.3: preserve legacy forum UI while preventing production-data reads
-- by TEST / SHOWCASE / suspended accounts through both PostgREST and SECURITY DEFINER RPCs.
-- Supersedes only three legacy read function bodies, no historical content is deleted.
BEGIN;
CREATE OR REPLACE FUNCTION public.v0143_legacy_forum_can_read()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
 SELECT auth.uid() IS NOT NULL
 AND EXISTS(SELECT 1 FROM public.profiles p WHERE p.id=auth.uid() AND p.account_kind='member')
 AND NOT EXISTS(SELECT 1 FROM public.admin_user_roles r WHERE r.user_id=auth.uid()
   AND r.role_code='SHOWCASE_VIEWER' AND (r.expires_at IS NULL OR r.expires_at>now()))
 AND NOT EXISTS(SELECT 1 FROM public.admin_user_flags f WHERE f.user_id=auth.uid() AND f.status='suspended');
$$;
REVOKE ALL ON FUNCTION public.v0143_legacy_forum_can_read() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.v0143_legacy_forum_can_read() TO service_role;
DROP POLICY IF EXISTS v0143_legacy_topics_read ON public.forum_topics;
CREATE POLICY v0143_legacy_topics_read ON public.forum_topics AS RESTRICTIVE FOR SELECT TO authenticated
USING (public.v0143_legacy_forum_can_read());
DROP POLICY IF EXISTS v0143_legacy_posts_read ON public.forum_posts;
CREATE POLICY v0143_legacy_posts_read ON public.forum_posts AS RESTRICTIVE FOR SELECT TO authenticated
USING (public.v0143_legacy_forum_can_read());
DROP POLICY IF EXISTS v0143_legacy_reports_read ON public.forum_reports;
CREATE POLICY v0143_legacy_reports_read ON public.forum_reports AS RESTRICTIVE FOR SELECT TO authenticated
USING (public.v0143_legacy_forum_can_read());
'''
result=header
for name,stop in [('forum_list_topics','forum_get_topic'),('forum_get_topic','forum_list_posts'),('forum_list_posts','-- Seed initial forum categories.')]:
 start=s.index('create or replace function public.'+name+'(')
 end=s.index('create or replace function public.'+stop+'(') if not stop.startswith('--') else s.index(stop,start)
 segment=s[start:end].rstrip()
 # replaces the existing function body in-place while preserving source columns/signature/order.
 assert segment.count('if auth.uid() is null then')==1
 segment=segment.replace('if auth.uid() is null then', 'if not public.v0143_legacy_forum_can_read() then')
 segment=segment.replace("raise exception 'Authentication required';", "raise exception 'Only eligible production members may read this forum';")
 result+='\n'+segment+'\n'
result+='\nNOTIFY pgrst,\'reload schema\';\nCOMMIT;\n'
out.write_text(result)
print(out,len(result))
