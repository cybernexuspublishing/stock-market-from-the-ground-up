import assert from 'node:assert/strict';
import * as stable from '../functions/api/internal-billing-reconcile.js';
import * as legacy from '../functions/api/internal-billing-reconcile-v014124.js';
import worker from '../workers/billing-scheduler.js';
import {readFileSync} from 'node:fs';

assert.equal(stable.onRequestGet,legacy.onRequestGet,'Alias must preserve GET handler');
assert.equal(stable.onRequestPost,legacy.onRequestPost,'Alias must preserve auth and reconciliation');
let get=await stable.onRequestGet();
assert.equal(get.status,405,'Browser GET must not invoke reconciliation');
assert.deepEqual(await get.json(),{ok:false,error:'POST required'});

const uri='https://course.example/api/internal-billing-reconcile';
const request=new Request(uri,{method:'POST',headers:{authorization:'Bearer incorrect'},
 body:'{}'});
const bad=await stable.onRequestPost({request,env:{}});
assert.equal(bad.status,503,'Missing production env must fail closed');
const env={
 SUPABASE_URL:'https://aaaaaaaaaaaaaaaaaaaa.supabase.co',
 SUPABASE_SECRET_KEY:'sb_secret_mock',
 GU58_STRIPE_LIVE_SECRET_KEY:'sk_live_FAKE_FAKE_FAKE_FAKE',
 GU58_STRIPE_LIVE_ACCOUNT_ID:'acct_FAKE123',
 GU_BILLING_TASK_SECRET:'a'.repeat(48)
};
const forbidden=await stable.onRequestPost({request,env});
assert.equal(forbidden.status,403,'Bad shared bearer token must not reach Stripe');

const config=JSON.parse(readFileSync(new URL('../workers/wrangler.billing-scheduler.jsonc',import.meta.url),'utf8')
 .replace(/^\s*\/\/.*$/gm,''));
assert.equal(config.main,'./billing-scheduler.js');
assert.deepEqual(config.triggers.crons,['0 12 * * *']);
assert(config.compatibility_flags.includes('global_fetch_strictly_public'));
assert.equal(config.keep_vars,true);
assert.equal(typeof worker.scheduled,'function');
assert.equal(typeof worker.fetch,'function');
const source=readFileSync(new URL('../workers/billing-reconcile-stripe-only-v014129.js',import.meta.url),'utf8');
assert(source.includes("base+'/api/internal-billing-reconcile'"));
assert(!source.includes("base+'/api/internal-billing-reconcile-v"));
assert(!source.includes('internal-billing-notices-v014123'));
console.log('PASS v131: stable API alias preserves auth and response, stable Worker entrypoint, approved daily cron');
