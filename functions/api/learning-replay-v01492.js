/* v0.14.0.92 | Server-owned, durable, forward-only educational OHLCV replay.
 * Requires Owner-reviewed private SQL and separately licensed/published historical
 * OHLCV bars. No datasets are seeded. No tick or brokerage fills are claimed.
 */
import {toolAccess} from './member-tool-access.js';
import {fictionalReplayPermitted,FICTIONAL_REPLAY_DISCLOSURE} from '../_lib/fictional-replay-policy-v1.js';
import {fillEstimate,bracketOutcome} from '../_lib/replay-engine-v01492.js';
import {replayAvailableToEntitlement,verifiedHistoricalDataset,historicalQaReleasePermitted} from '../_lib/verified-historical-dataset-v014143.js';
const H={'content-type':'application/json; charset=utf-8','cache-control':'private, no-store','x-content-type-options':'nosniff'};
const out=(obj,status=200)=>new Response(JSON.stringify(obj),{status,headers:H});
const bad=(message,status=400)=>Object.assign(new Error(message),{status});
const match=/^[A-Z][A-Z0-9_-]{2,79}$/,uid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function cfg(env){const base=String(env.SUPABASE_URL||'').replace(/\/$/,'');const secret=String(env.SUPABASE_SECRET_KEY||'');
 if(!/^https:\/\/[^/]+$/.test(base)||!secret)throw bad('Replay backend unavailable.',503);
 const headers={apikey:secret,accept:'application/json'};
 if(/^eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(secret))headers.authorization='Bearer '+secret;
 return {base,headers};}
