/* SEC EDGAR V1 — read-only original source normalization.
 * Filing acceptance times are not market reaction times. Dates without an
 * exact timestamp never establish that information was available in replay.
 */
export const VALID_SYMBOL=/^[A-Z][A-Z0-9.-]{0,11}$/;
const FORMS=new Set(['8-K','8-K/A','10-K','10-K/A','10-Q','10-Q/A','S-1','S-1/A','424B2','424B3','424B4','424B5','4','4/A','3','5','SC 13D','SC 13G','DEF 14A','6-K','20-F']);
const FIELDS=Object.freeze([
 {name:'Revenue',taxonomy:'us-gaap',tags:['RevenueFromContractWithCustomerExcludingAssessedTax','Revenues','SalesRevenueNet'],unit:'USD'},
 {name:'Net income or loss',taxonomy:'us-gaap',tags:['NetIncomeLoss'],unit:'USD'},
 {name:'Total assets',taxonomy:'us-gaap',tags:['Assets'],unit:'USD'},
 {name:'Total liabilities',taxonomy:'us-gaap',tags:['Liabilities'],unit:'USD'},
 {name:'Operating cash flow',taxonomy:'us-gaap',tags:['NetCashProvidedByUsedInOperatingActivities'],unit:'USD'},
 {name:'Diluted earnings per share',taxonomy:'us-gaap',tags:['EarningsPerShareDiluted'],unit:'USD/shares'},
 {name:'Common shares outstanding',taxonomy:'dei',tags:['EntityCommonStockSharesOutstanding'],unit:'shares'}
]);
const safeDate=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&!Number.isNaN(Date.parse(s+'T00:00:00Z'))?s:null;
const safeTime=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(s)&&Number.isFinite(Date.parse(s))?new Date(s).toISOString():null;
const safeText=(s,max=160)=>String(s??'').slice(0,max).replace(/[\u0000-\u001f]/g,'').trim();
export function resolveTicker(index,ticker){
 const symbol=String(ticker||'').toUpperCase();
 if(!VALID_SYMBOL.test(symbol))throw Error('Invalid ticker.');
 const rows=Array.isArray(index)?index:Object.values(index||{});
 const matching=rows.filter(x=>x&&String(x.ticker||'').toUpperCase()===symbol&&
   Number.isSafeInteger(Number(x.cik_str))&&Number(x.cik_str)>0&&Number(x.cik_str)<10000000000);
 const ids=[...new Set(matching.map(x=>Number(x.cik_str)))];
 if(ids.length!==1)return {status:ids.length?'AMBIGUOUS_TICKER':'NO_TICKER_MAPPING',symbol};
 return {status:'MATCHED',symbol,cik:ids[0],name:safeText(matching[0].title,180)};
}
export function normalizeSubmissions(data,identity,observationTime){
 if(identity?.status!=='MATCHED'||Number(data?.cik)!==identity.cik)
   throw Error('SEC filing company identity did not match the ticker lookup.');
 const tickers=Array.isArray(data.tickers)?data.tickers.map(x=>String(x).toUpperCase()):[];
 if(!tickers.includes(identity.symbol))throw Error('SEC submissions do not confirm the requested ticker.');
 const recent=data?.filings?.recent||{},accessions=Array.isArray(recent.accessionNumber)?recent.accessionNumber:[];
 const size=Math.min(accessions.length,1000),filings=[],lookup=new Map();
 for(let i=0;i<size;i++){
  const acc=String(accessions[i]||''),form=safeText(recent.form?.[i],16),
   doc=String(recent.primaryDocument?.[i]||''),
   date=safeDate(recent.filingDate?.[i]),accepted=safeTime(recent.acceptanceDateTime?.[i]);
  if(!FORMS.has(form)||!/^\d{10}-\d{2}-\d{6}$/.test(acc)||
    !/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(doc)||doc.includes('..')||!date)continue;
  if(accepted&&Date.parse(accepted)>Date.parse(observationTime))continue;
  const url='https://www.sec.gov/Archives/edgar/data/'+identity.cik+'/'+acc.replaceAll('-','')+'/'+doc;
  const row={accession:acc,form,filedDate:date,reportDate:safeDate(recent.reportDate?.[i]),
   publishedAt:accepted,publicationTimeKnown:accepted!==null,
   sourceUrl:url,source:'SEC_EDGAR',historicalReplayEligible:accepted!==null,
   timingLimitation:accepted?'SEC acceptance time, not evidence of when a trader observed it':
    'Only a filing DATE is available; historical intraday availability is unknown'};
  if(!lookup.has(acc)){lookup.set(acc,row);filings.push(row)}
 }
 return {symbol:identity.symbol,cik:identity.cik,company:safeText(data.name||identity.name,180),
  exchanges:Array.isArray(data.exchanges)?data.exchanges.map(x=>safeText(x,60)).slice(0,10):[],
  sourceUrl:'https://data.sec.gov/submissions/CIK'+String(identity.cik).padStart(10,'0')+'.json',
  observedAt:observationTime,filings:filings.slice(0,60),filingsWindow:'SEC_RECENT_ONLY',
  accessionLookup:lookup};
}
export function normalizeFacts(data,identity,filings){
 if(Number(data?.cik)!==identity.cik)throw Error('SEC fundamentals belong to a different company.');
 const byAccession=new Map((filings||[]).map(x=>[x.accession,x]));
 const result=[];
 for(const field of FIELDS){
  let chosen=null,tag=null;
  for(const candidate of field.tags){
   const values=data?.facts?.[field.taxonomy]?.[candidate]?.units?.[field.unit];
   if(Array.isArray(values)&&values.length){chosen=values;tag=candidate;break}
  }
  if(!chosen){result.push({metric:field.name,available:false,observations:[],reason:'NOT_REPORTED_IN_SELECTED_SEC_TAXONOMY'});continue}
  const points=chosen.filter(x=>x&&typeof x.val==='number'&&Number.isFinite(x.val)&&safeDate(x.end)&&
    safeDate(x.filed)&&typeof x.accn==='string'&&x.accn.length<=24)
   .map(x=>{
    const doc=byAccession.get(x.accn),publishedAt=doc?.publishedAt||null;
    return {value:x.val,unit:field.unit,periodStart:safeDate(x.start),
     periodEnd:x.end,filingDate:x.filed,form:safeText(x.form,12),accession:x.accn,
     publishedAt,sourceUrl:doc?.sourceUrl||null,
     historicalReplayEligible:publishedAt!==null,
     source:'SEC_XBRL_REPORTED_FACT',isEstimate:false,
     limitation:publishedAt?'Original filing acceptance verified against recent submission':
      'Exact first availability not established; not eligible for historical intraday replay'};
   })
   .sort((a,b)=>b.filingDate.localeCompare(a.filingDate)||b.periodEnd.localeCompare(a.periodEnd))
   .slice(0,8);
  result.push({metric:field.name,available:points.length>0,unit:field.unit,tag,observations:points,
   reason:points.length?null:'NO_VALID_REPORTED_OBSERVATION'});
 }
 return result;
}
