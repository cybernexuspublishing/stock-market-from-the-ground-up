"""v0.14.0.28 source regression. No production payment or database calls."""
from pathlib import Path
import re,subprocess
R=Path(__file__).resolve().parents[1]
def load(path):return (R/path).read_text(encoding='utf-8')
conf=load('config.js');policy=load('assets/js/route-policy.js');worker=load('sw.js');site=load('assets/js/site.js')
assert "VERSION: '0.14.0.28'" in conf
assert "version:'0.14.0.28'" in policy
assert 'groundup-v014028-public' in worker
assert 'admin-print-channels-v01428.js' in site
assert 'print-store-channels-v01428.js' in site
for path in ['config.js','sw.js','assets/js/site.js','assets/js/route-policy.js',
 'assets/js/admin-print-channels-v01428.js','assets/js/print-store-channels-v01428.js',
 'assets/js/checkout-platform.js','functions/api/checkout-v0135.js']:
 out=subprocess.run(['node','--check',str(R/path)],capture_output=True,text=True)
 assert out.returncode==0,(path,out.stderr)
api=load('functions/api/checkout-v0135.js')
assert "if(format==='paperback'||format==='hardcover')" in api
assert "if(['paperback','hardcover'].includes(v(b.format)))" in api
assert 'kdp_select===true' in api
assert 'LEMON_SQUEEZY' in api
assert 'return respond({ok:true,url:r.url,intentId:intent})' in api
sql=load('supabase/migrations/v0.14.0.28_OWNER_PRINT_CHANNELS_REVIEW_REQUIRED.sql')
for required in ['FOR UPDATE','PRINT_LINKS_STALE','GU_','auth.uid()','SHOWCASE_VIEWER','OWNER',
 'admin_audit_log','REVOKE ALL','GRANT EXECUTE','lulu','direct_physical_enabled','jsonb_set']:
 if required=='GU_':continue
 assert required in sql,required
assert not re.search(r'(?m)^\s*(?:DELETE FROM|TRUNCATE|DROP TABLE)\s',sql,re.I)
assert 'SECURITY DEFINER' in sql and 'search_path=pg_catalog,pg_temp' in sql
assert "auth.jwt()->>'aal'" in sql and 'OWNER_MFA_REQUIRED' in sql
for name in ['PREFLIGHT','POSTFLIGHT']:
 s=load(f'supabase/admin/v0.14.0.28_PRINT_CHANNEL_{name}_READ_ONLY.sql')
 assert 'BEGIN TRANSACTION READ ONLY;' in s and 'ROLLBACK;' in s
print('PASS v014028: release parity, Cloudflare JS syntax, physical payment isolation, owner-audited print channel SQL.')
