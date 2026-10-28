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
 assert.match(read('functions/api/stripe-live-checkout-v01458.js'),/\[0,500,1000,1500\]/)});
test('Starter 5 percent is active-term only, with no premature discounted Checkout',()=>{
 const sql=read('supabase/migrations/20261028_f600_starter_5pct_discount_guard.sql');
 assert.match(sql,/plan_code='FOUNDING_14'/);
 assert.match(sql,/WHEN starter_active THEN 500/);
 assert.match(sql,/plan_code='FOUNDING_60'/);
 assert.match(sql,/THEN 1500/);
 assert.match(sql,/plan_code='FOUNDING_30'/);
 assert.match(sql,/THEN 1000/);
 assert.match(sql,/c\.reversed_at IS NULL/);
 const checkout=read('functions/api/stripe-live-checkout-v01458.js');
 assert.match(checkout,/\[0,500,1000,1500\]/);
 assert.match(checkout,/Your earned Founder discount is not yet supported by this checkout/);
});
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


test('founding consent links exact published policies and does not promise an in-site trading simulator',()=>{
 const page=read('founding600.html');
 for(const doc of ['terms.html','subscription-terms.html','refund-policy.html','privacy.html']){
  assert.match(page,new RegExp('href="'+doc.replace('.','\\.')+'"'));
 }
 assert.match(page,/I explicitly authorize the recurring/);
 assert.match(page,/does not provide a live in-site trading simulator/);
 assert.doesNotMatch(page,/10 saved simulator exercises/);
 assert.doesNotMatch(page,/Full first-party platform tools while paid/);
 assert.match(page,/id="f600-enroll-button" disabled/);
});

test('founding discount audit ledger rejects deprecated 20 percent',()=>{
 const forward=read('supabase/migrations/v0.14.0.275_founder_15pct_audit_constraint.sql');
 const rollback=read('supabase/rollbacks/v0.14.0.275_founder_15pct_audit_constraint_ROLLBACK.sql');
 assert.match(forward,/discount_bps IN \(1000,1500\)/);
 assert.match(forward,/F600_RELEASE_MUST_REMAIN_CLOSED/);
 assert.match(forward,/AUDIT_CONTAINS_UNRECONCILED_20PCT_ROWS/);
 assert.match(rollback,/ROLLBACK_NOT_SAFE_WHILE_ACTIVE_OR_15PCT_AUDIT_EXISTS/);
});

test('Founders Commons official policy correction uses approved 15 percent only',()=>{
 const fix=read('supabase/migrations/20261026_founders_commons_official_15pct_correction.sql');
 assert.match(fix,/F600_OFFICIAL_V1_02/);
 assert.match(fix,/F600_OFFICIAL_V1_22/);
 assert.match(fix,/purchase_discount_bps=1500/);
 assert.match(fix,/replace\(body,'20% Extended','15% Extended'\)/);
 assert.match(fix,/Official topic baseline mismatch/);
 const ui=read('founders-commons.html');
 assert.match(ui,/id="gu-f600-beta-center"/);
 assert.match(ui,/Sitewide Beta Test Center/);
 assert.doesNotMatch(ui,/Maximum founding places, not current members|Founding\s+600/i);
 assert.match(ui,/report problems without including personal or payment information/i);
 assert.match(ui,/href="market-commons\.html\?forum=F600_BUGS"/);
 assert.match(ui,/href="dashboard\.html\?tab=support"/);
 assert.ok(ui.indexOf('id="gu-f600-beta-center"')>ui.indexOf('id="gu-f600-content" hidden'),
  'Beta center must be inside the founder-authenticated content container');
});

test('founder 60-day public catalog copy has a guarded noncharging correction',()=>{
 const forward=read('supabase/migrations/20261026_founding60_store_copy_15pct_alignment.sql');
 const rollback=read('supabase/rollbacks/20261026_founding60_store_copy_ROLLBACK.sql');
 const preflight=read('supabase/admin/20261026_founding60_store_copy_PREFLIGHT_READ_ONLY.sql');
 assert.match(forward,/BEGIN;[\s\S]*COMMIT;/);
 assert.match(forward,/sku='founding:FOUNDING_60'/);
 assert.match(forward,/purchase_discount_bps=1500/);
 assert.match(forward,/price_cents=5999/);
 assert.match(forward,/term_days=60/);
 assert.match(forward,/enrollment_enabled=false AND billing_enabled=false AND fulfillment_enabled=false/);
 assert.match(forward,/eligible 20% discount/);
 assert.match(forward,/eligible 15% discount/);
 assert.match(forward,/FOR UPDATE/);
 assert.match(forward,/admin_audit_log/);
 assert.doesNotMatch(forward,/STRIPE_SECRET|STRIPE_LIVE_SECRET/);
 assert.match(rollback,/visible=false/);
 assert.match(rollback,/Never restore the known-false 20% benefit/);
 assert.match(preflight,/BEGIN READ ONLY/);
 assert.match(preflight,/ROLLBACK;/);
});

test('current Founder public descriptions use the V2 nonexpiring Sparks rule',()=>{
  const page=read('founding600.html'),store=read('assets/js/store.js'),build=read('scripts/build-pages.sh');
  for(const code of ['FOUNDING_14','FOUNDING_30','FOUNDING_60']){
    assert.equal(c.plans[code].incSparksExpiryDaysAfterTermEnd,null,code+' obsolete expiry must be disabled');
    assert.equal(c.plans[code].includedSparksNeverExpire,true,code+' must be nonexpiring');
  }
  assert.equal(c.sparkPolicyVersion,'CROWNLIGHT_V2_NONEXPIRING');
  assert.equal(c.disclosures.includedSparksExpireAfterPeriod,false);
  assert.equal(c.disclosures.includedSparksNeverExpire,true);
  assert.doesNotMatch(page,/Included Sparks expire (60|90|150) days/i);
  assert.match(page,/Unused included and purchased Crownlight Sparks never expire/);
  assert.match(store,/Unused included Sparks expiration/);
  assert.match(store,/plans\.map\(\(\)=>'Never'\)/);
  assert.doesNotMatch(store,/Sparks expiry|expiry after term/i);
  assert.match(build,/includedSparksNeverExpire/);
  assert.doesNotMatch(build,/'incSparksExpiryDaysAfterTermEnd'/);
  assert.match(read('functions/api/stripe-live-checkout-v01458.js'),
    /Your earned Founder discount is not yet supported by this checkout/);
});
