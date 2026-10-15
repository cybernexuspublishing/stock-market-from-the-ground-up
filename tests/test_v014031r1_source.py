"""v31 R1 source regression; catalog queries/CI still require live Supabase staging tests."""
from pathlib import Path
import re,subprocess
R=Path(__file__).resolve().parents[1]
def read(p):
 path=R/p
 assert path.is_file(), f'Missing {p}'
 return path.read_text(encoding='utf-8')
site=read('assets/js/site.js');sql=read('supabase/migrations/v0.14.0.31R1_ADMIN_ACCESS_COMMS_REVIEW_REQUIRED.sql')
for path in ['admin-communications-v01431r1.js','admin-account-usernames-v01431r1.js','admin-forum-usernames-v01431r1.js','admin-staff-shipping-v01431r1.js','registration-visibility-v01431r1.js']:
 assert path in site,path
 for item in ['assets/js/'+path]:
  r=subprocess.run(['node','--check',str(R/item)],capture_output=True,text=True)
  assert r.returncode==0,(item,r.stderr)
for item in ['gu_staff_identity_v01431r1','gu_v01431r1_control_write_guard','gu_owner_operations_save_v01431r1','gu_staff_send_notice_v01431r1','gu_notice_send_policy_v01431r1',
 'gu_staff_signed_shipping_session_v01431r1','gu_staff_signed_orders_v01431r1',"'SHOWCASE_VIEWER'",'OWNER','ADMIN','AAL2','FOR UPDATE','admin_audit_log','REVOKE ALL',
 'SET search_path=pg_catalog,pg_temp','commerce.checkout_enabled','commerce.signed_books_checkout_enabled','communications.admin_member_notices_enabled',
 'commerce.admin_shipping_address_access_enabled','notification_type',"role='ADMIN'", "p.username"]:
 assert item.lower() in sql.lower(),item
assert 'BEFORE INSERT OR UPDATE OR DELETE' in sql
assert 'PROTECTED_SETTING_KEY_CANNOT_BE_RENAMED' in sql
assert "'false'::jsonb" in sql and "'true'::jsonb" in sql
assert re.search(r'ON CONFLICT\(setting_key\) DO NOTHING',sql)
assert not re.search(r'(?im)^\s*(?:DELETE FROM|TRUNCATE|DROP TABLE)\b',sql)
source=read('functions/api/signed-book-owner-detail.js')
assert 'gu_staff_signed_shipping_session_v01431r1' in source
assert 'gu_signed_owner_session_v01431' not in source
assert 'payment_status' in source and 'client_reference_id' in source
assert 'STRIPE_SECRET_KEY' in source and 'cache-control' in source
base=read('supabase/migrations/v0.14.0.31_SIGNED_BOOK_STRIPE_REVIEW_REQUIRED.sql')
assert "'username',coalesce(p.username,'Unavailable')" in base
assert 'LEFT JOIN public.profiles p ON p.id=o.user_id' in base
assert 'Stripe' in read('README_START_HERE.md')
for kind in ['PREFLIGHT','POSTFLIGHT']:
 p=f'supabase/admin/v0.14.0.31R1_ADMIN_COMMS_{kind}_READ_ONLY.sql';s=read(p)
 assert 'BEGIN TRANSACTION READ ONLY;' in s and 'ROLLBACK;' in s
 assert not re.search(r'(?im)^\s*(?:CREATE|UPDATE|INSERT|DELETE|DROP|GRANT|REVOKE|TRUNCATE)\b',s)
print('PASS v31R1 — merged v31 source, username identity mapping, Owner/ADMIN MFA, secure settings, notice and shipping guards.')
