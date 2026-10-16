from pathlib import Path
import json,subprocess
root=Path(__file__).resolve().parents[1];read=lambda x:(root/x).read_text()
assert "VERSION: '0.14.0.39'" in read('config.js')
assert 'groundup-v014039-public' in read('sw.js')
assert json.loads(read('release-manifest.json'))['version']=='0.14.0.39'
assert json.loads(read('release-manifest.json'))['customerCheckoutApproved'] is False
assert 'no mandatory MFA' in read('assets/js/signin.js')
assert '__guAuthTurnstileBooted' in read('assets/js/turnstile-auth.js')
assert 'GU_STRIPE_V38_STAGING_PROJECT_REF' in read('functions/api/stripe-customer-checkout-v01438.js')
assert 'GU_STRIPE_V38_STAGING_PROJECT_REF' in read('functions/api/stripe-customer-webhook-v01438.js')
assert 'signature' in read('functions/api/stripe-customer-webhook-v01438.js').lower() or 'checkHmac' in read('functions/api/stripe-customer-webhook-v01438.js')
assert 'GRANT EXECUTE ON FUNCTION' in read('supabase/migrations/v0.14.0.38_STRIPE_LIFECYCLE_STAGING_REVIEW_REQUIRED.sql')
assert 'FROM PUBLIC,anon,authenticated' in read('supabase/migrations/v0.14.0.38_STRIPE_LIFECYCLE_STAGING_REVIEW_REQUIRED.sql')
for file in ['config.js','sw.js','assets/js/site.js','assets/js/signin.js','assets/js/turnstile-auth.js','assets/js/checkout-platform.js','functions/api/stripe-customer-checkout-v01438.js','functions/api/stripe-customer-webhook-v01438.js']:
 p=subprocess.run(['node','--check',str(root/file)],capture_output=True,text=True)
 assert p.returncode==0,(file,p.stderr)
print('PASS v01438 historical staging limitations retained, current release metadata matched')
