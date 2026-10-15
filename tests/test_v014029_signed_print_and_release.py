"""v0.14.0.29 preservation contract updated for v31 truthful live signed-copy messaging."""
from pathlib import Path
import re,subprocess
R=Path(__file__).resolve().parents[1]
def read(p):return (R/p).read_text(encoding='utf-8')
conf=read('config.js');m=re.search(r"VERSION:\s*'((?:\d+\.){3}\d+)'",conf)
assert m and tuple(map(int,m.group(1).split('.'))) >=(0,14,0,29)
assert "version:'"+m.group(1)+"'" in read('assets/js/route-policy.js')
assert 'groundup-v'+''.join(m.group(1).split('.'))+'-public' in read('sw.js')
site=read('assets/js/site.js');store=read('assets/js/print-store-channels-v01428.js')
assert 'admin-print-modes-v01429.js' in site
assert 'print_fulfillment_v01429' in store
assert 'lulu_enabled===true' in store and 'signed_available===true' in store
assert 'Signed copies will be personally signed' in store
assert 'online payment is not yet available' not in store
assert 'gu_owner_print_modes_save_v01429' in read('assets/js/admin-print-modes-v01429.js')
for path in ['config.js','sw.js','assets/js/route-policy.js','assets/js/print-store-channels-v01428.js','assets/js/admin-print-modes-v01429.js','assets/js/site.js']:
 r=subprocess.run(['node','--check',str(R/path)],capture_output=True,text=True)
 assert r.returncode==0,(path,r.stderr)
sql=read('supabase/migrations/v0.14.0.29_SIGNED_PRINT_FULFILLMENT_MODES_REVIEW_REQUIRED.sql')
for s in ['gu_print_owner_guard_v01428()','OWNER_MFA_REQUIRED','FOR UPDATE','PRINT_SETTINGS_STALE_REFRESH','admin_audit_log','REVOKE ALL','GRANT EXECUTE','SECURITY DEFINER','search_path=pg_catalog,pg_temp','signed_checkout_live',"'lulu_enabled'","'signed_available'"]:
 assert s in sql,s
assert not re.search(r'(?im)^\s*(?:DELETE FROM|DROP TABLE|TRUNCATE)\s',sql)
for p in ['supabase/admin/v0.14.0.29_PRINT_MODE_PREFLIGHT_READ_ONLY.sql','supabase/admin/v0.14.0.29_PRINT_MODE_POSTFLIGHT_READ_ONLY.sql']:
 assert 'BEGIN TRANSACTION READ ONLY;' in read(p)
assert 'v0.14.0.25' in read('docs/BACKEND_PHASE_7_v0.14.0.26.md')
assert 'v0.14.0.28' in read('docs/COMMERCE_AND_BOOK_PUBLISHING_v0.14.0.28.md')
print('PASS v014029 inherited: Lulu toggle, signed availability, OWNER role and audit integrity.')
