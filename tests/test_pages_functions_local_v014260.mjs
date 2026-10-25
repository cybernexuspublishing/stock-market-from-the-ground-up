/* v0.14.0.260: exercise the actual Cloudflare Pages local Worker, not mocks. */
import assert from 'node:assert/strict';
const origin=process.env.GU_PAGES_LOCAL_ORIGIN||'http://127.0.0.1:8792';
let ready=false;
for(let i=0;i<30;i++){
 try{const r=await fetch(origin+'/api/runtime-health-v014259',{cache:'no-store',signal:AbortSignal.timeout(2500)});
  if(r.status===200){const obj=await r.json();assert.equal(obj.service,'ground-up-pages-functions');assert.equal(r.headers.get('x-gu-functions'),'v014259');ready=true;break;}
  console.log('Local Pages Functions retry',i,'HTTP',r.status);
 }catch(e){console.log('Local Pages Functions not ready',i,String(e.message||e).slice(0,140))}
 await new Promise(resolve=>setTimeout(resolve,1000));
}
assert(ready,'Real Wrangler Pages runtime must dispatch /api/runtime-health-v014259');
const admin=await fetch(origin+'/api/admin?action=system',{cache:'no-store',headers:{accept:'application/json'}});
const body=await admin.text();
assert.notEqual(admin.status,404,'Local Admin handler must not fall through to static 404');
assert.notEqual(admin.status,405,'Local Admin handler must not fall through to static 405');
assert.match(admin.headers.get('content-type')||'',/application\/json/,'Local handler must emit JSON, not HTML');
console.log('PASS actual local Cloudflare Pages Functions dispatch: runtime=200, Admin=',admin.status,'body=',body.slice(0,150));
