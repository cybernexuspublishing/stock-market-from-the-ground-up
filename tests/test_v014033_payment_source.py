"""v0.14.0.33 admin payment source and release parity, no live production claims."""
from pathlib import Path
import re,subprocess
R=Path(__file__).resolve().parents[1]
def get(p):return (R/p).read_text()
release=re.search(r"VERSION:\s*'((?:\d+\.){3}\d+)'",get('config.js'))
assert release and tuple(map(int,release.group(1).split('.'))) >= (0,14,0,33)
version=release.group(1)
assert "version:'"+version+"'" in get('assets/js/route-policy.js')
assert 'groundup-v'+''.join(version.split('.'))+'-public' in get('sw.js')
site=get('assets/js/site.js')
assert "admin-payment-center-v01433.js" in site
assert "admin-payment-center-v01433.css" in site
admin=get('assets/js/admin-payment-center-v01433.js')
for s in ["Stripe Managed Payments","Lemon Squeezy","Standard Stripe","Lulu Direct","Reconciliation & Webhooks","Stripe Digital Products & Price Mapping","gu33-global-input", "Payment Operations"]:
 assert s in admin,s
assert 'data-gu-managed-r2' in admin
assert 'payment-provider-status-v01432r2' in admin
assert 'payment-catalog-v01433' in admin
assert 'canReadEntireDatabase' not in admin
api=get('functions/api/payment-catalog-v01433.js')
for s in ['gu_owner_digital_payment_route_read_v01432r2','OWNER/ADMIN',"price_",'cache:', 'apikey:secret']:
 assert s in api,s
assert 'onRequestPost' in api
assert not re.search(r'(?i)update\s+public\.|delete\s+from\s+public\.|insert\s+into\s+public\.',api)
for p in ['config.js','sw.js','assets/js/route-policy.js','assets/js/site.js','assets/js/admin-payment-center-v01433.js','functions/api/payment-catalog-v01433.js']:
 r=subprocess.run(['node','--check',str(R/p)],capture_output=True,text=True)
 assert r.returncode==0,(p,r.stderr)
assert 'UPGRADE_PENDING' not in get('docs/ADMIN_PAYMENT_CENTER_v0.14.0.33.md')
print('PASS v014033: new admin payment hub + search + least privilege catalog + release parity')
