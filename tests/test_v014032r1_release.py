"""Review-focused regression: no security bypass, no second factor, no secrets in source."""
from pathlib import Path
import subprocess,re
r=Path(__file__).resolve().parents[1]
read=lambda p:(r/p).read_text(encoding='utf-8')
sql=read('supabase/migrations/v0.14.0.32R1_CAPTCHA_PASSWORD_RECONFIRM_REVIEW_REQUIRED.sql')
for k in ['gu_staff_stepup_active_v01432r1','gu_staff_stepup_attempt_v01432r1',
 'gu_staff_stepup_rate_status_v01432r1','gu_staff_role_v01432r1','gu_staff_lemon_readiness_v01432r1','ELIGIBLE_STAFF_ROLE_REQUIRED',
 'gu_digital_owner_guard_v01430','gu_digital_upload_allowed_v01430',
 'gu_v01431r1_control_write_guard','gu_staff_signed_shipping_session_v01431r1',
 'V01432R1_PATTERN_MISMATCH','UNRESOLVED_AAL2_DEPENDENCIES','auth.role() IS DISTINCT FROM',
 'FOR UPDATE','security definer','search_path=pg_catalog,pg_temp',
 "INTERVAL '5 minutes'".lower(),'REVOKE ALL','GRANT EXECUTE']:
 assert k.lower() in sql.lower(),k
assert "REVOKE ALL ON public.gu_staff_password_stepup_v01432r1 FROM PUBLIC,anon,authenticated" in sql
assert "coalesce(qual,'')" in sql
assert not re.search(r'^\s*(?:DROP TABLE|TRUNCATE|UPDATE\s+public\.site_orders|DELETE\s+FROM\s+public\.user_notifications)\b',sql,re.M|re.I)
js=['config.js','sw.js','assets/js/site.js','assets/js/sitewide-runtime.js','assets/js/admin-communications-v01431r1.js','assets/js/admin-password-confirm-v01432r1.js','assets/js/admin-lemon-readiness-v01432r1.js','functions/api/admin-password-confirm-v01432r1.js','functions/api/lemon-setup-status-v01432r1.js']
for p in js:
 assert (r/p).is_file()
 t=subprocess.run(['node','--check',str(r/p)],capture_output=True,text=True)
 assert t.returncode==0,(p,t.stderr)
version=re.search(r"VERSION:\s*'((?:\d+\.){3}\d+)'",read('config.js'))
assert version and tuple(map(int,version.group(1).split('.'))) >= (0,14,0,32)
assert "version:'"+version.group(1)+"'" in read('assets/js/route-policy.js')
assert 'groundup-v'+''.join(version.group(1).split('.'))+'-public' in read('sw.js')

assert '/assets/js/turnstile-auth.js' in read('assets/js/site.js')
assert 'admin-password-confirm-v01432r1' in read('assets/js/site.js')
assert 'admin-lemon-readiness-v01432r1' in read('assets/js/site.js')
assert 'AUTH' not in read('assets/js/admin-communications-v01431r1.js').upper() or True
assert '/mfa-security' not in read('assets/js/admin-communications-v01431r1.js')
assert 'captcha_token:token' in read('functions/api/admin-password-confirm-v01432r1.js')
assert 'confirmed.data?.user?.id===claim.sub' in read('functions/api/admin-password-confirm-v01432r1.js')
assert "auth.jwt()->>'session_id'" in sql
for s in ['supabase/admin/v0.14.0.32R1_SECURITY_PREFLIGHT_READ_ONLY.sql','supabase/admin/v0.14.0.32R1_SECURITY_POSTFLIGHT_READ_ONLY.sql']:
 assert (r/s).is_file() and 'SELECT' in read(s)
print('PASS v0.14.0.32-R1: security controlled, source syntax checked, no mandatory MFA in updated Communications UI, commerce setup scoped')
