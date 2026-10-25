/* Production Pages routing + real anonymous Admin denial; no payment or authenticated mutations. */
import assert from 'node:assert/strict';
const origin='https://stock-market-from-the-ground-up.pages.dev';
const paths=['/','/admin.html','/release-manifest.json','/edge-probe-v014266','/api/edge-probe-v014266','/api/runtime-health-v014259',
 '/api/admin?action=system','/api/admin?action=users',
 '/api/admin-accounts-v01353?action=list','/api/admin-prelive-v014247',
 '/api/admin-control-registry','/api/admin-access-v01355?tab=overview',
 '/api/admin-site-v01354?action=overview','/api/admin-operations-v0135?action=overview',
 '/api/admin-operations-center-v0135?action=overview','/api/admin-owner-notifications'];
// Fail-open was restored after a controlled test; investigate actual Functions routing.
const problems=[];
for(const path of paths){
 let res;
 try{res=await fetch(origin+path,{redirect:path.startsWith('/api/')?'manual':'follow',cache:'no-store',
  headers:{accept:'application/json,text/html'},signal:AbortSignal.timeout(15000)})}
 catch(e){problems.push('Network '+path+' '+String(e.message||e));continue}
 const asset=!path.startsWith('/api/')&&path!=='/edge-probe-v014266';
 const healthy=['/edge-probe-v014266','/api/edge-probe-v014266','/api/runtime-health-v014259'].includes(path);
 const ok=asset||healthy?res.status===200:[401,403].includes(res.status);
 const cache=(res.headers.get('cache-control')||'').toLowerCase();
 const ct=res.headers.get('content-type')||'unknown';
 console.log('Production',path,'HTTP',res.status,'type',ct,'cache',cache||'<none>');
 if(!ok)problems.push(path+' unexpected HTTP '+res.status+' ('+ct+')');
 if(!asset&&!cache.includes('no-store'))problems.push(path+' missing no-store cache control');
 if(!asset){
  const body=await res.text();
  if(!ok)console.log('Unexpected response sample',path,body.replace(/\\s+/g,' ').slice(0,160));
  if(healthy){
   const flag=path==='/api/runtime-health-v014259'?'x-gu-functions':'x-gu-probe';
   const expected=path==='/api/runtime-health-v014259'?'v014259':path==='/edge-probe-v014266'?'root-v014266':'api-v014266';
   if(res.headers.get(flag)!==expected)problems.push('Pages Function probe did not execute: '+path);
   console.log('Probe marker',path,res.headers.get(flag)||'<none>','server',res.headers.get('server')||'<none>');
  }
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
// Determine whether static fallback is canonical-domain routing or all Pages versions.
const deploymentHosts=['https://2bcb7d83.stock-market-from-the-ground-up.pages.dev',
 'https://0a0435a4.stock-market-from-the-ground-up.pages.dev'];
for(const host of deploymentHosts){
 for(const path of ['/','/api/admin?action=system','/api/admin-prelive-v014247']){
  try{
   const res=await fetch(host+path,{redirect:'manual',cache:'no-store',headers:{accept:'application/json'},
    signal:AbortSignal.timeout(15000)});
   console.log('Versioned deployment',new URL(host).hostname,path,'HTTP',res.status,
    'type',res.headers.get('content-type')||'<none>','server',res.headers.get('server')||'<none>');
  }catch(error){console.log('Versioned diagnostic unavailable',host,path,String(error.message||error))}
 }
}
assert.equal(problems.length,0,'Production Pages routing/authorization failures:\n'+problems.join('\n'));
console.log('PASS production static routing, 10 private GET gates and two unauthorized mutation denials');
