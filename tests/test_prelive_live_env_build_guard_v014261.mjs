/* v0.14.0.261 — fail production build on any premature LIVE checkout flag. */
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
const flags=['GU_PAYMENT_LIVE_LAUNCH_APPROVED','GU58_LIVE_CHECKOUT_ENABLED',
 'GU58_LIVE_DB_CONTRACT_APPROVED','GU58_LIVE_FULFILLMENT_APPROVED',
 'GU58_LIVE_WEBHOOK_ENABLED','GU72_ZERO_MONTHLY_FULFILLMENT_ENABLED',
 'GU72_ZERO_MONTHLY_QA_ENABLED'];
const safe=Object.fromEntries(flags.map(x=>[x,'false']));
for(const key of flags){
 const result=spawnSync('bash',['scripts/build-pages.sh'],{
  encoding:'utf8',timeout:15000,
  env:{...process.env,...safe,CF_PAGES_BRANCH:'main',[key]:'true'}
 });
 assert.equal(result.status,9,key+' did not block a prematurely activated LIVE build');
 assert.match(result.stderr,/PRE-LIVE BUILD BLOCK/);
 assert(result.stderr.includes(key),'Error must name the misconfigured flag without exposing secrets');
}
console.log('PASS v0.14.0.261: all seven LIVE approval/fulfillment flags independently block main production build');
