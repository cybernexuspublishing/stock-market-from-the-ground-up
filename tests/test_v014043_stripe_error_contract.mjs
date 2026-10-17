import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {onRequestGet} from '../functions/api/gu39-sandbox.js';
const api='https://example.com/api/gu39-sandbox?view=catalog';
const env={SUPABASE_URL:'https://oxihglyfgzywsupnyicb.supabase.co',
 SUPABASE_PUBLISHABLE_KEY:'sb_publishable_test',SUPABASE_SECRET_KEY:'sb_secret_fake'};
const prior=globalThis.fetch,calls=[];
const res=v=>new Response(JSON.stringify(v),{status:200});
try{
 // Missing Cloudflare config must never turn into an unhelpful generic 403.
 let r=await onRequestGet({request:new Request(api),env:{}});
 assert.equal(r.status,503);assert.equal((await r.json()).error,'SUPABASE_NOT_CONFIGURED');
 r=await onRequestGet({request:new Request(api),env});
 assert.equal(r.status,401);assert.equal((await r.json()).error,'SIGN_IN_REQUIRED');
 globalThis.fetch=async(url)=>{const u=String(url);calls.push(u);
  if(u.endsWith('/auth/v1/user'))return res({id:'8da97526-b906-4927-a002-6195f69112ee'});
  if(u.endsWith('/rpc/gu_staff_identity_v01431r1'))return res('OWNER');
  throw Error('Should never contact Stripe when TEST key missing: '+u);
 };
 r=await onRequestGet({request:new Request(api,{headers:{authorization:'Bearer owner-mock'}}),env});
 assert.equal(r.status,503);assert.equal((await r.json()).error,'SANDBOX_TEST_KEY_MISSING');
 assert(calls.every(u=>!u.includes('api.stripe.com')));
 const js=readFileSync(new URL('../assets/js/admin-stripe-shadow-v01439.js',import.meta.url),'utf8');
 for(const key of ['SANDBOX_TEST_KEY_MISSING','PRICE_MAP_INVALID','SANDBOX_ACCOUNT_MISMATCH',
  'SUPABASE_NOT_CONFIGURED','STRIPE_CATALOG_API_UNAVAILABLE','GU39_STRIPE_TEST_PRICE_MAP_JSON'])
  assert(js.includes(key),key);
 const release=JSON.parse(readFileSync(new URL('../release-manifest.json',import.meta.url),'utf8'));
 assert(release.version.startsWith('0.14.0.'));
 assert.equal(JSON.parse(readFileSync(new URL('../data/commerce-config.json',import.meta.url),'utf8')).version,release.version);
 assert(readFileSync(new URL('../config.js',import.meta.url),'utf8').includes("VERSION: '"+release.version+"'"));
 assert.equal(release.customerCheckoutApproved,false);
 console.log('PASS v43: actionable diagnostic errors, missing credential isolation, fail-closed and disabled live checkout.');
}finally{globalThis.fetch=prior}
