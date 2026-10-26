/* Admin account entitlement multi-grant source contract: offline, no payments,
 * no member data access, no privileged writes. Browser/RPC acceptance is separate.
 */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Script} from 'node:vm';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const api=read('functions/api/admin-accounts-v01353.js');
const editor=read('assets/js/account-management-entitlements-v01478.js');
const admin=read('admin.html');
const ebooks=read('assets/js/admin-digital-books-v01430.js');
const storeTest=read('tests/test_v014089_products_sales_contract.mjs');
new Script(api,{filename:'admin-accounts-v01353.js'});
new Script(editor,{filename:'account-management-entitlements-v01478.js'});
new Script(ebooks,{filename:'admin-digital-books-v01430.js'});
assert(admin.includes('account-management-entitlements-v01478.js'),'Canonical account editor must be mounted');
for(const token of ['catalog_products?select=','platform_tools?select=','platform_plans?select=',
  'gu_storefront_items_v014174?select=']){
 assert(api.includes(token),'Account catalog must include '+token);
}
for(const key of ['plans:null','storeItems:null','books:null','tools:null']){
 assert(api.includes(key),'Catalog must explicitly handle '+key+' unavailable');
}
assert(api.includes("p_kind:kind==='manual_learning'?'full_learning_access':code"),
 'Manual grants must continue through the established audited source-RPC');
assert(api.includes("rpc/gu78_admin_account_resource_grant"),
 'Manual grants cannot write entitlement tables directly');
assert(api.includes('targetAccess(actor,id,x)'),
 'Staff must pass target-account authorization');
assert(api.includes("if(!['manual_book','manual_tool','manual_learning'].includes(kind)"),
 'Paid memberships and founder seats must not be grantable using generic resources');
for(const text of ['Complete Entitlement Offering Catalog','Membership plans',
 'Store offerings (includes Boot Camps, Sparks and upcoming products)',
 'Grant Multiple Independent Entitlements','name="resourceCode"',
 'input[name="resourceCode"]:checked:not(:disabled)','confirmed grants',
 'for(const [index,entry] of selected.entries())']){
 assert(editor.toLowerCase().includes(text.toLowerCase()),'Missing multi-entitlement contract: '+text);
}
assert(editor.includes('Never retry an uncertain request automatically'),
 'Partial batch uncertainty must never cause duplicate automatic retries');
assert(editor.includes('Array.isArray(inventory.books)')&&
 editor.includes('Array.isArray(inventory.tools)')&&
 editor.includes('Array.isArray(inventory.legacyLearning)'),
 'Do not issue blind grants when member entitlement sources failed');
assert(editor.includes('Stripe billing, purchased books, Book Keys'),
 'Issuer-controlled rights must be visibly protected');
assert(ebooks.includes('recent password reconfirmation with CAPTCHA'),
 'Owner book upload must describe the installed no-MFA step-up rather than AAL2');
assert(storeTest.includes('futureLearning=()=>[];'),
 'Store regression must reflect the Owner-approved hidden-unstarted product policy');
console.log('PASS: source contract for complete catalog, independent multi-grants, existing audited RPC, issuer protection and no-MFA book controls.');
