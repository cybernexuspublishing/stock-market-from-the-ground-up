import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=path=>fs.readFileSync(path,'utf8');
const catalog=JSON.parse(read('data/founding600-terms-v014170.json'));
test('founder benefits remain on main with no payment launch',()=>{
 assert.equal(catalog.capacity,600);
 assert.equal(catalog.checkoutEnabled,false);
 assert.equal(catalog.enrollmentEnabled,false);
 assert.equal(catalog.fulfillmentEnabled,false);
 assert.equal(catalog.plans.FOUNDING_30.billingIntervalDays,30);
 assert.equal(catalog.plans.FOUNDING_30.recurringCents,4999);
 assert.equal(catalog.plans.FOUNDING_60.billingIntervalDays,60);
 assert.equal(catalog.plans.FOUNDING_60.recurringCents,5999);
 assert.equal(catalog.plans.FOUNDING_30.incSparks,5);
 assert.equal(catalog.plans.FOUNDING_60.incSparks,15);
 assert.equal(catalog.disclosures.noCorporateVotingOrEquity,true);
});
test('private Founder benefits are gated by RLS before release',()=>{
 const required=[
 'supabase/migrations/v0.14.0.192_verified_founder_educational_certificates.sql',
 'supabase/migrations/v0.14.0.203_founder_verified_service_credits.sql',
 'supabase/migrations/v0.14.0.206_founder_targeted_announcements.sql',
 'supabase/migrations/v0.14.0.204a_founder_original_candlestick_lesson.sql',
 'supabase/migrations/v0.14.0.204b_founder_original_teaching_and_challenges.sql',
 'supabase/migrations/v0.14.0.208_founder_welcome_private_notices.sql'];
 for(const file of required)assert.equal(fs.existsSync(file),true,file+' missing');
 assert.match(read(required[0]),/ENABLE ROW LEVEL SECURITY/);
 assert.match(read(required[1]),/pending_application/);
 assert.match(read(required[2]),/gu_founder_commons_access_v014174\(audience\)/);
 assert.match(read(required[1]),/GRANT EXECUTE ON FUNCTION public.gu_founder_record_service_incident_v014203[^]*?TO service_role;/);
});
test('member-facing benefit pages do not claim automatic mastery or payment success',()=>{
 for(const file of ['founder-benefits.html','founder-learning-studio.html','founders-commons.html','admin-founders.html'])
  assert.equal(fs.existsSync(file),true,'Required page '+file+' missing');
 const scripts=[
 'assets/js/founder-benefit-records-v014205.js',
 'assets/js/admin-founder-benefits-v014205.js',
 'assets/js/founders-announcements-v014189.js',
 'assets/js/admin-founder-notices-v014206.js'];
 for(const file of scripts){assert.equal(fs.existsSync(file),true);assert.doesNotThrow(()=>new Function(read(file)),file)}
 assert.match(read('founder-benefits.html'),/Non-accredited|non-accredited/);
 assert.match(read('founder-benefits.html'),/pending credits do not change|Pending credits do not change/);
 assert.match(read('founders-commons.html'),/founder-benefits.html/);
});
