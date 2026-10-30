/* Read-only, entitlement-gated SEC issuer research. All upstream addresses
 * are fixed SEC endpoints. Never accepts URLs, CIKs, or member IDs from a client.
 * This is not a continuous live feed or certified historical replay service.
 */
import {advancedToolContext,privateJson} from '../_lib/advanced-tool-access-v014110.js';
import {VALID_SYMBOL,resolveTicker,normalizeSubmissions,normalizeFacts} from '../_lib/sec-issuer-normalize-v1.js';
const HEAD={'content-type':'application/json; charset=utf-8','cache-control':'private, no-store',
 'x-content-type-options':'nosniff'};
const send=(x,status=200)=>new Response(JSON.stringify(x),{status,headers:HEAD});
const failure=(message,status)=>Object.assign(new Error(message),{status});
const URL_INDEX='https://www.sec.gov/files/company_tickers.json';
const SEC_BASE='https://data.sec.gov/';
function userAgent(env){
 const agent=String(env.SEC_EDGAR_USER_AGENT||'').trim();
 if(agent.length<12||agent.length>160||/[\r\n]/.test(agent)||!/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(agent))
  throw failure('SEC research requires a configured contact-identifying SEC_EDGAR_USER_AGENT.',503);
 return agent;
}
async function secJson(url,env,ttl,cap,actor){
 const cache=globalThis.caches?.default;
 const cacheKey=new Request(url,{method:'GET'});
 if(cache){
  const hit=await cache.match(cacheKey).catch(()=>null);
  if(hit){const json=await hit.json().catch(()=>null);if(json)return json}
 }
 // One shared Supabase transaction budget across all Cloudflare edge instances.
 // No external SEC call is permitted if coordination is unavailable or full.
 const granted=await privateJson(actor.c,'rpc/gu_sec_edgar_take_budget_v1','POST',{});
 if(granted!==true)throw failure('SEC shared fair-access budget reached. Retry later.',429);
 const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),9000);
 let res;
 try{
  res=await fetch(url,{method:'GET',headers:{'User-Agent':userAgent(env),
    'Accept':'application/json'},cache:'no-store',redirect:'error',signal:controller.signal});
  if(!res.ok)throw failure('SEC source returned HTTP '+res.status,503);
  const length=Number(res.headers.get('content-length')||0);
  if(length>cap)throw failure('SEC source response exceeded safe limits.',503);
  const raw=await res.text();
  if(new TextEncoder().encode(raw).byteLength>cap)throw failure('SEC source response exceeded safe limits.',503);
  const value=JSON.parse(raw);
  if(!value||typeof value!=='object')throw Error('Invalid SEC JSON.');
  if(cache)await cache.put(cacheKey,new Response(JSON.stringify(value),{
   headers:{'content-type':'application/json','cache-control':'public,max-age='+ttl}
  })).catch(()=>{});
  return value;
 }catch(e){throw failure('Official SEC source could not be verified; no filing data has been confirmed.',503)}
 finally{clearTimeout(timeout)}
}
export async function onRequest({request,env}){
 try{
  if(request.method!=='GET')return send({ok:false,error:'READ_ONLY'},405);
  const u=new URL(request.url),keys=[...u.searchParams.keys()];
  if(keys.some(k=>!['symbol','include'].includes(k))||keys.filter(k=>k==='symbol').length!==1||
    keys.filter(k=>k==='include').length>1)throw failure('Only a ticker and optional fundamentals mode are supported.',400);
  const symbol=String(u.searchParams.get('symbol')||'').toUpperCase(),mode=u.searchParams.get('include')||'filings';
  if(!VALID_SYMBOL.test(symbol)||!['filings','fundamentals'].includes(mode))
   throw failure('Valid ticker and source mode required.',400);
  const actor=await advancedToolContext(env,request,'WATCHLIST_WORKBENCH');
  if(!actor.allowed||actor.accessLevel!=='entitled')
   throw failure('Active Advanced Workbench entitlement required.',403);
  if(env.SEC_EDGAR_BETA_ENABLED!=='true')throw failure('Authorized SEC retrieval is not yet enabled.',503);
  userAgent(env);
  const observedAt=new Date().toISOString();
  const index=await secJson(URL_INDEX,env,86400,4500000,actor);
  const identity=resolveTicker(index,symbol);
  if(identity.status!=='MATCHED')return send({ok:true,symbol,identityStatus:identity.status,
   filingDataAvailable:false,source:'SEC_EDGAR',
   note:'No unique current SEC ticker/CIK mapping was found. Do not infer company identity.'});
  const cik=String(identity.cik).padStart(10,'0');
  const base=await secJson(SEC_BASE+'submissions/CIK'+cik+'.json',env,900,5000000,actor);
  const normalized=normalizeSubmissions(base,identity,observedAt);
  const {accessionLookup,...safe}=normalized;
  const fundamentals=mode==='fundamentals'?
   normalizeFacts(await secJson(SEC_BASE+'api/xbrl/companyfacts/CIK'+cik+'.json',env,21600,12000000,actor),
    identity,normalized.filings):null;
  return send({ok:true,identityStatus:'MATCHED',...safe,fundamentals,
   source:'SEC_EDGAR_PRIMARY',authorizedSource:true,liveQuote:false,
   historicalReplayCertified:false,marketAdvice:false,
   note:'Recent SEC disclosures and reported XBRL facts, not an assessment of trading opportunity. SEC ticker mappings may be incomplete. Exact publication times are only known where a filing acceptance timestamp was supplied. Missing values are not zero.'});
 }catch(e){
  const status=[400,401,403,404,405,429].includes(e?.status)?e.status:503;
  return send({ok:false,error:status===503?'Official SEC research temporarily unavailable or not enabled. No source was verified.':e.message},status);
 }
}
