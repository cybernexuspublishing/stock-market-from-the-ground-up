import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {resolveTicker,normalizeSubmissions,normalizeFacts} from '../functions/_lib/sec-issuer-normalize-v1.js';
import {onRequest} from '../functions/api/sec-issuer-research-v1.js';
for(const path of ['functions/_lib/sec-issuer-normalize-v1.js','functions/api/sec-issuer-research-v1.js',
 'assets/js/watchlist-sec-research-v1.js'])
 execFileSync(process.execPath,['--check',new URL('../'+path,import.meta.url).pathname]);
const tickerIndex={0:{cik_str:789019,title:'Example Medical Inc',ticker:'GUSIM'},
 1:{cik_str:44,title:'Other firm',ticker:'OTHER'}};
const identity=resolveTicker(tickerIndex,'GUSIM');
assert.equal(identity.cik,789019);
assert.equal(resolveTicker(tickerIndex,'MISSING').status,'NO_TICKER_MAPPING');
assert.equal(resolveTicker([{ticker:'GUSIM',cik_str:1},{ticker:'GUSIM',cik_str:2}],'GUSIM').status,'AMBIGUOUS_TICKER');
const sample={cik:789019,name:'Example Medical Inc',tickers:['GUSIM'],exchanges:['Nasdaq'],
 filings:{recent:{accessionNumber:['0000789019-26-000001','0000789019-26-000002'],
 form:['8-K','10-Q'],filingDate:['2026-10-01','2026-10-02'],
 reportDate:['2026-09-30','2026-09-30'],
 acceptanceDateTime:['2026-10-01T18:10:00Z',null],
 primaryDocument:['example.htm','report.htm']}}};
const obs='2026-10-30T12:00:00Z';
const filings=normalizeSubmissions(sample,identity,obs);
assert.equal(filings.filings.length,2);
assert.equal(filings.filings[0].publishedAt,'2026-10-01T18:10:00.000Z');
assert.equal(filings.filings[1].publishedAt,null);
assert.equal(filings.filings[1].historicalReplayEligible,false);
assert.match(filings.filings[0].sourceUrl,/www.sec.gov\/Archives\/edgar\/data\/789019\/000078901926000001\/example.htm/);
assert.throws(()=>normalizeSubmissions({...sample,tickers:['OTHER']},identity,obs),/do not confirm/);
assert.throws(()=>normalizeSubmissions({...sample,cik:1234},identity,obs),/did not match/);
const malicious=structuredClone(sample);malicious.filings.recent.primaryDocument[0]='../../secret';
assert.equal(normalizeSubmissions(malicious,identity,obs).filings.length,1);
const facts={cik:789019,facts:{'us-gaap':{
 Revenues:{units:{USD:[{val:2500000,end:'2026-09-30',filed:'2026-10-02',accn:'0000789019-26-000002',form:'10-Q'}]}},
 NetIncomeLoss:{units:{USD:[{val:-18000,end:'2026-09-30',filed:'2026-10-02',accn:'0000789019-26-000002',form:'10-Q'}]}}}}};
const f=normalizeFacts(facts,identity,filings.filings);
assert.equal(f.find(x=>x.metric==='Revenue').observations[0].value,2500000);
assert.equal(f.find(x=>x.metric==='Net income or loss').observations[0].value,-18000);
assert.equal(f.find(x=>x.metric==='Revenue').observations[0].publishedAt,null);
assert.equal(f.find(x=>x.metric==='Total assets').available,false);
assert.throws(()=>normalizeFacts({...facts,cik:4},identity,filings.filings),/different company/);
const env={SUPABASE_URL:'https://mock.supabase.co',SUPABASE_PUBLISHABLE_KEY:'testpublic',
 SUPABASE_SECRET_KEY:'testsecret',SEC_EDGAR_USER_AGENT:'Crownlight Research research@example.org',
 SEC_EDGAR_BETA_ENABLED:'true'};
const user='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const old=globalThis.fetch;
let accesses=0,secRequests=0,entitled=true;
const reply=x=>new Response(JSON.stringify(x),{status:200,headers:{'content-type':'application/json'}});
globalThis.fetch=async(url,opts={})=>{
 const u=String(url);
 if(u.endsWith('/auth/v1/user'))return reply({id:user});
 if(u.includes('/profiles?'))return reply([{account_kind:'member',deleted_at:null}]);
 if(u.includes('/admin_user_flags?'))return reply([{status:'active'}]);
 if(u.includes('/admin_user_roles?'))return reply([{role_code:'MEMBER',expires_at:null}]);
 if(u.includes('/platform_tools?'))return reply([{tool_code:'WATCHLIST_WORKBENCH',active:true,status:'beta',free_preview:false}]);
 if(u.endsWith('/rpc/user_has_tool_access')){accesses++;return reply(entitled)}
 if(u.includes('gu_product_access_config')||u.includes('product_access_config'))return reply([]);
 if(u.startsWith('https://www.sec.gov/')||u.startsWith('https://data.sec.gov/')){
  secRequests++;assert.match(opts.headers['User-Agent'],/research@example.org/);
  if(u.includes('company_tickers.json'))return reply(tickerIndex);
  if(u.includes('/submissions/'))return reply(sample);
  if(u.includes('/companyfacts/'))return reply(facts);
 }
 throw Error('Unexpected mock URL '+u);
};
const make=(query='symbol=GUSIM&include=fundamentals',method='GET')=>new Request(
 'https://example.org/api/sec-issuer-research-v1?'+query,
 {method,headers:{authorization:'Bearer member-token'}});
try{
 let r=await onRequest({request:make(),env}),data=await r.json();
 assert.equal(r.status,200);assert.equal(data.cik,789019);
 assert.equal(data.filings.length,2);assert.equal(data.fundamentals.find(x=>x.metric==='Revenue').available,true);
 assert.equal(data.historicalReplayCertified,false);assert.equal(data.liveQuote,false);
 assert.match(r.headers.get('cache-control'),/no-store/);
 assert.equal(secRequests,3);
 r=await onRequest({request:make('symbol=BAD&url=https://attacker.example'),env});
 assert.equal(r.status,400);assert.equal(secRequests,3);
 r=await onRequest({request:make('symbol=GUSIM','POST'),env});assert.equal(r.status,405);
 entitled=false;
 r=await onRequest({request:make(),env});assert.equal(r.status,403);assert.equal(secRequests,3);
 entitled=true;
 r=await onRequest({request:make(),env:{...env,SEC_EDGAR_BETA_ENABLED:'false'}});
 assert.equal(r.status,503);assert.equal(secRequests,3);
 const html=readFileSync(new URL('../advanced-tool.html',import.meta.url),'utf8');
 assert.match(html,/watchlist-sec-research-v1\.js/);
 assert.match(readFileSync(new URL('../assets/js/watchlist-sec-research-v1.js',import.meta.url),'utf8'),/getSupabaseClient/);
 console.log('PASS official SEC issuer research: strict ticker-CIK, primary sources, timestamps, missing data, entitlement and disabled-source boundaries');
}finally{globalThis.fetch=old}
