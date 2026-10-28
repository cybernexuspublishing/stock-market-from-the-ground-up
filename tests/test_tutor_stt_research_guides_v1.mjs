import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {chooseGuides,originalGuides,answerFromGuide} from '../functions/_lib/original-competency-tutor-v014100.js';
const read=x=>JSON.parse(readFileSync(new URL('../data/'+x,import.meta.url),'utf8'));
const base=read('competency-study-guides-v01499.json');
const data=read('tutor-research-guides-v1.json');
assert.equal(base.guides.length,30);
assert.equal(base.supplementalGuides.length,1);
assert.equal(data.guides.length,32);
assert.equal(new Set(data.guides.map(g=>g.code)).size,32);
for(const g of data.guides){
 assert(g.researchGuide===true&&g.supplemental===true&&g.officialCompetency===false);
 assert(g.archiveBasis.includes('STT'));
 assert(['concept','procedure','limit','invalidation','commonError','selfCheck','reviewExplanation']
  .every(k=>typeof g[k]==='string'&&g[k].length>=40));
 assert(g.sourceUrls.every(url=>/^https:\/\/(www\.investor\.gov|www\.sec\.gov|www\.finra\.org|toslc\.thinkorswim\.com)\//.test(url)));
}
const phrases=[
 ['SEC_FILINGS','How to read SEC filings'],
 ['ISSUER_IDENTITY','Ticker symbols security identity'],
 ['FLOAT_OUTSTANDING','Float shares outstanding dilution'],
 ['CORPORATE_ACTIONS','Reverse splits corporate actions'],
 ['NBBO_SIP','NBBO consolidated quotations'],
 ['TAPE_EVIDENCE','Time Sales prints aggressor inference'],
 ['ORDER_LIFECYCLE','Order partial fills cancellation'],
 ['ORDER_TIME_IN_FORCE','IOC FOK Day time in force'],
 ['STOP_ORDER_MECHANICS','Stop limit order gap risk'],
 ['HALTS_LULD','Volatility halts suspensions'],
 ['SSR_SHO','Regulation SHO SSR short-sale restriction'],
 ['SETTLEMENT_T1','T+1 settlement cash'],
 ['CLEARING_SIPC','SIPC broker failure protection'],
 ['MARKET_DATA_RIGHTS','market data redistribution rights'],
 ['SCANNER_STATES','scanner discovery qualification states'],
 ['MULTITIMEFRAME','multi-timeframe no lookahead'],
 ['ATR_GAP','true range ATR gap'],
 ['CATALYST_CHRONOLOGY','catalyst timeline announcement'],
 ['RESEARCH_OUTCOMES','predictions outcomes evidence quality'],
 ['BACKTEST_BIAS','backtesting overfitting out of sample'],
 ['RISK_SIZING','position sizing modeled R gap'],
 ['JOURNAL_PROVENANCE','Journal decision retrospective review']
];
for(const [code,q] of phrases){
 const hits=chooseGuides({...base,researchGuides:data.guides},q);
 assert(hits.some(g=>g.code===code),'research retrieval missing '+code);
}
const sourceAsset={fetch:async req=>{
 const path=new URL(req.url).pathname;
 if(path==='/data/competency-study-guides-v01499.json')return Response.json(base);
 if(path==='/data/tutor-research-guides-v1.json')return Response.json(data);
 return Response.json({error:'missing'},{status:404});
}};
const req=new Request('https://example.test/api/market-tutor');
const hits=await originalGuides({ASSETS:sourceAsset},req,'Regulation SHO SSR short-sale restriction');
assert(hits.some(g=>g.code==='SSR_SHO'));
assert(answerFromGuide(hits.find(g=>g.code==='SSR_SHO'),'explain','').includes('Supplementary ungraded'));
assert(answerFromGuide(hits.find(g=>g.code==='SSR_SHO'),'explain','').includes('https://www.sec.gov/investor/pubs/regsho.htm'));
assert(answerFromGuide(hits.find(g=>g.code==='SSR_SHO'),'explain','').includes('not a verified market event'));
const missing={fetch:async req=>new URL(req.url).pathname==='/data/competency-study-guides-v01499.json'
 ?Response.json(base):Response.json({error:'optional catalog disabled'},{status:503})};
const fallback=await originalGuides({ASSETS:missing},req,'candlestick wick candle body');
assert(fallback.some(g=>g.code==='CANDLE_READING'));
// Test the real authenticated Tutor API boundary using synthetic member fixtures.
// Neither a real account nor a billed provider call is involved.
const {onRequest}=await import('../functions/api/market-tutor-v01492.js');
const previous=globalThis.fetch;
let billableCalls=0;
globalThis.fetch=async url=>{
 const target=String(url);
 if(target.endsWith('/auth/v1/user'))return Response.json({id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'});
 if(target.includes('/profiles?'))return Response.json([{account_kind:'member'}]);
 if(target.includes('/admin_user_flags?')||target.includes('/admin_user_roles?'))return Response.json([]);
 if(target.includes('/rpc/user_has_tool_access'))return new Response('true',{headers:{'content-type':'application/json'}});
 if(target.includes('api.openai.com')||target.includes('v01492_consume_tutor_quota')){
  billableCalls++;throw Error('Paid AI or quota reservation forbidden by source-only test');
 }
 throw Error('Unrecognized synthetic API request');
};
try{
 const env={SUPABASE_URL:'https://mock.supabase.co',SUPABASE_PUBLISHABLE_KEY:'sb_publishable_mock',
  SUPABASE_SECRET_KEY:'sb_secret_mock',ASSETS:sourceAsset};
 const res=await onRequest({env,request:new Request('https://example.test/api/market-tutor-v01492',{
  method:'POST',headers:{authorization:'Bearer test-session','content-type':'application/json'},
  body:JSON.stringify({question:'Explain Regulation SHO SSR short sale price test restriction',mode:'explain'})
 })});
 assert.equal(res.status,200);
 const result=await res.json();
 assert.equal(result.generation,'original-competency-guide');
 assert(result.sources.some(x=>x.id==='SSR_SHO'&&/research-informed/.test(x.sourceLabel)));
 assert.equal(result.graded,false);
 assert.equal(result.masteryAwarded,false);
 assert.equal(billableCalls,0);
}finally{globalThis.fetch=previous}
console.log('PASS STT research 32 original public Tutor lessons; 30 canonical skills unchanged; sources checked; optional research asset fails safely');
