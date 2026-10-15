"""v0.14.0.27: read-only source contract CI; not staging/live database acceptance."""
from pathlib import Path
import re, subprocess
import yaml
ROOT=Path(__file__).resolve().parents[1]
def source(path):
 p=ROOT/path
 assert p.is_file(),f'Missing required version 27 file: {path}'
 return p.read_text(encoding='utf-8')
config=source('config.js')
route=source('assets/js/route-policy.js')
sw=source('sw.js')
assert "VERSION: '0.14.0.27'" in config
assert "version:'0.14.0.27'" in route
assert "const CACHE='groundup-v014027-public'" in sw
assert "req.method!=='GET'" in sw and "p.startsWith('/api/')" in sw
assert "'market-commons'" in route and "'admin'" in route
assert 'kdpSelectExclusive: true' in config and 'directDigitalSaleEnabled: false' in config
assert 'SUPABASE_SECRET_KEY' not in config
for path in ['config.js','assets/js/route-policy.js','sw.js']:
 result=subprocess.run(['node','--check',str(ROOT/path)],capture_output=True,text=True)
 assert result.returncode==0,(path,result.stderr)
workflow_dir=ROOT/'.github/workflows'
assert workflow_dir.is_dir()
workflows=list(workflow_dir.glob('*.yml'))+list(workflow_dir.glob('*.yaml'))
assert len(workflows)>=2  # Overlay has two workflows; merged repository checks every tracked workflow
for path in workflows:
 try: data=yaml.safe_load(path.read_text(encoding='utf-8'))
 except yaml.YAMLError as e: raise AssertionError(f'Invalid workflow YAML in {path}: {e}')
 assert isinstance(data,dict) and isinstance(data.get('jobs'),dict),path
assert 'Isolated browser: moderation and safe history rendering' in source('.github/workflows/backend-contract-v01425.yml')
assert "name: 'Isolated browser: moderation and safe history rendering'" in source('.github/workflows/backend-contract-v01425.yml')
for path in [
 'supabase/admin/v0.14.0.27_ANON_FUNCTION_EXPOSURE_READ_ONLY.sql',
 'supabase/admin/v0.14.0.27_REPORT_POLICY_PREFLIGHT_READ_ONLY.sql',
 'supabase/admin/v0.14.0.27_REPORT_POLICY_POSTFLIGHT_READ_ONLY.sql',
 'supabase/admin/v0.14.0.27_REPORT_AUDIT_SEARCH_PATH_READ_ONLY.sql']:
 s=source(path)
 assert 'BEGIN TRANSACTION READ ONLY;' in s and 'ROLLBACK;' in s,path
 assert not re.search(r'^\s*(?:CREATE|ALTER|DROP|GRANT|REVOKE|DELETE|UPDATE|INSERT|TRUNCATE|DO|CALL)\s',s,re.M|re.I),path
 assert not re.search(r'\b(?:pg_sleep|pg_advisory_lock)\s*\(',s,re.I),path
assert 'from pg_proc' in source('supabase/admin/v0.14.0.27_ANON_FUNCTION_EXPOSURE_READ_ONLY.sql').lower()
assert 'pg_catalog,pg_temp' in source('supabase/admin/v0.14.0.27_REPORT_AUDIT_SEARCH_PATH_READ_ONLY.sql')
assert 'community_report_policy_v01417' in source('supabase/admin/v0.14.0.27_REPORT_POLICY_PREFLIGHT_READ_ONLY.sql')
assert 'supabase/migrations/' not in ''.join((ROOT/'docs/BACKEND_AUDIT_FINDINGS_v0.14.0.27.csv').read_text().splitlines()[:1])
print(f'PASS v0.14.0.27: {len(workflows)} workflows parse, original CI repaired, version parity, runtime JS, read-only catalog auditing.')
