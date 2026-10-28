"""Historical Admin and release source check, updated for v0.14.0.39."""
from pathlib import Path
import json,subprocess
R=Path(__file__).resolve().parents[1];read=lambda p:(R/p).read_text(encoding='utf-8')
assert "VERSION: '0.14.0.39'" in read('config.js')
assert "version:'0.14.0.39'" in read('assets/js/route-policy.js')
assert 'groundup-v014039-public' in read('sw.js')
assert json.loads(read('data/commerce-config.json'))['version']=='0.14.0.39'
assert json.loads(read('release-manifest.json'))['version']=='0.14.0.39'
assert json.loads(read('release-manifest.json'))['customerCheckoutApproved'] is False
assert "settings['site.version']" in read('assets/js/commerce-common.js')
assert "version:String(window.SITE_CONFIG?.VERSION" in read('assets/js/commerce-common.js')
assert "loadOnce('/assets/js/admin-simple-navigation-v014036.js'" in read('assets/js/site.js')
assert "loadOnce('/assets/js/release-integrity-v014036.js'" in read('assets/js/site.js')
nav=read('assets/js/admin-simple-navigation-v014036.js')
assert 'No parallel Workspace menu' in nav
assert 'details.append(nav)' not in nav
assert "GroundUpSimpleAdminNavV014036" in nav
assert "gu36-owner-zero-live-qa" in nav
assert "cc-owner-hidden" in nav
assert 'loadOnce' not in nav or 'admin-stripe-shadow-v01439.js' in nav
admin=read('admin.html')
for name in ['Today','Members','Add a Member','Products &amp; Prices','Orders &amp; Subscriptions','Sparks Packages','Activity Log','Client Website Drafts (Grant Web Solutions)']:
 assert name in admin,name
organized=read('assets/js/admin-navigation.js')
for name in ['Overview','Members & Access','Learning Administration','Commerce','Community','Website Management','Support & Operations','Security & Governance']:
 assert name in organized,name
assert 'GU_ADMIN_ROLE' not in nav
css=read('assets/css/admin-simple-navigation-v014036.css')
assert '#gu36-simple-admin' in css and 'focus-visible' in css
assert 'release-manifest.json' in read('scripts/build-pages.sh')
assert 'sw-v*.js' not in read('scripts/build-pages.sh')
assert '/release-manifest.json' in read('_headers') and 'Cache-Control: no-store' in read('_headers')
for path in ['assets/js/site.js','assets/js/admin-payment-center-v01433.js','assets/js/admin-simple-navigation-v014036.js','assets/js/release-integrity-v014036.js','assets/js/route-policy.js','assets/js/commerce-common.js','config.js','sw.js']:
 proc=subprocess.run(['node','--check',str(R/path)],capture_output=True,text=True)
 assert proc.returncode==0,(path,proc.stderr)
print('PASS historical Admin/version, v0.14.0.39 source contracts')
