"""v0.14.0.23 source/API, security, SQL structure and Cloudflare build contract."""
from pathlib import Path
import subprocess,re
R=Path(__file__).resolve().parents[1]
def read(path):
    file=R/path
    assert file.is_file(),f'Missing {path}'
    return file.read_text(encoding='utf-8')
for p in ['config.js','sw.js','assets/js/route-policy.js','assets/js/site.js',
          'assets/js/member-mentions.js','assets/js/mention-notification-preferences-v01423.js',
          'assets/js/admin-community-health-v01423.js',
          'functions/api/community-mention-preferences-v01423.js',
          'functions/api/community-health-v01423.js']:
    test=subprocess.run(['node','--check',str(R/p)],capture_output=True,text=True)
    assert test.returncode==0,(p,test.stderr)
config=read('config.js');site=read('assets/js/site.js');worker=read('sw.js');policy=read('assets/js/route-policy.js')
assert "VERSION: '0.14.0.23'" in config
assert "version:'0.14.0.23'" in policy
assert 'groundup-v014023-public' in worker
assert 'admin-community-health-v01423.js' in site
assert 'mention-notification-preferences-v01423.js' in site
assert 'mention-notifications-v01423.css' in site
member=read('functions/api/community-mention-preferences-v01423.js')
assert 'SUPABASE_SECRET_KEY' not in member
assert "'/auth/v1/user'" in member
assert 'p_mentions_enabled' in member
assert 'Object.keys(b).length!==1' in member
assert 'cache-control' in member and 'no-store' in member
admin=read('functions/api/community-health-v01423.js')
for guard in ['SHOWCASE_VIEWER','OWNER','restricted','suspended','REQUIRE_STAFF_AAL2_V135']:
    assert guard in admin
assert "prefer:'count=exact'" in admin
assert "count:null" in admin
sql=read('supabase/migrations/v0.14.0.23_COMMONS_MENTION_NOTIFICATIONS_REVIEW_REQUIRED.sql')
for term in ['BEGIN;','COMMIT;','ENABLE ROW LEVEL SECURITY','REVOKE ALL','GRANT EXECUTE','SECURITY DEFINER',
             'gu_commons_mention_pref_get_v01423','gu_commons_mention_pref_save_v01423',
             'gu_commons_emit_mentions_v01423','AFTER INSERT','commons_topics','commons_posts',
             'coalesce','ON CONFLICT DO NOTHING','mentions_enabled IS TRUE',
             'requested_count','book_code IS NULL','tool_code IS NULL']:
    assert term in sql,term
assert 'DROP TABLE' not in sql.upper()
assert 'DELETE FROM public.' not in sql
assert 'service_role' in sql
assert 'NEW.body' in sql
assert '25' in sql and '>5' in sql
for f in ['supabase/admin/v0.14.0.23_MENTION_PREFLIGHT_READ_ONLY.sql',
          'supabase/admin/v0.14.0.23_MENTION_POSTFLIGHT_READ_ONLY.sql']:
    script=read(f).upper();assert 'BEGIN TRANSACTION READ ONLY;' in script and 'ROLLBACK;' in script
    assert 'CREATE TABLE' not in script and 'INSERT INTO' not in script
print('PASS: v0.14.0.23 API/source guards, SQL review boundary and CI syntax checks.')
