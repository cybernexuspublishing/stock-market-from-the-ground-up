"""v0.14.0.25: source-only checks; not a production database E2E test."""
from pathlib import Path
import re,subprocess
ROOT=Path(__file__).resolve().parents[1]
def read(p):return (ROOT/p).read_text(encoding='utf-8')
config=read('config.js');policy=read('assets/js/route-policy.js');worker=read('sw.js')
release=re.search(r"VERSION: '((?:\d+\.){3}\d+)'",config)
assert release,'Missing public version metadata'
version=release.group(1)
assert tuple(map(int,version.split('.'))) >= (0,14,0,25),'Downgrade below the v025 audited history baseline'
assert "version:'"+version+"'" in policy,'Route policy differs from public version'
assert 'groundup-v'+''.join(version.split('.'))+'-public' in worker,'Service-worker cache differs from release version'
for file in ['assets/js/site.js','assets/js/admin-report-cases-v01424.js',
 'functions/api/admin-report-case-history-v01425.js','config.js','assets/js/route-policy.js','sw.js']:
 result=subprocess.run(['node','--check',str(ROOT/file)],capture_output=True,text=True)
 assert result.returncode==0,(file,result.stderr)
case=read('assets/js/admin-report-cases-v01424.js')
assert 'View decision history' in case
assert "make('p',event.note||'No decision note recorded.')" in case
assert 'innerHTML' not in case, 'Audit notes must never be injected as HTML'
api=read('functions/api/admin-report-case-history-v01425.js')
assert '/auth/v1/user' in api and 'gu_mod_case_history_v01425' in api
assert 'SUPABASE_SECRET_KEY' not in api
assert 'reportId' in api and 'no-store' in api
sql=read('supabase/migrations/v0.14.0.25_MODERATION_AUDIT_HISTORY_REVIEW_REQUIRED.sql')
for k in ['SECURITY DEFINER','auth','gu_mod_case_actor_v01424()','forum.report.case.%',
 'REVOKE ALL','GRANT EXECUTE','LIMIT 50','NOTIFY pgrst']:
 assert k in sql,k
assert not re.search(r'(?m)^\s*(?:DROP TABLE|DELETE FROM|TRUNCATE|UPDATE|INSERT INTO)\b',sql,re.I)
for p in ['supabase/admin/v0.14.0.25_AUDIT_PREFLIGHT_READ_ONLY.sql',
          'supabase/admin/v0.14.0.25_AUDIT_POSTFLIGHT_READ_ONLY.sql']:
 txt=read(p)
 assert 'BEGIN TRANSACTION READ ONLY;' in txt and 'ROLLBACK;' in txt
 assert not re.search(r'(?m)^\s*(?:DROP|DELETE|TRUNCATE|UPDATE|INSERT|CREATE)\s',txt,re.I)
workflow=read('.github/workflows/backend-contract-v01424.yml')
assert 'python -m playwright install --with-deps chromium' in workflow
assert 'playwright==1.57.0' in workflow
print('PASS: v014025 audit history API, SQL read-only role boundary, frontend XSS control, corrected browser CI setup.')
