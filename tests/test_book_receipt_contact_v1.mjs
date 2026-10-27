import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const file=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const address='stockmarketfromthegroundup@gmail.com';
test('Owner-provided book receipt email appears in canonical customer flows',()=>{
 for(const p of ['book-receipt-verification.html','founding600.html','create-account.html','activate-book.html','docs/FOUNDING_600_MEMBERSHIP_RULES_CONTRACT_v1.md']){
  assert.ok(file(p).includes(address),p+' must use canonical receipt mailbox');
 }
 assert.match(file('store.html'),/href="book-receipt-verification\.html"/);
 assert.match(file('book-receipt-verification.html'),/three calendar days/);
 assert.match(file('book-receipt-verification.html'),/same email address/);
});
test('Receipt claims are not self-approval or a paid Founder entitlement',()=>{
 const page=file('book-receipt-verification.html');
 assert.match(page,/Never send passwords/);
 assert.match(page,/does not instantly activate book rights/);
 assert.match(page,/does not include Founders Commons/);
 assert.doesNotMatch(page,/stripe_secret|service_role|SUPABASE_SECRET_KEY/);
});
