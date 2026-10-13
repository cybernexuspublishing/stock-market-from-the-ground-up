"""No network tests. Three-branch audit provenance recorded in documentation.
Validates source-level reconciliation outcomes; not Cloudflare/DB verification."""
from pathlib import Path
import json,re
ROOT=Path(__file__).resolve().parents[1]
paths={p.relative_to(ROOT).as_posix() for p in ROOT.rglob('*') if p.is_file()}
version=json.loads((ROOT/'PROJECT_MANIFEST.json').read_text())
assert version['version']=='0.13.5.7.4'
branches=version['manifest_audit']['branch_reconciliation']
assert branches['old_feature_branch_ahead_of_main_commits']==0
assert branches['main_sha']=='4f9aad845417cec4691c827dba4c80699e003a0f'
assert branches['cleanup_sha']=='8a658ca26012aeea4e360cd64fb256e303ef73bb'
# Branch-only old SW URL kept, but replaced with safe authoritative import.
sw=(ROOT/'sw-v0131.js').read_text()
assert "importScripts('/sw.js')" in sw
assert 'cache.put' not in sw and 'addAll' not in sw
main_sw=(ROOT/'sw.js').read_text()
assert 'POLICY.isProtected(p)' in main_sw
assert "fetch(req,{cache:'no-store'})" in main_sw
for p in ['sw-v01321.js','sw-v01322.js','sw-v01323.js','sw-v01324.js','sw-v0133.js','sw-v0134.js','sw-v01342.js']:
 assert p in paths,(p,'missing supported older-client SW URL')
# Core functionality required from merged v0.13.4 feature branch and latest releases.
required=['assets/js/route-policy.js','assets/js/accounts-access.js',
 'assets/js/admin-core.js','assets/js/lab-registry.js',
 'assets/js/admin-operations.js','assets/js/navigation.js',
 'assets/js/admin-showcase.js','assets/js/admin-operations-center.js',
 'functions/api/admin-lab-preview-v01355.js','functions/api/admin-access-v01355.js',
 'functions/api/admin-operations-v0135.js','functions/api/admin-site-v01354.js',
 'functions/_middleware.js','data/interactive-labs.json','lab-catalog.json',
 'admin-lab-preview.html','admin.html','dashboard.html','index.html',
 'docs/BRANCH_RECONCILIATION_AND_COMPLETENESS.md']
for p in required:assert p in paths,(p,'missing required current module')
assert "'admin-lab-preview'" in (ROOT/'assets/js/route-policy.js').read_text()
assert "REQUIRE_STAFF_AAL2_V135!=='true'" in (ROOT/'functions/_middleware.js').read_text()
assert 'showcase_account_create' in (ROOT/'functions/_middleware.js').read_text()
assert 'v01355_owner_access_mutation' in (ROOT/'functions/api/admin-access-v01355.js').read_text() or 'v1355_owner_access_mutation' in (ROOT/'functions/api/admin-access-v01355.js').read_text()
removed=['assets/css/v0.13.2.2-dashboard.css','assets/css/v0.13.5.2-admin-accounts.css',
 'assets/js/membership-v09.js','assets/js/membership.js','assets/js/v0.10-global.js',
 'assets/js/v0.13.2.2-dashboard.js','assets/js/v0.13.5.2-admin-accounts.js',
 'assets/js/v0.9-lab-simulator-link.js','assets/js/v0.9-remove-kdp-notice.js']
assert not (set(removed)&paths),'Cleanup branch deletions reintroduced'
# 291 old-branch files are ancestral to main. Missing archived docs are not runtime features.
print('PASS BRANCH RECONCILIATION: main + cleanup + merged older branch, SW shim, current routes and modules')
