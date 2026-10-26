import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
const read=s=>readFileSync(s,'utf8'),c=JSON.parse(read('data/founding600-terms-v014170.json'));
test('approved tiers, capacity and no charge',()=>{assert.equal(c.capacity,600);assert.equal(c.checkoutEnabled,false);
 assert.deepEqual([c.plans.FOUNDING_30.recurringCents,c.plans.FOUNDING_30.billingIntervalDays,c.plans.FOUNDING_30.foundingDiscountBps],[4999,30,1000]);
 assert.deepEqual([c.plans.FOUNDING_60.recurringCents,c.plans.FOUNDING_60.billingIntervalDays,c.plans.FOUNDING_60.foundingDiscountBps],[5999,60,1500]);
 assert.equal(c.discount.extendedLifetimeChargedCents,212415);assert.equal(c.discount.standardLifetimeChargedCents,224910);
 assert.equal(c.purchasedSparksExpire,false);assert.equal(c.tradingExecutionIncluded,false)});
test('store, Admin and server gate use 15 percent',()=>{assert.match(read('founding600.html'),/15% eligible purchase discount/);
 assert.doesNotMatch(read('founding600.html'),/20%/);
 assert.match(read('functions/api/admin-prelive-v014247.js'),/plan60\?\.purchase_discount_bps===1500/);
 assert.match(read('functions/api/stripe-live-checkout-v01458.js'),/\[0,1000,1500\]/)});
test('both migrations guard launch and update discount function',()=>{
 for(const [p,bps] of [['supabase/migrations/v0.14.0.274_founding600_15pct_contract_gate2.sql',1500],
 ['supabase/rollbacks/v0.14.0.274_founding600_15pct_contract_gate2_ROLLBACK.sql',2000]]){
 const sql=read(p);assert.match(sql,/BEGIN;[\s\S]+COMMIT;/);
 assert.match(sql,/gu_founder_members_v014173_vested_discount_bps_check/);
 assert.match(sql,/gu_founder_plans_v014173_check/);
 assert.match(sql,/gu_founder_discount_eligibility_v014221/);
 assert.match(sql,/GU_F600|FOUNDER_DISCOUNT/);
 assert.ok(sql.includes('purchase_discount_bps='+bps));
 }
});
