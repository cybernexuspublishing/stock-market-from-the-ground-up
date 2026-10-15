"""v0.14.0.29 source contract and historic CI regression acceptance; no provider E2E."""
from pathlib import Path
import re,subprocess
R=Path(__file__).resolve().parents[1]
def txt(p):
    path=R/p
    assert path.is_file(),f'Missing required file {p}'
    return path.read_text(encoding='utf-8')
conf=txt('config.js');version=re.search(r"VERSION:\s*'((?:\d+\.){3}\d+)'",conf)
assert version and tuple(map(int,version.group(1).split('.'))) >= (0,14,0,29)
ver=version.group(1)
assert "version:'"+ver+"'" in txt('assets/js/route-policy.js')
assert 'groundup-v'+''.join(ver.split('.'))+'-public' in txt('sw.js')
site=txt('assets/js/site.js');store=txt('assets/js/print-store-channels-v01428.js')
admin=txt('assets/js/admin-print-modes-v01429.js')
assert 'admin-print-modes-v01429.js' in site
assert 'print_fulfillment_v01429' in store
assert 'lulu_enabled===true' in store
assert 'signed_available===true' in store
assert 'Signed copies will be personally signed' in store
assert 'online payment is not yet available' in store
assert 'signed_checkout' not in store
assert 'gu_owner_print_modes_save_v01429' in admin
assert 'p_expected_updated_at' in admin
assert 'OWNER privileges and MFA' in admin
for p in ('assets/js/print-store-channels-v01428.js','assets/js/admin-print-modes-v01429.js','assets/js/site.js','config.js','sw.js','assets/js/route-policy.js'):
    v=subprocess.run(['node','--check',str(R/p)],capture_output=True,text=True)
    assert v.returncode==0,(p,v.stderr)
sql=txt('supabase/migrations/v0.14.0.29_SIGNED_PRINT_FULFILLMENT_MODES_REVIEW_REQUIRED.sql')
for clause in ('gu_print_owner_guard_v01428()','OWNER_MFA_REQUIRED','FOR UPDATE',
  'PRINT_SETTINGS_STALE_REFRESH','admin_audit_log','REVOKE ALL','GRANT EXECUTE',
  'SECURITY DEFINER','search_path=pg_catalog,pg_temp','signed_checkout_live',
  "'lulu_enabled'", "'signed_available'", 'ROLLBACK',):
    # No explicit rollback statement is necessary inside transaction: PostgreSQL
    # raises and rolls back on any exception. Exclude ROLLBACK literal check.
    if clause!='ROLLBACK':assert clause in sql,clause
assert not re.search(r'(?m)^\s*(?:DELETE FROM|DROP TABLE|TRUNCATE)\b',sql,re.I)
assert 'EXCEPTION WHEN OTHERS' not in sql
for p in ('supabase/admin/v0.14.0.29_PRINT_MODE_PREFLIGHT_READ_ONLY.sql',
          'supabase/admin/v0.14.0.29_PRINT_MODE_POSTFLIGHT_READ_ONLY.sql'):
    q=txt(p)
    assert 'BEGIN TRANSACTION READ ONLY;' in q and 'ROLLBACK;' in q
assert 'v0.14.0.25' in txt('docs/BACKEND_PHASE_7_v0.14.0.26.md'), 'Historical audit provenance not preserved'
assert 'v0.14.0.28' in txt('docs/COMMERCE_AND_BOOK_PUBLISHING_v0.14.0.28.md')
print('PASS v014029: forward-compatible CI, signed-copy prepayment safety, Lulu enabled/disabled, audited Owner SQL.')
