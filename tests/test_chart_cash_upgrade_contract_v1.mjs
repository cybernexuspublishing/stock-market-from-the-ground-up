import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {OFFERS,catalog,verifyPrice} from '../functions/_lib/chart-cash-test-v1.js';
import {onRequestPost as checkout} from '../functions/api/chart-cash-upgrade.js';
import {onRequestPost as testWebhook} from '../functions/api/stripe-test-webhook.js';

assert.deepEqual(Object.keys(OFFERS),['CHART_ADVANCED_30D','CHART_PROFESSIONAL_30D']);
assert.equal(OFFERS.CHART_ADVANCED_30D.amountCents,999);
assert.equal(OFFERS.CHART_PROFESSIONAL_30D.amountCents,1999);
assert.equal(OFFERS.CHART_ADVANCED_30D.durationDays,30);
assert.equal(OFFERS.CHART_PROFESSIONAL_30D.durationDays,30);
const map={CHART_ADVANCED_30D:{price_id:'price_abcdef123',product_id:'prod_abcdef123'},
 CHART_PROFESSIONAL_30D:{price_id:'price_abcdef456',product_id:'prod_abcdef456'}};
const env={STRIPE_TEST_SECRET_KEY:'sk_test_noncommercial_mock',
 CHART_STUDIO_TEST_CATALOG_JSON:JSON.stringify(map)};
assert.equal(catalog(env).CHART_ADVANCED_30D.price_id,'price_abcdef123');
assert.throws(()=>catalog({...env,CHART_STUDIO_TEST_CATALOG_JSON:'{}'}),/CATALOG/);
let seen=[];
const original=globalThis.fetch;
globalThis.fetch=async(url)=>{
 seen.push(String(url));
 return new Response(JSON.stringify({id:'price_abcdef123',product:'prod_abcdef123',livemode:false,
  active:true,type:'one_time',currency:'usd',unit_amount:999,
  billing_scheme:'per_unit',transform_quantity:null}),{status:200});
};
try{assert.equal((await verifyPrice(env,'CHART_ADVANCED_30D')).price_id,'price_abcdef123')}
finally{globalThis.fetch=original}
assert.equal(seen.length,1);
const request=new Request('https://example.test/api/chart-cash-upgrade',{method:'POST',
 headers:{origin:'https://example.test','content-type':'application/json'},
 body:JSON.stringify({sku:'CHART_ADVANCED_30D'})});
assert.equal((await checkout({request,env})).status,503,'TEST checkout is off by default');
const unsigned=new Request('https://example.test/api/stripe-test-webhook',{method:'POST',
 headers:{'stripe-signature':'t=1234567890,v1=bad'},body:'{}'});
assert.equal((await testWebhook({request:unsigned,env:{STRIPE_TEST_WEBHOOK_SECRET:'whsec_mock'}})).status,401);
const sql=readFileSync(new URL('../supabase/migrations/20261031_chart_cash_upgrades_test_v1.sql',import.meta.url),'utf8');
assert.match(sql,/ENABLE ROW LEVEL SECURITY/g);
assert.match(sql,/REVOKE ALL ON public\.crownlight_chart_cash_upgrades_v1 FROM PUBLIC,anon,authenticated/);
assert.match(sql,/GRANT EXECUTE ON FUNCTION public\.crownlight_chart_cash_apply_test_v1/);
assert.match(sql,/expires_at=paid_at\+interval '30 days'/);
const resolver=readFileSync(new URL('../functions/api/chart-tier-access.js',import.meta.url),'utf8');
assert.match(resolver,/rank\[upgrade\.tier\]>rank\[tier\]/);
assert.match(resolver,/upgrade\.revoked_at==null/);
console.log('PASS mocked Chart cash contract: exact SKUs/prices, TEST price validation, checkout default-off, signature rejection, private RLS, expiration and tier precedence');
