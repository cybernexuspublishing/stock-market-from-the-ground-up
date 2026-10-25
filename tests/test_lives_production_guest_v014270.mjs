/* v0.14.0.270 — LIVE Pages site guest acceptance, no purchases, auth credentials or database writes. */
import assert from 'node:assert/strict';
const ORIGIN='https://stock-market-from-the-ground-up-lives.pages.dev';
const fetchJSON=async path=>{
 const response=await fetch(ORIGIN+path,{method:'GET',redirect:'manual',cache:'no-store',
  headers:{accept:'application/json'},signal:AbortSignal.timeout(20000)});
 const raw=await response.text();
 let data;try{data=JSON.parse(raw)}catch{data=null}
 return {response,data,raw};
};
const failures=[];
for(const path of ['/','/create-account.html','/signin.html','/founding600.html','/store.html']){
 try{
  const r=await fetch(ORIGIN+path,{cache:'no-store',redirect:'manual',signal:AbortSignal.timeout(20000)});
  console.log('LIVES PUBLIC',path,r.status,r.headers.get('content-type'));
  if(r.status!==200||!(r.headers.get('content-type')||'').includes('text/html'))failures.push('Public page '+path+' unavailable');
 }catch(e){failures.push('Public page '+path+' fetch: '+String(e))}
}
for(const [path,status,check] of [
 ['/api/runtime-health-v014259',200,d=>d?.ok===true&&d.service==='ground-up-pages-functions'],
 ['/api/edge-probe-v014266',200,d=>d?.ok===true&&d.route==='api'],
 ['/api/admin?action=system',401,d=>d?.ok===false],
 ['/api/admin-prelive-v014247',401,d=>d?.ok===false],
 ['/api/account?action=identity',401,d=>d?.ok===false],
 ['/api/founding600-checkout',200,d=>d?.ok===true&&d.checkoutEnabled===false&&d.capacity===600&&
  d.plans?.some(p=>p.code==='FOUNDING_30'&&p.priceCents===4999&&p.billingDays===30)&&
  d.plans?.some(p=>p.code==='FOUNDING_60'&&p.priceCents===5999&&p.billingDays===60)]
]){
 try{
  const x=await fetchJSON(path);
  console.log('LIVES FUNCTION',path,'HTTP',x.response.status,'type',x.response.headers.get('content-type'),'JSON',!!x.data);
  if(x.response.status!==status||!x.data||!check(x.data))failures.push('Functions mismatch '+path+' status '+x.response.status+' json='+!!x.data);
  if(!(x.response.headers.get('cache-control')||'').includes('no-store'))failures.push('No private no-store '+path);
 }catch(e){failures.push('Functions '+path+' error '+String(e))}
}
assert.deepEqual(failures,[],failures.join('\n'));
console.log('PASS LIVES public pages, direct root/API Functions, anonymous role denials and closed Founding 600 recurring Checkout.');
