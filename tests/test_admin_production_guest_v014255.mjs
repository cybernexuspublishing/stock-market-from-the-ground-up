/* Safe deployed API gate — anonymous requests only; never submits real payments or identities. */
import assert from 'node:assert/strict';
const origin='https://stock-market-from-the-ground-up.pages.dev';
const routes=[
 '/api/admin?action=system',
 '/api/admin?action=users',
 '/api/admin-accounts-v01353?action=list',
 '/api/admin-prelive-v014247',
 '/api/admin-control-registry',
 '/api/admin-access-v01355?tab=overview',
 '/api/admin-site-v01354?action=overview',
 '/api/admin-operations-v0135?action=overview',
 '/api/admin-operations-center-v0135?action=overview',
 '/api/admin-owner-notifications'
];
const valid=[401,403];
for(const path of routes){
 let response;
 try{response=await fetch(origin+path,{redirect:'manual',cache:'no-store',headers:{accept:'application/json'},signal:AbortSignal.timeout(15000)});}
 catch(error){throw Error('Cannot reach production '+path+': '+String(error.message||error));}
 const cc=(response.headers.get('cache-control')||'').toLowerCase();
 assert(valid.includes(response.status),`Production API ${path} returned HTTP ${response.status}; expected 401/403`);
 assert(cc.includes('no-store'),`Production API ${path} lacks no-store protection`);
 const body=await response.text();
 assert(!/service_role|sb_secret_|sk_live_|whsec_/i.test(body),'Anonymous error body must not disclose secrets');
 console.log('PASS anonymous production denial',path,response.status);
}
for(const path of ['/api/admin?action=save_role_atomic','/api/admin-accounts-v01353?action=create']){
 const r=await fetch(origin+path,{method:'POST',headers:{'content-type':'application/json',accept:'application/json'},body:'{}',redirect:'manual',cache:'no-store',signal:AbortSignal.timeout(15000)});
 assert(valid.includes(r.status),`Anonymous POST ${path} must return 401/403, got ${r.status}`);
 console.log('PASS unauthorized write denied',path,r.status);
}
console.log('PASS 12 production anonymous API denial checks; no authenticated actions or payment operations were performed');
