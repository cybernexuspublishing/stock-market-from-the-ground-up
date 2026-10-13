from pathlib import Path
import re,json
root=Path(__file__).resolve().parents[1]
sql=(root/'supabase/migrations/v0.14.0.1_FORUM_WRITE_AND_CHECKOUT_GUARDS.sql').read_text()
assert 'public.commons_create_topic' in sql and 'public.commons_create_reply' in sql
assert sql.count("v_kind IS DISTINCT FROM 'member'")==2
assert sql.count("role_code='SHOWCASE_VIEWER'")>=3
assert 'SECURITY DEFINER' in sql and 'public.v0141_forum_member_write_allowed()' in sql
assert 'AS RESTRICTIVE FOR INSERT TO authenticated' in sql and 'AS RESTRICTIVE FOR UPDATE TO authenticated' in sql
assert "['forum_topics','forum_posts','forum_reports']" in sql
assert 'forum_reports_v0141_target_check' in sql and 'forum_reports_v0141_status_check' in sql
assert 'ALTER COLUMN reporter_id DROP NOT NULL' in sql
assert 'pg_advisory_xact_lock' in sql and 'community.max_topics_per_24h' in sql
assert 'community.max_replies_per_24h' in sql
assert 'WHEN NOT oldrow.active OR NOT oldrow.public_visible THEN false' in sql
training=(root/'functions/api/interactive-training.js').read_text()
assert 'requireMatchingBook(env,request,id)' in training
assert 'requireMatchingBook(env,request,a.lab_id)' in training
assert 'requireMatchingBook(env,request,attempts[0].lab_id)' in training
assert json.loads((root/'PROJECT_MANIFEST.json').read_text())['version']in ('0.14.0.2','0.14.0.3','0.14.0.4')
assert "['demo_create','demo_delete'].includes(action)" in (root/'functions/_middleware.js').read_text()
assert "if(!c.roles.includes('OWNER'))return out({error:'Official Platform Guides require OWNER authority.'},403)" in (root/'functions/api/admin-v0133.js').read_text()
print('PASS static v0.14.0.1: direct Supabase forum writes guarded; 24h limits serialized; book access required; checkout reactivation blocked')
