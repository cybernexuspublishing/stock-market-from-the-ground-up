"""v0.14.0.37 consolidated source guards; no live payment or database mutation."""
from pathlib import Path
import json, re, subprocess
R=Path(__file__).resolve().parents[1]
read=lambda p:(R/p).read_text(encoding='utf-8')
assert "VERSION: '0.14.0.37'" in read('config.js')
assert "version:'0.14.0.37'" in read('assets/js/route-policy.js')
assert "groundup-v014037-public" in read('sw.js')
assert '0.14.0.37' == json.loads(read('data/commerce-config.json'))['version']
assert '0.14.0.37' == json.loads(read('release-manifest.json'))['version']
assert json.loads(read('release-manifest.json'))['customerCheckoutApproved'] is False
assert 'settings[\'site.version\']' in read('assets/js/commerce-common.js') # tracked as legacy metadata only
assert "version:String(window.SITE_CONFIG?.VERSION" in read('assets/js/commerce-common.js')
assert "loadOnce('/assets/js/admin-simple-navigation-v014036.js'" in read('assets/js/site.js')
assert "loadOnce('/assets/js/release-integrity-v014036.js'" in read('assets/js/site.js')
nav=read('assets/js/admin-simple-navigation-v014036.js')
for name in ['Dashboard','Members & Accounts','Payments & Billing','Books & Learning','Market Commons','Communications','Marketing & Advertising','Website Settings','Security & Reports','Grant Web Solutions','All admin controls']:
 assert name in nav,name
assert 'details.append(nav)' in nav  # do not clone/delete original buttons & click handlers
assert "cc-owner-hidden" in nav
assert 'GU_ADMIN_ROLE' not in nav
css=read('assets/css/admin-simple-navigation-v014036.css')
assert '#gu36-simple-admin' in css and 'focus-visible' in css
assert 'release-manifest.json' in read('scripts/build-pages.sh')
assert "sw-v*.js" not in read('scripts/build-pages.sh')
assert '/release-manifest.json' in read('_headers') and 'Cache-Control: no-store' in read('_headers')
for path in ['assets/js/site.js','assets/js/admin-payment-center-v01433.js','assets/js/admin-simple-navigation-v014036.js','assets/js/release-integrity-v014036.js','assets/js/route-policy.js','assets/js/commerce-common.js','config.js','sw.js']:
 p=subprocess.run(['node','--check',str(R/path)],capture_output=True,text=True)
 assert p.returncode==0,(path,p.stderr)
print('PASS v014036: unified navigation, current version, no-store manifest, protected legacy controls, syntax')
