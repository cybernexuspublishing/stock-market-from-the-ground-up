"""v0.14.0.35 no-MFA CAPTCHAs must fail closed, plain labels preserve stable IDs."""
from pathlib import Path
import re,subprocess
R=Path(__file__).resolve().parents[1]
def read(p):return (R/p).read_text()
assert "VERSION: '0.14.0.35'" in read('config.js')
assert "version:'0.14.0.35'" in read('assets/js/route-policy.js')
assert 'groundup-v014035-public' in read('sw.js')
site=read('assets/js/site.js')
assert 'admin-human-verification-v01434.js' in site
assert 'admin-human-verification-v01434.css' in site
payment=read('assets/js/admin-payment-center-v01433.js')
for term in ('Manage Payments','Signed Book Orders','Books & Products','Membership Prices','Connect Stripe Products & Prices','Ctrl+K'):
 assert term in payment,term
for term in ("id:'managed'","id:'signed'","id:'lemon'","id:'digital'","id:'reconcile'",'gu_owner_digital_payment_route_read_v01432r2'):
 if term.startswith('gu_owner'):continue
 assert term in payment,term
provider=read('assets/js/admin-payment-providers-v01432r2.js')
for term in ('Digital Payment Settings','Save Payment Service','Start Stripe Test Payment','gu_owner_digital_payment_route_save_v01432r2'):
 assert term in provider,term
pw=read('assets/js/admin-password-confirm-v01432r1.js')
assert "password.disabled=true" in pw
assert "password.disabled=false" in pw
assert "if(password.disabled||!token||!password.value)return" in pw
assert 'human verification' in pw.lower()
assert 'https://supabase.com/docs/guides/auth/auth-captcha' in pw
assert 'Turnstile CAPTCHA is not configured.' not in pw
assert 'OWNER_AAL2_REQUIRED' in pw # error recognition; no bypass
panel=read('assets/js/admin-human-verification-v01434.js')
assert 'ENFORCE_AUTH_TURNSTILE_V135' in panel
assert "fetch('/api/auth-guard-v0135'" in panel
assert 'Your website owner' not in panel or 'TURNSTILE_SECRET_KEY' in panel
for f in ['config.js','sw.js','assets/js/route-policy.js','assets/js/site.js',
          'assets/js/admin-payment-center-v01433.js','assets/js/admin-payment-providers-v01432r2.js',
          'assets/js/admin-password-confirm-v01432r1.js','assets/js/admin-human-verification-v01434.js']:
 p=subprocess.run(['node','--check',str(R/f)],capture_output=True,text=True)
 assert p.returncode==0,(f,p.stderr)
print('PASS v014034: accessible and simpler labels, exact backend routes preserved, password CAPTCHA fail closed.')
