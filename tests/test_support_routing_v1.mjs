import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('new member Support owns its route; legacy dashboard may not replace it',()=>{
 const legacy=read('assets/js/dashboard-ui-legacy.js');
 assert.match(legacy,/get\('tab'\)===\x27support\x27\)return/);
 assert.match(legacy,/if\(code===\x27support\x27\)return/);
 const page=read('dashboard.html');
 assert.match(page,/id="member-support-panel"/);
 assert.match(page,/id="member-book-receipt-form"/);
 assert.match(read('assets/js/member-support-panel.js'),/params.get\('tab'\)!==\x27support\x27/);
 // Support is loaded by dashboard.html itself, not by a legacy middleware cache marker.
 assert.match(page,/src="assets\/js\/member-support-panel\.js"/);
 assert.match(read('functions/_middleware.js'),/auth-boundary\.js/);
});
