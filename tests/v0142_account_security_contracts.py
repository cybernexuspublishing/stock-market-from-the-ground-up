"""Static security regression checks. Not a substitute for staging Supabase tests."""
from pathlib import Path
import json

root=Path(__file__).resolve().parents[1]
manifest=json.loads((root/'PROJECT_MANIFEST.json').read_text())
assert manifest['version']=='0.14.0.2'
html=(root/'admin.html').read_text()
js=(root/'assets/js/admin-operations.js').read_text()
access=(root/'assets/js/accounts-access.js').read_text()
backend=(root/'functions/api/admin-accounts-v01353.js').read_text()
sql=(root/'supabase/migrations/v0.14.0.2_owner_account_identity_override.sql').read_text()
assert html.index('data-panel="dashboard"') < html.index('data-v1352-menu') < html.index('data-v142-create') < html.index('data-panel="users"')
assert 'b.onclick=openTab' in js
assert 'createShortcut.onclick=()=>{openTab();createForm()}' in js
for marker in ('v1353-identity-form', 'v1353-membership-form', 'v1353-profile-form', 'v1353-state-form', 'v1353-notes-form'):
    assert marker in js
assert 'GroundUpAccountEditor={openManagement' in js
assert 'openForUser:async(id)' in access
assert "if(!live.includes('OWNER')||profile?.[0]?.account_kind==='test')" in backend
assert "if(actor.showcase)throw problem('Showcase is read-only.',403)" in backend
assert 'if(dryRun)return' in backend and 'changePrimaryRole(env,ownerId,id,x,b,true)' in backend
assert 'email_verified:true' in backend
assert "if(id===ownerId&&duration!=='none')" in backend
assert 'test_account_credentials' in backend and 'AES-GCM' in backend
assert "current_setting('request.jwt.claim.role',true)" in sql
assert "'service_role'" in sql and 'Username cannot be changed after registration.' in sql
assert '\nsecurity definer\n' not in sql.lower()
print('PASS v0.14.0.2 static access/identity/profile/password/role SQL guards')