async function db(env,path,method='GET',body,prefer){
 const c=cfg(env),r=await fetch(c.base+'/rest/v1/'+path,{method,cache:'no-store',
 headers:{...c.headers,...(body!==undefined?{'content-type':'application/json'}:{}),...(prefer?{prefer}:{})},
 body:body===undefined?undefined:JSON.stringify(body)});
 if(!r.ok)throw bad('Replay storage or required Owner schema unavailable.',503);
 const text=await r.text();try{return text?JSON.parse(text):null}catch{throw bad('Replay storage returned invalid data.',503)}
}
const one=(rows)=>Array.isArray(rows)?rows[0]:null;
function fmt(bar){
 if(!bar)return null;
 const fields=['open','high','low','close','volume'],numbers={};
 for(const x of fields){numbers[x]=Number(bar[x]);if(!Number.isFinite(numbers[x]))throw bad('Historical bar data failed numeric validation.',503)}
 if(!Number.isSafeInteger(Number(bar.bar_index))||Number(bar.bar_index)<0||!Number.isFinite(Date.parse(bar.bar_at))||
    ['open','high','low','close'].some(k=>numbers[k]<=0)||
    numbers.high<Math.max(numbers.open,numbers.close)||numbers.low>Math.min(numbers.open,numbers.close)||numbers.volume<0)throw bad('Historical bar failed price integrity validation.',503);
 return {index:bar.bar_index,timestamp:bar.bar_at,...numbers};
}
function publicDataset(source){return verifiedHistoricalDataset(source)}
async function fetchBar(env,code,index){
 const rows=await db(env,'gu_replay_bars_v01492?select=bar_index,bar_at,open,high,low,close,volume&dataset_code=eq.'+encodeURIComponent(code)+'&bar_index=eq.'+index+'&limit=1');
 return fmt(one(rows));
}
async function session(env,id,user){
 if(!uid.test(id))throw bad('Invalid session ID.');
 const rows=await db(env,'gu_replay_sessions_v01492?select=id,dataset_code,current_index,decision_locked,decision,decision_plan,status,expires_at,created_at&user_id=eq.'+encodeURIComponent(user)+'&id=eq.'+encodeURIComponent(id)+'&limit=1');
 const s=one(rows);
 if(!s)throw bad('Replay session unavailable.',404);
 if(s.status!=='active'||Date.parse(s.expires_at)<=Date.now())throw bad('Replay expired or finished.',409);
 return s;
}
async function bodyOf(request){
 const declared=Number(request.headers.get('content-length')||0);
 if(declared>5000)throw bad('Request too large.',413);
 const raw=await request.text();if(raw.length>5000)throw bad('Request too large.',413);
 let body;try{body=JSON.parse(raw)}catch{throw bad('Invalid request JSON.')}
 if(!body||typeof body!=='object'||Array.isArray(body))throw bad('Invalid replay request.');return body;
}
function lockedPlan(p){
 if(!p||typeof p!=='object'||Array.isArray(p))return null;
 const side=String(p.side||''),type=String(p.type||'');
 if(!['BUY','SELL'].includes(side)||!['MARKET','LIMIT','STOP'].includes(type))throw bad('Invalid plan side or order type.');
 const quantity=Number(p.quantity);
 if(!Number.isSafeInteger(quantity)||quantity<1||quantity>1000000)throw bad('Invalid share quantity.');
 const limitPrice=p.limitPrice==null?null:Number(p.limitPrice),stopPrice=p.stopPrice==null?null:Number(p.stopPrice);
 const slippageBps=p.slippageBps==null?0:Number(p.slippageBps),spreadBps=p.spreadBps==null?0:Number(p.spreadBps),fees=p.fees==null?0:Number(p.fees);
 if((type==='LIMIT'&&!(limitPrice>0))||(type==='STOP'&&!(stopPrice>0))||
  ![slippageBps,spreadBps,fees].every(Number.isFinite)||slippageBps<0||slippageBps>2000||spreadBps<0||spreadBps>2000||fees<0||fees>100000)throw bad('Invalid execution assumptions.');
 return {side,type,quantity,limitPrice,stopPrice,slippageBps,spreadBps,fees};
}
export async function onRequest({request,env}){
 try{
  if(!['GET','POST'].includes(request.method))throw bad('Method not allowed.',405);
  const url=new URL(request.url);
  const scope=url.searchParams.get('scope')||'historical';
  if(!['historical','fictional'].includes(scope))throw bad('Unknown replay source classification.',400);
  if(request.method==='POST'){
   const origin=request.headers.get('origin'),site=request.headers.get('sec-fetch-site');
   if(origin&&origin!==url.origin||site&&!['same-origin','none'].includes(site))
    throw bad('Cross-origin replay changes are denied.',403);
  }
  const simulator=await toolAccess(env,request,'MARKET_SIMULATOR');
  // No fictional market observations may be served as instructional evidence.
  // Replay-only members may use explicitly approved historical datasets
  // without acquiring the full Market Simulator entitlement.
  const auth=scope==='fictional'?simulator:
   simulator.authorized?simulator:await toolAccess(env,request,'ONDEMAND_TRAINING');
  const entitlement=simulator.authorized?'MARKET_SIMULATOR':'ONDEMAND_TRAINING';
  if(scope==='fictional'?!auth.userId||auth.freeEligible!==true:!auth.authorized)
   throw bad(scope==='fictional'?'An eligible signed-in member is required for fictional practice.':
    'An active Market Simulator or Historical Replay training entitlement is required.',403);
  const permitted=dataset=>scope==='fictional'?
   fictionalReplayPermitted(dataset):(replayAvailableToEntitlement(dataset,entitlement)&&
   historicalQaReleasePermitted(dataset,auth.userId));
  const disclosure=scope==='fictional'?FICTIONAL_REPLAY_DISCLOSURE:
   'Only independently verified, display-licensed authentic historical market observations are permitted.';

  const action=String(url.searchParams.get('action')||'current');
  const body=request.method==='POST'?await bodyOf(request):{};
  if(action==='catalog'&&request.method==='GET'){
   const rows=await db(env,'market_datasets?select=dataset_code,title,ticker,dataset_type,status,source_attribution,license_note,metadata&status=eq.published&dataset_type=eq.ohlcv&order=dataset_code.asc&limit=700');
   if(!Array.isArray(rows))throw bad('Dataset catalog is unavailable.',503);
   return out({ok:true,scope,classification:scope==='fictional'?'FICTIONAL':'VERIFIED HISTORICAL',datasets:rows.filter(permitted).slice(0,700).map(x=>({code:x.dataset_code,title:x.title,ticker:x.ticker,sourceAttribution:x.source_attribution,licenseNotice:x.license_note,date:x.metadata?.source_date||null,synthetic:x.metadata?.original_synthetic===true})),notice:disclosure+' Only server-revealed bars are returned.'});
  }
  if(action==='resume'&&request.method==='GET'){
   // Durable sessions are discovered by authenticated user identity, not a
   // browser-stored sessionId. Return exactly the current visible observation.
   const active=await db(env,'gu_replay_sessions_v01492?select=id,dataset_code,current_index,decision_locked,decision,status,expires_at&user_id=eq.'+
    encodeURIComponent(auth.userId)+'&status=eq.active&expires_at=gt.'+encodeURIComponent(new Date().toISOString())+
    '&dataset_code='+(scope==='fictional'?'like.GUSIM_*':'not.like.GUSIM_*')+'&order=created_at.desc&limit=1');
   const selected=one(active);
   if(!selected)return out({ok:true,session:null,notice:'No current replay session. Choose a licensed dataset.'});
   const rights=one(await db(env,'market_datasets?select=dataset_code,title,ticker,dataset_type,status,source_attribution,license_note,metadata&dataset_code=eq.'+
    encodeURIComponent(selected.dataset_code)+'&limit=1'));
   if(!permitted(rights))throw bad('This replay dataset is not authorized under the current membership or its publication rights were withdrawn.',403);
   const bar=await fetchBar(env,selected.dataset_code,selected.current_index);
   if(!bar)throw bad('The current replay observation is unavailable.',503);
   return out({ok:true,session:{id:selected.id,currentIndex:selected.current_index,decisionLocked:selected.decision_locked,
    decision:selected.decision,bar,dataset:{code:rights.dataset_code,title:rights.title,ticker:rights.ticker,
    sourceAttribution:rights.source_attribution,licenseNotice:rights.license_note,synthetic:rights.metadata?.original_synthetic===true}},
    scope,notice:scope==='fictional'?disclosure+' Saved cursor restored, unrevealed bars remain private.':
    'Restored from the private, owner-scoped historical replay session. Earlier bars must be replayed in sequence if required.'});
  }
  if(action==='start'&&request.method==='POST'){
   const code=String(body.datasetCode||'').toUpperCase();
   if(!match.test(code))throw bad('Invalid dataset identifier.');
   const datasets=await db(env,'market_datasets?select=dataset_code,title,ticker,dataset_type,status,source_attribution,license_note,metadata&dataset_code=eq.'+encodeURIComponent(code)+'&status=eq.published&limit=1');
   const source=one(datasets);
   if(!permitted(source))
      throw bad('Dataset is not available to this membership or lacks approved educational display rights.',403);
   const [first,second]=await Promise.all([fetchBar(env,code,0),fetchBar(env,code,1)]);
   if(!first||!second||Date.parse(second.timestamp)<=Date.parse(first.timestamp))throw bad('The source has no verified sequential replay bars.',503);
   // Close only this member's expired sessions for the same dataset so the
   // one-active-session constraint cannot permanently lock out older learners.
   await db(env,'gu_replay_sessions_v01492?user_id=eq.'+encodeURIComponent(auth.userId)+'&dataset_code=eq.'+encodeURIComponent(code)+'&status=eq.active&expires_at=lte.'+encodeURIComponent(new Date().toISOString()),
      'PATCH',{status:'finished',finished_at:new Date().toISOString()},'return=minimal');
   const rows=await db(env,'gu_replay_sessions_v01492','POST',
    {user_id:auth.userId,dataset_code:code},'return=representation');
   const sess=one(rows);if(!sess)throw bad('Replay session could not be created.',503);
   return out({ok:true,sessionId:sess.id,dataset:{code,title:source.title,ticker:source.ticker,
    sourceAttribution:source.source_attribution,licenseNotice:source.license_note,synthetic:source.metadata?.original_synthetic===true},
    currentIndex:0,bar:first,decisionLocked:false,scope,notice:scope==='fictional'?
      disclosure+' Lock a reasoned decision before revealing the next fictional candle.':
      'Only the first authentic historical venue observation is visible. Lock a decision before requesting any later bar. Market executions and fills remain modeled, not recorded fills.'},201);
  }
  const id=String(body.sessionId||url.searchParams.get('sessionId')||'');
  // Finalization is an idempotent, service-only PostgreSQL transaction.
  // It creates ONE immutable first-decision Journal snapshot and closes the
  // existing replay session atomically, rather than relying on two HTTP writes.
  if(action==='finish'&&scope==='historical'&&request.method==='POST'&&env.GU_REPLAY_JOURNAL_V01494_ENABLED==='true'){
   if(!uid.test(id))throw bad('Invalid session ID.');
   {
    // The finish RPC can return a previously linked record; validate
    // authentic rights for ALL plans, including MARKET_SIMULATOR,
    // without enforcing active status so idempotent retries still work.
    const owned=one(await db(env,'gu_replay_sessions_v01492?select=dataset_code&user_id=eq.'+
     encodeURIComponent(auth.userId)+'&id=eq.'+encodeURIComponent(id)+'&limit=1'));
    if(!owned)throw bad('Replay session unavailable.',404);
    const dataset=one(await db(env,'market_datasets?select=dataset_code,dataset_type,status,source_attribution,license_note,metadata&dataset_code=eq.'+
     encodeURIComponent(owned.dataset_code)+'&limit=1'));
    if(!permitted(dataset))throw bad('Historical dataset access is not approved for this training entitlement, or source rights were revoked.',403);
   }
   const linked=await db(env,'rpc/v01494_replay_finish_to_journal','POST',
    {p_session:id,p_user:auth.userId});
   if(!linked||!Number.isSafeInteger(linked.journalId)||linked.journalId<=0||
      !Number.isSafeInteger(linked.barsSeen)||linked.barsSeen<1)
     throw bad('Replay and Journal transaction did not return verified evidence.',503);
   return out({ok:true,sessionId:id,journalId:linked.journalId,barsSeen:linked.barsSeen,
    alreadyLinked:linked.alreadyLinked===true,
    notice:'Replay finished and your first-decision reasoning was recorded in the existing Trading Journal. No market fill, trade outcome, process grade or historical Lab pass was invented.'});
  }
  const s=await session(env,id,auth.userId);
  // Revocation is immediate: an already-started session cannot continue after
  // the Owner withdraws display rights, historical verification or publication.
  const rights=one(await db(env,'market_datasets?select=dataset_code,dataset_type,status,source_attribution,license_note,metadata&dataset_code=eq.'+encodeURIComponent(s.dataset_code)+'&limit=1'));
  if(!permitted(rights))throw bad('Replay dataset is no longer authorized for this membership.',403);
  if(action==='visible'&&request.method==='GET'){
   // Replay history is clipped at the member's LOCKED server cursor.
   // No client-controlled end index, dataset choice or future-derived metric.
   if(!Number.isSafeInteger(s.current_index)||s.current_index<0)throw bad('Replay cursor unavailable.',503);
   const rows=await db(env,'gu_replay_bars_v01492?select=bar_index,bar_at,open,high,low,close,volume&dataset_code=eq.'+
    encodeURIComponent(s.dataset_code)+'&bar_index=lte.'+s.current_index+
    '&order=bar_index.desc&limit=40');
   if(!Array.isArray(rows)||rows.length<1||rows.length>40||
      Number(rows[0]?.bar_index)!==s.current_index)
    throw bad('Replay visible history integrity check failed.',503);
   const bars=rows.map(fmt).reverse();
   if(bars.some((x,i)=>!Number.isSafeInteger(x.index)||x.index<0||
     x.index>s.current_index||i>0&&(x.index<=bars[i-1].index||
     Date.parse(x.timestamp)<=Date.parse(bars[i-1].timestamp))))
    throw bad('Replay visible history is not strictly ordered.',503);
   return out({ok:true,sessionId:s.id,currentIndex:s.current_index,
     decisionLocked:s.decision_locked,bars,hasEarlierBars:bars[0].index>0,
     notice:'Only already-revealed observations from this owner-scoped session are returned. The server never transmits future bars.'});
  }
  if(action==='current'&&request.method==='GET'){
   const bar=await fetchBar(env,s.dataset_code,s.current_index);
   return out({ok:true,sessionId:s.id,currentIndex:s.current_index,decisionLocked:s.decision_locked,decision:s.decision,bar});
  }
  if(action==='lock'&&request.method==='POST'){
   if(s.decision_locked||s.current_index!==0)throw bad('This session decision is already locked.',409);
   const decision=String(body.decision||''),reasoning=String(body.reasoning||'').trim(),plan=lockedPlan(body.plan);
   // An observation, WATCH or NO_TRADE can never generate a hypothetical fill.
   // Reject forged client requests even when the browser hides the order fields.
   if(decision!=='ENTER'&&plan!==null)throw bad('Only ENTER decisions may include a simulated order plan.');
   if(!['ENTER','WATCH','NO_TRADE','OBSERVE'].includes(decision)||reasoning.length<20||reasoning.length>2000)throw bad('A first decision with 20–2,000 characters of evidence is required.');
   const rows=await db(env,'gu_replay_sessions_v01492?id=eq.'+encodeURIComponent(id)+'&user_id=eq.'+encodeURIComponent(auth.userId)+'&decision_locked=eq.false&current_index=eq.0&status=eq.active&expires_at=gt.'+encodeURIComponent(new Date().toISOString()),'PATCH',
     {decision,reasoning,decision_plan:plan,decision_locked:true,locked_at:new Date().toISOString()},'return=representation');
   if(!one(rows))throw bad('Decision already locked or session changed. Refresh.',409);
   return out({ok:true,sessionId:id,decisionLocked:true,decision,notice:'Decision is immutably locked for this replay. Server-managed forward replay is now available.'});
  }
  if(action==='advance'&&request.method==='POST'){
   if(!s.decision_locked)throw bad('Lock the decision before requesting the next observation.',403);
   if(!Number.isSafeInteger(body.expectedIndex)||body.expectedIndex!==s.current_index)throw bad('Stale replay cursor. Refresh.',409);
   const value=await db(env,'rpc/v01492_replay_advance','POST',
     {p_session:id,p_user:auth.userId,p_expected_index:body.expectedIndex});
   if(!Number.isSafeInteger(value)||value<0)throw bad('No next bar or concurrent replay change. Refresh.',409);
   const bar=await fetchBar(env,s.dataset_code,value);
   if(!bar)throw bad('Replay advanced but next bar is missing; Owner repair needed.',503);
   const plan=s.decision_plan;
   let execution=null;
   if(value===1&&plan&&scope==='historical'){
    const calc=fillEstimate(plan,{open:bar.open,high:bar.high,low:bar.low,close:bar.close,volume:bar.volume});
    execution=calc;
   }
   return out({ok:true,sessionId:id,currentIndex:value,bar,execution,decisionLocked:true,
    scope,notice:scope==='fictional'?disclosure+' No fill or market result is inferred.':
    'OHLCV data can suggest execution, not prove actual queue position, partial fills, tape or intrabar order.'});
  }
  // Backward-compatible default until Owner-reviewed additive RPC is installed.
  // Existing replay sessions must remain finishable during a phased rollout.
  if(action==='finish'&&request.method==='POST'){
   if(!s.decision_locked)throw bad('A decision must be locked before finishing.',403);
   const rows=await db(env,'gu_replay_sessions_v01492?id=eq.'+encodeURIComponent(id)+
    '&user_id=eq.'+encodeURIComponent(auth.userId)+'&status=eq.active&current_index=eq.'+
    s.current_index,'PATCH',{status:'finished',finished_at:new Date().toISOString()},
    'return=representation');
   if(!one(rows))throw bad('Replay changed; refresh and retry.',409);
   return out({ok:true,sessionId:id,barsSeen:s.current_index+1,
    journalLinked:false,
    scope,notice:scope==='fictional'?disclosure+' Practice finished; no Journal record or mastery was awarded.':
    'Replay finished. Automatic Journal capture is not enabled until the private transaction is installed and verified. No score or trade outcome was awarded.'});
  }
  throw bad('Unsupported action.',404);
 }catch(e){const code=[400,401,403,404,405,409,413].includes(e.status)?e.status:503;
  return out({ok:false,error:code===503?'Replay backend or required schema unavailable.':e.message||'Replay unavailable.'},code);}
}
