/* v0.14.0.92 | Server-owned, durable, forward-only educational OHLCV replay.
 * Requires Owner-reviewed private SQL and separately licensed/published historical
 * OHLCV bars. No datasets are seeded. No tick or brokerage fills are claimed.
 */
import {toolAccess} from './member-tool-access.js';
import {fillEstimate,bracketOutcome} from '../_lib/replay-engine-v01492.js';
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
 if(!bar.bar_at||numbers.high<Math.max(numbers.open,numbers.close)||numbers.low>Math.min(numbers.open,numbers.close)||numbers.low<=0||numbers.volume<0)throw bad('Historical bar failed price integrity validation.',503);
 return {index:bar.bar_index,timestamp:bar.bar_at,...numbers};
}
function publicDataset(source){return source&&source.status==='published'&&source.dataset_type==='ohlcv'&&source.metadata?.licensed_for_member_display===true&&source.metadata?.evidence_verified===true&&typeof source.source_attribution==='string'&&source.source_attribution.trim().length>0&&typeof source.license_note==='string'&&source.license_note.trim().length>0&&typeof source.metadata?.corporate_action_policy==='string'&&source.metadata.corporate_action_policy.trim().length>0}
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
  const auth=await toolAccess(env,request,'MARKET_SIMULATOR');
  if(!auth.authorized)throw bad('Active Market Simulator or Full Platform access required.',403);
  const url=new URL(request.url),action=String(url.searchParams.get('action')||'current');
  const body=request.method==='POST'?await bodyOf(request):{};
  if(action==='catalog'&&request.method==='GET'){
   const rows=await db(env,'market_datasets?select=dataset_code,title,ticker,dataset_type,status,source_attribution,license_note,metadata&status=eq.published&dataset_type=eq.ohlcv&order=dataset_code.asc&limit=700');
   if(!Array.isArray(rows))throw bad('Dataset catalog is unavailable.',503);
   return out({ok:true,datasets:rows.filter(publicDataset).map(x=>({code:x.dataset_code,title:x.title,ticker:x.ticker,sourceAttribution:x.source_attribution,licenseNotice:x.license_note,synthetic:x.metadata?.original_synthetic===true})),notice:'This list includes clearly marked ORIGINAL fictional simulations and, separately, any authorized independently verified historical datasets. Only the currently visible server-owned observation is returned.'});
  }
  if(action==='resume'&&request.method==='GET'){
   // Durable sessions are discovered by authenticated user identity, not a
   // browser-stored sessionId. Return exactly the current visible observation.
   const active=await db(env,'gu_replay_sessions_v01492?select=id,dataset_code,current_index,decision_locked,decision,status,expires_at&user_id=eq.'+
    encodeURIComponent(auth.userId)+'&status=eq.active&expires_at=gt.'+encodeURIComponent(new Date().toISOString())+
    '&order=created_at.desc&limit=1');
   const selected=one(active);
   if(!selected)return out({ok:true,session:null,notice:'No current replay session. Choose a licensed dataset.'});
   const rights=one(await db(env,'market_datasets?select=dataset_code,title,ticker,dataset_type,status,source_attribution,license_note,metadata&dataset_code=eq.'+
    encodeURIComponent(selected.dataset_code)+'&limit=1'));
   if(!publicDataset(rights))throw bad('Previously selected data rights or verification have been withdrawn.',403);
   const bar=await fetchBar(env,selected.dataset_code,selected.current_index);
   if(!bar)throw bad('The current replay observation is unavailable.',503);
   return out({ok:true,session:{id:selected.id,currentIndex:selected.current_index,decisionLocked:selected.decision_locked,
    decision:selected.decision,bar,dataset:{code:rights.dataset_code,title:rights.title,ticker:rights.ticker,
    sourceAttribution:rights.source_attribution,licenseNotice:rights.license_note,synthetic:rights.metadata?.original_synthetic===true}},
    notice:'Restored from the private, owner-scoped replay session. Earlier bars must be replayed in sequence if required.'});
  }
  if(action==='start'&&request.method==='POST'){
   const code=String(body.datasetCode||'').toUpperCase();
   if(!match.test(code))throw bad('Invalid dataset identifier.');
   const datasets=await db(env,'market_datasets?select=dataset_code,title,ticker,dataset_type,status,source_attribution,license_note,metadata&dataset_code=eq.'+encodeURIComponent(code)+'&status=eq.published&limit=1');
   const source=one(datasets);
   if(!publicDataset(source))
      throw bad('Dataset is not published with independently reviewed educational display rights.',403);
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
    currentIndex:0,bar:first,decisionLocked:false,notice:source.metadata?.original_synthetic===true?'ORIGINAL FICTIONAL simulation. Not an actual ticker, date, trade, source feed, or historical chart. Only the first made-up observation is visible. Lock a decision to reveal more.':'Only the first historical observation is visible. Lock a decision before requesting any later bar.'},201);
  }
  const id=String(body.sessionId||url.searchParams.get('sessionId')||'');
  // Finalization is an idempotent, service-only PostgreSQL transaction.
  // It creates ONE immutable first-decision Journal snapshot and closes the
  // existing replay session atomically, rather than relying on two HTTP writes.
  if(action==='finish'&&request.method==='POST'&&env.GU_REPLAY_JOURNAL_V01494_ENABLED==='true'){
   if(!uid.test(id))throw bad('Invalid session ID.');
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
  if(!publicDataset(rights))throw bad('Historical data publication or usage authorization has been withdrawn.',403);
  if(action==='current'&&request.method==='GET'){
   const bar=await fetchBar(env,s.dataset_code,s.current_index);
   return out({ok:true,sessionId:s.id,currentIndex:s.current_index,decisionLocked:s.decision_locked,decision:s.decision,bar});
  }
  if(action==='lock'&&request.method==='POST'){
   if(s.decision_locked||s.current_index!==0)throw bad('This session decision is already locked.',409);
   const decision=String(body.decision||''),reasoning=String(body.reasoning||'').trim(),plan=lockedPlan(body.plan);
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
   if(value===1&&plan){
    const calc=fillEstimate(plan,{open:bar.open,high:bar.high,low:bar.low,close:bar.close,volume:bar.volume});
    execution=calc;
   }
   return out({ok:true,sessionId:id,currentIndex:value,bar,execution,decisionLocked:true,
    notice:'OHLCV data can suggest execution, not prove actual queue position, partial fills, tape or intrabar order.'});
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
    notice:'Replay finished. Automatic Journal capture is not enabled until the private transaction is installed and verified. No score or trade outcome was awarded.'});
  }
  throw bad('Unsupported action.',404);
 }catch(e){const code=[400,401,403,404,405,409,413].includes(e.status)?e.status:503;
  return out({ok:false,error:code===503?'Replay backend or required schema unavailable.':e.message||'Replay unavailable.'},code);}
}
