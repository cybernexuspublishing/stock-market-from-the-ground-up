/* V2 one-time IndexNow public-page publication notifier.
 * Fetch and validate the live origin, ownership file, sitemap, and four
 * canonical public pages before making ONE notification on explicit --submit.
 * Never send private/member URLs or claim inclusion in any search index.
 */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const origin='https://stock-market-from-the-ground-up-d1r.pages.dev';
const host=new URL(origin).host;
const key='0f6a1a00e2945eb90d24e5c5b6e75946';
const paths=['/candle-practice.html','/free-foundations-challenge.html',
 '/market-vs-limit-orders.html','/support-resistance-basics.html'];
const mode=process.argv.slice(2);
assert(mode.length===1&&['--verify','--submit'].includes(mode[0]),'Use --verify or --submit');
assert(/^[a-f0-9]{32}$/.test(key),'Invalid ownership key');
assert(readFileSync(key+'.txt','utf8').trim()===key,'IndexNow ownership file source mismatch');
const fetchText=async(u)=>{
 const r=await fetch(u,{cache:'no-store',signal:AbortSignal.timeout(18000)});
 if(r.status!==200)throw Error('Public resource not available: '+new URL(u).pathname+' HTTP '+r.status);
 return r.text();
};
let verified=false;
for(let attempt=0;attempt<12;attempt++){
 try{
  const actual=(await fetchText(origin+'/'+key+'.txt')).trim();
  if(actual!==key)throw Error('Production IndexNow key file mismatch');
  verified=true;break;
 }catch(e){
  if(attempt===11)throw e;
  await new Promise(resolve=>setTimeout(resolve,12000));
 }
}
assert(verified,'Production ownership verification failed');
const sitemap=await fetchText(origin+'/sitemap.xml');
const urls=paths.map(path=>origin+path);
for(const url of urls){
 assert(new URL(url).host===host,'No third-party URLs');
 assert(sitemap.includes('<loc>'+url+'</loc>'),'Public canonical absent from actual production sitemap: '+url);
 const page=await fetchText(url);
 assert(page.includes('rel="canonical"')&&page.includes(url),'Missing final canonical: '+url);
 assert(!/<meta\s+name="robots"\s+content="noindex/i.test(page),'Public page blocked by noindex');
}
console.log('PASS V2 search discovery: live domain key file, sitemap and four public canonicals verified.');
if(mode[0]==='--submit'){
 const payload={host,key,keyLocation:origin+'/'+key+'.txt',urlList:urls};
 const response=await fetch('https://api.indexnow.org/indexnow',{
  method:'POST',headers:{'content-type':'application/json; charset=utf-8'},
  body:JSON.stringify(payload),signal:AbortSignal.timeout(18000)
 });
 const state=response.status===200?'RECEIVED':response.status===202?'RECEIVED_PENDING_VERIFICATION':'FAILED';
 console.log('IndexNow response HTTP '+response.status+' — '+state+
  '; this is a receipt signal only, not evidence of crawling, indexing, ranking or Google submission.');
 if(state==='FAILED')process.exitCode=1;
}else console.log('DRY RUN — no IndexNow request was transmitted.');
