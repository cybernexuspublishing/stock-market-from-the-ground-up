/* Membership cents, chart access, and base-fee distinction.
 * Synthetic, no billing API or production database mutations.
 */
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const text=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const win={};
vm.runInNewContext(text('assets/js/commerce-common.js'),{window:win,console});
const cents=win.CommerceTools.moneyCents;
const prices=[
 ['Free',0,'$0.00'],
 ['Pick What You Want base',0,'$0.00'],
 ['OnDemand monthly',1999,'$19.99'],
 ['Full Monthly',6999,'$69.99'],
 ['Full Annual',69900,'$699.00'],
 ['Lifetime',249900,'$2,499.00'],
 ['Founding 14-Day',2299,'$22.99'],
 ['Founding 30-Day',4999,'$49.99'],
 ['Founding 60-Day',5999,'$59.99']
];
for(const [name,amount,expected] of prices){
 assert.equal(cents(amount),expected,name+' must display cents as dollars');
 assert.equal(win.CommerceTools.money(amount),expected,name+' shared money alias');
}
const store=text('assets/js/store.js');
assert.match(store,/const dollars=c=>C\(\)\.moneyCents\(Number\(c\|\|0\)\)/,
 'Store must call canonical cents formatter exactly once');
assert.doesNotMatch(store,/moneyCents\(Number\(c\|\|0\)\/100\)/,
 'Store must never divide cents twice');
const detail=text('assets/js/store-product-detail-v01484.js');
assert.match(detail,/const money=c=>window\.CommerceTools\.moneyCents\(Number\(c\|\|0\)\)/,
 'Individual membership and tool detail must not divide source cents twice');
assert.doesNotMatch(detail,/moneyCents\(Number\(c\|\|0\)\/100\)/);
const admin=text('assets/js/admin-products-v01489.js');
assert.match(admin,/Number\(c\|\|0\)\/100/);
assert.match(admin,/Pick What You Want.*base fee|PICK_WHAT_YOU_WANT.*base fee/,
 'Pick a la carte has no fixed membership price');
for(const plan of ['ONDEMAND_MONTHLY','PICK_WHAT_YOU_WANT','FOUNDING_14','FOUNDING_30','FOUNDING_60','FULL_MONTHLY','FULL_ANNUAL','LIFETIME']){
 assert(admin.includes(plan),'Admin coverage must include '+plan);
}
const tier=text('functions/api/chart-tier-access.js');
assert.match(tier,/ONDEMAND_MONTHLY:'STANDARD'/);
assert.match(tier,/PICK_WHAT_YOU_WANT:'STANDARD'/);
assert.match(tier,/FOUNDING_30:'ADVANCED'/);
assert.match(tier,/FOUNDING_60:'PROFESSIONAL'/);
assert.match(tier,/gu_sparks_chart_passes_v1/,'Premium short passes remain separately validated');
console.log('PASS membership money: 9 catalog amounts in dollars, one cent conversion, Pick zero base fee, OnDemand/individual chart access');
