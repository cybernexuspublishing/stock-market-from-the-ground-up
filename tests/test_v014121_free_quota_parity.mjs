import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const sql=read('supabase/migrations/v0.14.0.121_FREE_WEEKLY_QUOTA_OWNER_REVIEW_REQUIRED.sql');
for(const m of ['pg_advisory_xact_lock','week_start','FREE_WEEKLY_JOURNAL_LIMIT_REACHED',
 'FREE_WEEKLY_SIMULATOR_LIMIT_REACHED',"'journal_limit_week'","'simulator_saves_week'",
 'public.enforce_free_journal_limits','public.gu_v014121_my_free_week_usage',
 'auth.uid()','TO authenticated'])assert(sql.includes(m),'missing: '+m);
assert(!sql.includes('SET price_cents=6999'));
for(const p of ['assets/js/store.js','assets/js/membership-platform.js'])
 assert(read(p).includes('journal_limit_week')&&read(p).includes('simulator_saves_week'),p+' missing live caps');
const c=JSON.parse(read('data/commerce-config.json'));
for(const code of ['FULL_MONTHLY','FULL_ANNUAL'])assert.equal(c.plans.find(p=>p.planCode===code).adFree,false);
assert.equal(c.plans.find(p=>p.planCode==='FULL_MONTHLY').priceCents,6999);
const guide=JSON.parse(read('data/store-product-guides-v01484.json'));
const page=read('assets/js/store-product-detail-v01484.js');
const match=page.match(/const productGuides=(\{.*?\});\n/s);
assert(match,'missing embedded guide');assert.deepEqual(JSON.parse(match[1]),guide,'embedded and source Guide mismatch');
assert(!guide.plans.FREE.included.some(s=>/Tutor/i.test(s)),'do not mispromise free Tutor');
assert(read('assets/js/journal.js').includes("rpc('gu_v014121_my_free_week_usage')"));
console.log('PASS v121: plans, dynamic weekly quotas, no phantom free Tutor, no altered Stripe SKU, embedded guide parity');
