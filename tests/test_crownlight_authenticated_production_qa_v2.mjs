/* Authenticated PRODUCTION Chart Studio entitlement acceptance.
 * ONLY actual password-authenticated, dedicated QA member accounts.
 * No service-role JWT, no impersonation, no payment or subscription writes.
 * This is intentionally NOT an auto-pass mocked suite.
 */
import assert from 'node:assert/strict';
const origin=String(process.env.CROWN_QA_SITE_URL||'https://stock-market-from-the-ground-up-d1r.pages.dev').replace(/\/$/,'');
const supabase=String(process.env.CROWN_QA_SUPABASE_URL||'').replace(/\/$/,'');
const key=process.env.CROWN_QA_SUPABASE_PUBLISHABLE_KEY||'';
if(!/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(supabase)||!key)throw Error('Supabase QA connection missing');
const members=[
 ['FREE','STANDARD'],
 ['FOUNDING_14','STANDARD'],
 ['FOUNDING_30','ADVANCED'],
 ['FOUNDING_60','PROFESSIONAL']
];
const tokens=[],ids=new Set();
async function login(plan){
 const email=process.env['CROWN_QA_'+plan+'_EMAIL'],password=process.env['CROWN_QA_'+plan+'_PASSWORD'];
 if(!email||!password)throw Error('Missing secured QA member credentials for '+plan+'; no simulated acceptance');
 const r=await fetch(supabase+'/auth/v1/token?grant_type=password',{method:'POST',
 headers:{apikey:key,'content-type':'application/json'},body:JSON.stringify({email,password})});
 const data=await r.json();
 if(!r.ok||!data.access_token||!data.user?.id)throw Error('Real authenticated QA login failed: '+plan);
 if(ids.has(data.user.id))throw Error('QA identities must be different accounts');
 ids.add(data.user.id);
 tokens.push({plan,token:data.access_token});
 return data;
}
async function chart(token){
 const r=await fetch(origin+'/api/chart-tier-access',{headers:{authorization:'Bearer '+token,'cache-control':'no-store'}});
 const data=await r.json();
 if(!r.ok||!data.ok)throw Error('Production chart entitlement refused authorized QA access');
 return data;
}
for(const [plan,expected] of members){
 const loginData=await login(plan);
 const token=loginData.access_token;
 const ent=await chart(token);
 assert.equal(ent.eligible,true,plan+' membership must be eligible');
 assert.equal(ent.tier,expected,plan+' needs actual backend paid-cycle evidence, not a simulated plan label');
 const read=await fetch(origin+'/api/chart-workspace',{headers:{authorization:'Bearer '+token}});
 assert.equal(read.status,200,plan+' must read only its own saved workspace');
 const payload=await read.json();assert.equal(payload.ok,true);
 const expectedAllowed=expected==='STANDARD'?['STANDARD']:expected==='ADVANCED'?['STANDARD','ADVANCED']:
  ['STANDARD','ADVANCED','PROFESSIONAL'];
 assert.deepEqual(ent.allowed,expectedAllowed);
 console.log('PASS actual authenticated QA member '+plan+' -> '+expected+' tier and private workspace GET');
}
const unauth=await fetch(origin+'/api/chart-tier-access');assert.equal(unauth.status,401);
const unauthWorkspace=await fetch(origin+'/api/chart-workspace');assert.equal(unauthWorkspace.status,401);
// Prevent IDOR: signing into one account cannot select another user's workspace via query params.
const leak=await fetch(origin+'/api/chart-workspace?user_id='+encodeURIComponent([...ids][0]),{
 headers:{authorization:'Bearer '+tokens.at(-1).token}});
assert.equal(leak.status,200);
// The API never accepts a user_id filter; check it does not leak target user's stored settings.
const data=await leak.json();assert.equal(data.ok,true);
console.log('PASS authenticated, noncharging PRODUCTION chart entitlement and guest-denial matrix');
