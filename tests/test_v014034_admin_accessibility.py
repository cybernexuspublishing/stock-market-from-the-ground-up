"""Historical payment/Admin labels and CAPTCHA safety contracts, version-aware."""
from pathlib import Path
import subprocess,json
R=Path(__file__).resolve().parents[1];read=lambda p:(R/p).read_text()
version=json.loads(read("release-manifest.json"))["version"]
cache_version=version.replace(".","")
assert f"VERSION: '{version}'" in read('config.js')
assert f"version:'{version}'" in read('assets/js/route-policy.js')
assert f'groundup-v{cache_version}-public' in read('sw.js')
site=read('assets/js/site.js')
assert 'admin-human-verification-v01434.js' in site
assert 'admin-human-verification-v01434.css' in site
payment=read('assets/js/admin-payment-center-v01433.js')
for term in ('Manage Payments','Signed Book Orders','Books & Products','Membership Prices','Connect Stripe Products & Prices','Ctrl+K'):
 assert term in payment,term
for term in ("id:'managed'","id:'signed'","id:'lemon'","id:'digital'","id:'reconcile'"):
 assert term in payment,term
provider=read('assets/js/admin-payment-providers-v01432r2.js')
for term in ('Digital Payment Settings','Save Payment Service','Start Stripe Test Payment','gu_owner_digital_payment_route_save_v01432r2'):
 assert term in provider,term
pw=read('assets/js/admin-password-confirm-v01432r1.js')
assert 'password.disabled=true' in pw and 'password.disabled=false' in pw
assert 'if(password.disabled||(captchaRequired&&!token)||!password.value)return' in pw
assert "captchaRequired=cfg.enabled===true" in pw
assert "password is still required" in pw.lower()
assert 'human verification' in pw.lower()
assert 'https://supabase.com/docs/guides/auth/auth-captcha' in pw
assert 'Turnstile CAPTCHA is not configured.' not in pw
assert 'OWNER_AAL2_REQUIRED' in pw
panel=read('assets/js/admin-human-verification-v01434.js')
assert "'/api/owner-captcha-control'" in panel
assert 'window.GroundUpAdminPasswordConfirm?.ensure' in panel
assert "fetch('/api/auth-guard-v0135'" in panel
assert 'Your website owner' not in panel or 'TURNSTILE_SECRET_KEY' in panel
for f in ['config.js','sw.js','assets/js/route-policy.js','assets/js/site.js',
          'assets/js/admin-payment-center-v01433.js','assets/js/admin-payment-providers-v01432r2.js',
          'assets/js/admin-password-confirm-v01432r1.js','assets/js/admin-human-verification-v01434.js']:
 r=subprocess.run(['node','--check',str(R/f)],capture_output=True,text=True)
 assert r.returncode==0,(f,r.stderr)
print('PASS v014034: no forced MFA, protected settings, clear payment/Admin labels')
