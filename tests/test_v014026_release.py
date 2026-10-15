"""v0.14.0.26 — invariant checks; NOT live PostgreSQL validation."""
from pathlib import Path
import re,subprocess
R=Path(__file__).resolve().parents[1]
def read(p):
 f=R/p
 assert f.exists(),f'Missing release file: {p}'
 return f.read_text(encoding='utf-8')
release=re.search(r"VERSION:\s*'((?:\d+\.){3}\d+)'",read('config.js'))
assert release and tuple(map(int,release.group(1).split('.'))) >= (0,14,0,26)
version=release.group(1)
assert "version:'"+version+"'" in read('assets/js/route-policy.js')
assert 'groundup-v'+''.join(version.split('.'))+'-public' in read('sw.js')
for p in ['config.js','sw.js','assets/js/route-policy.js','assets/js/site.js',
 'functions/api/admin-report-case-history-v01425.js']:
 v=subprocess.run(['node','--check',str(R/p)],text=True,capture_output=True)
 assert v.returncode==0,(p,v.stderr)
sql=read('supabase/migrations/v0.14.0.26_REPORT_STATUS_AUDIT_GUARD_REVIEW_REQUIRED.sql')
for required in ['CREATE OR REPLACE FUNCTION public.gu_report_status_audit_v01426()',
 'RETURNS trigger','SECURITY DEFINER','SET search_path=pg_catalog,pg_temp',
 "'forum.report.status.guard.v01426'",'AFTER UPDATE OF status',
 'WHEN (OLD.status IS DISTINCT FROM NEW.status)',
 'INSERT INTO public.admin_audit_log','RAISE EXCEPTION',
 'REVOKE ALL','COMMIT;']:
 assert required in sql,required
assert 'EXCEPTION WHEN OTHERS' not in sql,'Never swallow failure to create audit evidence'
assert 'DROP TABLE' not in sql and 'TRUNCATE' not in sql
assert not re.search(r'(?m)^\s*UPDATE\s+public\.forum_reports',sql,re.I)
for p in ['supabase/admin/v0.14.0.26_AUDIT_GUARD_PREFLIGHT_READ_ONLY.sql',
 'supabase/admin/v0.14.0.26_AUDIT_GUARD_POSTFLIGHT_READ_ONLY.sql']:
 v=read(p)
 assert 'BEGIN TRANSACTION READ ONLY' in v and 'ROLLBACK;' in v
 assert not re.search(r'(?m)^\s*(?:CREATE|UPDATE|DELETE|INSERT|DROP|ALTER|TRUNCATE)\b',v,re.I)
assert 'v0.14.0.25' in read('README_START_HERE.md')
print('PASS v014026: fail-closed status audit source, no data disclosure, read-only verification files, version parity.')
