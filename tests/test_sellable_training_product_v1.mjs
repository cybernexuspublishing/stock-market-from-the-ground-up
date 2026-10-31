// Product 01: an approved $19.99/mo existing subscription, not seven new
// unpriced SKUs. Product information is drawn from the live Academy catalog.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {onRequest as academyRequest} from '../functions/api/bootcamp-academy.js';
import {academyByCode} from '../functions/_lib/bootcamp-academy-v014168.js';
const read=p=>readFileSync(p,'utf8');
const page=read('store-membership-ondemand-monthly.html');
const script=read('assets/js/store-training-programs-v1.js');
const style=read('assets/css/store-training-programs-v1.css');
const detail=read('assets/js/store-product-detail-v01484.js');
const server=read('functions/api/member-tool-access.js');
const migration=read('supabase/migrations/20261026_training_membership_entitlement_fix.sql');
const rollback=read('supabase/rollbacks/20261026_training_membership_entitlement_fix_ROLLBACK.sql');
const pg=read('tests/fixtures/20261026_training_membership_delivery.sql');
const sevenListings=read('assets/js/store-inventory-ui-v014174.js');
assert(sevenListings.includes("x.category==='Boot Camps'"),'Boot Camp product details must remain distinct');
assert(sevenListings.includes('store-membership-ondemand-monthly.html'));
assert(sevenListings.includes('This Boot Camp is not priced or sold standalone'));
assert(!sevenListings.includes('checkout.html?type=course'),
 'Boot Camps have NO approved independent price or fulfillment SKU');

for(const tag of ['id="store-product-root"','data-product-type="plan"',
 'data-product-code="ONDEMAND_MONTHLY"','id="store-training-programs"',
 'data-training-status','data-training-courses',
 'assets/js/store-training-programs-v1.js','assets/css/store-training-programs-v1.css']){
 assert(page.includes(tag),'Missing live offer element '+tag);
}
assert(script.includes("fetch('/api/bootcamp-academy?action=catalog'"));
assert(script.includes("new Set(rows.map(p=>p.code)).size!==rows.length"));
assert(script.includes('root.querySelector'));
assert(!script.includes('innerHTML='),'Untrusted catalog text must be rendered as text nodes');
assert(!script.includes('Stripe')&&!script.includes('fetch("/api/checkout'),
 'Curriculum display cannot create payments or entitlements');
assert(script.includes("data-training-courses"));
assert(style.includes('@media(prefers-reduced-motion:reduce)'));
assert(detail.includes('ONDEMAND_MONTHLY'));
assert(server.includes('rpc/user_has_tool_access'));
const get=new Request('https://example.test/api/bootcamp-academy?action=catalog');
const r=await academyRequest({request:get,env:{}});
assert.equal(r.status,200);
const json=await r.json();
assert.equal(json.ok,true);
assert.equal(json.programs.length,7);
assert.equal(json.programs.reduce((sum,p)=>sum+p.days,0),247);
const expected={
 truth5:5,watchlist7:7,scanners10:10,foundations30:30,
 charts45:45,risk60:60,practicum90:90
};
for(const [code,days] of Object.entries(expected)){
 const p=json.programs.find(x=>x.code===code);
 assert(p&&p.days===days,'Missing authorized program '+code);
 assert.equal(academyByCode[code].curriculum.length,days);
 assert(p.summary.length>=25);
 assert(script.includes("['"+code+"',{days:"+days+",href:"));
 assert(academyByCode[code].curriculum.every(day=>day.officiallyGraded===false&&day.masteryAwarded===false),
  'Ungraded curricula must not be described as certified assessments');
}
for(const term of ["target_tool='ONDEMAND_TRAINING'","g.plan_code='ONDEMAND_MONTHLY'",
 "s.plan_code='ONDEMAND_MONTHLY'","account_kind='member'",
 "SHOWCASE_VIEWER","s.current_period_end IS NOT NULL",
 "purchase_discount_bps"]){
 if(term==='purchase_discount_bps')assert(!migration.includes(term),'Do not change founder purchase discounts');
 else assert(migration.includes(term),'Missing positive/negative entitled scope '+term);
}
assert(migration.includes("plan.price_cents<>1999"));
assert(migration.includes("plan.includes_all_tools IS DISTINCT FROM false"));
assert(migration.includes('admin_audit_log'));
assert(migration.includes('BEGIN;')&&migration.includes('COMMIT;'));
assert(rollback.includes('ACTIVE_CUSTOMER_TRAINING_ACCESS_MUST_BE_PRESERVED'));
assert(pg.includes('ONDEMAND_TRAINING'));
assert(pg.includes('MARKET_TUTOR')&&pg.includes('JOURNAL_ANALYTICS'));
assert(pg.includes('SHOWCASE_VIEWER'));
console.log('PASS sellable beta product 01: 7 real courses/247 days; existing single training SKU; no novel price; scoped access, rollback and deferred financial checkout.');
