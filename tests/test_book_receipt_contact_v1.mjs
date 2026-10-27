import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('member book purchase verification uses one private Support ticket and attachment',()=>{
 for(const p of ['book-receipt-verification.html','founding600.html','create-account.html','activate-book.html']){
  assert.match(read(p),/dashboard\.html\?tab=support/);
 }
 assert.match(read('book-receipt-verification.html'),/three calendar days/);
 assert.match(read('book-receipt-verification.html'),/PDF, JPG or PNG/);
 assert.doesNotMatch(read('book-receipt-verification.html'),/mailto:/);
 assert.match(read('dashboard.html'),/id="member-book-receipt-form"/);
 assert.match(read('dashboard.html'),/name="receipt" type="file"/);
 assert.match(read('assets/js/member-support-panel.js'),/storage\.from\('gu-book-receipts'\)/);
 assert.match(read('functions/api/support.js'),/gu_support_create_book_receipt_v1/);
});
test('Owner alone handles approval and downloadable evidence',()=>{
 assert.match(read('admin.html'),/admin-book-receipts\.html/);
 assert.match(read('functions/api/admin-book-receipts.js'),/OWNER/);
 assert.match(read('functions/api/admin-book-receipts.js'),/APPROVE VERIFIED BOOK PURCHASE/);
 assert.match(read('functions/api/admin-book-receipts.js'),/content-disposition/);
 assert.doesNotMatch(read('book-receipt-verification.html'),/SUPABASE_SECRET_KEY|service_role|sk_live_/);
});
