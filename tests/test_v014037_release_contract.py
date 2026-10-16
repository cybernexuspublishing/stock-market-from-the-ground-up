"""v0.14.0.37 — static source and payment-integration inventory tests."""
import json,re,subprocess
from pathlib import Path
R=Path(__file__).resolve().parents[1]
load=lambda p:(R/p).read_text(encoding='utf-8')
registry=json.loads(load('data/stripe-product-registry-v01437.json'))
assert registry['version']=='0.14.0.37'
assert len(registry['products'])==8
assert len(set(p['stripe_product_id'] for p in registry['products']))==8
assert len(set(p['sku'] for p in registry['products']))==8
assert all(p['stripe_price_id'] is None for p in registry['products'])
assert all(re.match(r'^prod_[A-Za-z0-9]+$',p['stripe_product_id']) for p in registry['products'])
assert {p['sku']:p['price_cents'] for p in registry['products']}['plan:FULL_ANNUAL']==69900
assert '0.14.0.38' in load('config.js')
assert "version:'0.14.0.38'" in load('assets/js/route-policy.js')
assert 'groundup-v014038-public' in load('sw.js')
assert json.loads(load('data/commerce-config.json'))['version']=='0.14.0.38'
assert json.loads(load('release-manifest.json'))['customerCheckoutApproved'] is False
assert 'stripe-product-registry-v01437.json' in load('scripts/build-pages.sh')
assert 'admin-stripe-catalog-v01437.js' in load('assets/js/site.js')
assert 'Stripe Price ID' in load('assets/js/admin-stripe-catalog-v01437.js')
assert 'GU_ADMIN_ROLE' not in load('assets/js/admin-stripe-catalog-v01437.js')
assert '/rest/v1/rpc/gu_owner_digital_payment_route_read_v01432r2' in load('functions/api/stripe-product-readiness-v01437.js')
assert 'customerCheckoutEnabledByThisRelease:false' in load('functions/api/stripe-product-readiness-v01437.js')
assert 'site_orders' not in load('functions/api/stripe-product-readiness-v01437.js')
assert 'user_plan_grants' not in load('functions/api/stripe-product-readiness-v01437.js')
for p in ['config.js','sw.js','assets/js/site.js','assets/js/admin-stripe-catalog-v01437.js','assets/js/admin-simple-navigation-v014036.js','assets/js/route-policy.js','functions/api/stripe-product-readiness-v01437.js']:
 r=subprocess.run(['node','--check',str(R/p)],capture_output=True,text=True)
 assert r.returncode==0,(p,r.stderr)
print('PASS v0.14.0.37: eight products, correct amounts, no invented price IDs, admin catalog, security and version consistency')
