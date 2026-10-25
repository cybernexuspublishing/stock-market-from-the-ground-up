/* Production Pages routing + real anonymous Admin denial; no payment or authenticated mutations. */
import assert from 'node:assert/strict';
const origin='https://stock-market-from-the-ground-up.pages.dev';
const paths=['/','/admin.html','/release-manifest.json',
 '/api/admin?action=system','/api/admin?action=users',
 '/api/admin-accounts-v01353?action=list','/api/admin-prelive-v014247',
 '/api/admin-control-registry','/api/admin-access-v01355?tab=overview',
 '/api/admin-site-v01354?action=overview','/api/admin-operations-v0135?action=overview',
 '/api/admin-operations-center-v0135?action=overview','/api/admin-owner-notifications'];
const problems=[];
for(const path of paths){
 let res;
 try{res=await fetch(origin+path,{redirect:path.startsWith('/api/')?'manual':'follow',cache:'no-store',
  headers:{accept:'application/json,text/html'},signal:AbortSignal.timeout(15000)})}
 catch(e){problems.push('Network '+path+' '+String(e.message||e));continue}
 const asset=!path.startsWith('/api/');
 const ok=asset?res.status===200:[401,403].includes(res.status);
 const cache=(res.headers.get('cache-control')||'').toLowerCase();
 const ct=res.headers.get('content-type')||'unknown';
 console.log('Production',path,'HTTP',res.status,'type',ct,'cache',cache||'<none>');
 if(!ok)problems.push(path+' unexpected HTTP '+res.status+' ('+ct+')');
 if(!asset&&!cache.includes('no-store'))problems.push(path+' missing no-store cache control');
 if(!asset){
  const body=await res.text();
  if(/sb_secret_|sk_live_|whsec_/i.test(body))problems.push(path+' leaked sensitive token');
 }
}
for(const path of ['/api/admin?action=save_role_atomic','/api/admin-accounts-v01353?action=create']){
 try{
  const r=await fetch(origin+path,{method:'POST',headers:{'content-type':'application/json',accept:'application/json'},
   body:'{}',redirect:'manual',cache:'no-store',signal:AbortSignal.timeout(15000)});
  console.log('Unauthenticated POST',path,'HTTP',r.status);
  if(![401,403].includes(r.status))problems.push(path+' permitted or misrouted anonymous POST: '+r.status);
 }catch(e){problems.push('Network POST '+path+' '+String(e.message||e))}
}
assert.equal(problems.length,0,'Production Pages routing/authorization failures:\n'+problems.join('\n'));
console.log('PASS production static routing, 10 private GET gates and two unauthorized mutation denials');
