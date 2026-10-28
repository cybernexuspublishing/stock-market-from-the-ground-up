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
const missing={fetch:async req=>new URL(req.url).pathname==='/data/competency-study-guides-v01499.json'
 ?Response.json(base):Response.json({error:'optional catalog disabled'},{status:503})};
const fallback=await originalGuides({ASSETS:missing},req,'candlestick wick candle body');
assert(fallback.some(g=>g.code==='CANDLE_READING'));
console.log('PASS STT research 32 original public Tutor lessons; 30 canonical skills unchanged; sources checked; optional research asset fails safely');
