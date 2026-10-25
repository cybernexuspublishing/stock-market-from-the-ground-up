import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const api=readFileSync('functions/api/admin-founder-commons-v014179.js','utf8');
test('Founder administration requires a verified Owner session and live role',()=>{
 assert.match(api,/auth\/v1\/user/);
 assert.match(api,/role_code==='OWNER'/);
 assert.match(api,/Date\.parse\(x\.expires_at\)>Date\.now\(\)/);
 assert.match(api,/SHOWCASE_VIEWER/);
 assert.match(api,/account_kind!=='member'/);
 assert.match(api,/suspended','restricted/);
});
test('Founder administration restricts methods and verifies request origin',()=>{
 assert.match(api,/!\['GET','POST'\]\.includes\(request\.method\)/);
 assert.match(api,/checkMutationOrigin/);
 assert.match(api,/boundedForumJson/);
 assert.match(api,/cache-control':'private,no-store/);
});
