"""v0.14.0.24 source-gated report moderation API and database contracts."""
from pathlib import Path
import re,subprocess
R=Path(__file__).resolve().parents[1]
def read(p):
 f=R/p
 assert f.is_file(),p
 return f.read_text(encoding='utf-8')
for f in ['config.js','sw.js','assets/js/site.js','assets/js/route-policy.js',
 'assets/js/admin-report-cases-v01424.js','functions/api/admin-report-cases-v01424.js']:
 result=subprocess.run(['node','--check',str(R/f)],capture_output=True,text=True)
 assert result.returncode==0,(f,result.stderr)
config=read('config.js')
assert "VERSION: '0.14.0.24'" in config
assert "version:'0.14.0.24'" in read('assets/js/route-policy.js')
assert 'groundup-v014024-public' in read('sw.js')
assert 'admin-report-cases-v01424.js' in read('assets/js/site.js')
assert 'admin-report-cases-v01424.css' in read('assets/js/site.js')
api=read('functions/api/admin-report-cases-v01424.js')
for tok in ['gu_mod_case_list_v01424','gu_mod_case_transition_v01424','/auth/v1/user',
            'expectedStatus','reportId','no-store','MODERATION_STALE']:
 assert tok in api,tok
assert 'SUPABASE_SECRET_KEY' not in api
assert "Bearer '+token" in api
sql=read('supabase/migrations/v0.14.0.24_MODERATION_CASES_REVIEW_REQUIRED.sql')
for tok in ['BEGIN;','COMMIT;','SECURITY DEFINER','auth.uid()','SHOWCASE_VIEWER',
 'forum.moderate','gu_mod_case_actor_v01424','gu_mod_case_list_v01424',
 'gu_mod_case_transition_v01424','FOR UPDATE','MODERATION_STALE',
 'INSERT INTO public.admin_audit_log','GRANT EXECUTE','REVOKE ALL','p_expected_status',
 'resolution_note','MODERATION_FORBIDDEN']:
 assert tok in sql,tok
assert not re.search(r'\b(?:DROP\s+TABLE|TRUNCATE|DELETE\s+FROM)\b',sql,re.I)
assert 'user_id' not in re.search(r'gu_mod_case_transition_v01424\((.*?)\)',sql,re.S).group(1)
for p in ['supabase/admin/v0.14.0.24_MODERATION_PREFLIGHT_READ_ONLY.sql',
 'supabase/admin/v0.14.0.24_MODERATION_POSTFLIGHT_READ_ONLY.sql']:
 s=read(p).upper();assert 'BEGIN TRANSACTION READ ONLY;' in s and 'ROLLBACK;' in s
 assert not re.search(r'(?m)^\s*(INSERT|UPDATE|DELETE|CREATE|DROP|ALTER|TRUNCATE)\b',s)
print('PASS v01424: authorization, atomic-audit SQL, read-only database checks, asset source contracts.')
