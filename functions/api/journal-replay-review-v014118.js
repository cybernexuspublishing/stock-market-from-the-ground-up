/* v0.14.0.118 — Owner-scoped server review for already linked replay decisions.
 * Stores pre-reveal text BEFORE permitting outcome comparisons. No grades,
 * performance results or competency evidence can be created from this route.
 */
import {toolAccess} from './member-tool-access.js';
const H={'content-type':'application/json; charset=utf-8',
 'cache-control':'private, no-store, max-age=0','vary':'Authorization','x-content-type-options':'nosniff'};
const reply=(x,status=200)=>new Response(JSON.stringify(x),{status,headers:H});
const fail=(message,status=400)=>Object.assign(new Error(message),{status});
function cfg(env){
 const base=String(env.SUPABASE_URL||'').replace(/\/$/,'');
 const secret=String(env.SUPABASE_SECRET_KEY||'');
 if(!/^https:\/\/[^/]+$/.test(base)||!secret)throw fail('Replay review service unavailable.',503);
 const headers={apikey:secret,accept:'application/json'};
 if(/^eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(secret))
  headers.authorization='Bearer '+secret;
 return{base,headers};
}
async function db(env,path,method='GET',body){
 const {base,headers}=cfg(env);
 const r=await fetch(base+'/rest/v1/'+path,{method,cache:'no-store',
  headers:{...headers,...(body!==undefined?{'content-type':'application/json'}:{})},
  body:body===undefined?undefined:JSON.stringify(body)});
 if(!r.ok)throw fail('Replay review database function is unavailable or declined the request.',r.status===400?409:503);
 try{return await r.json()}catch{throw fail('Replay review database response invalid.',503)}
}
function sameOrigin(request){
 const origin=request.headers.get('origin');
 if(origin&&origin!==new URL(request.url).origin)throw fail('Cross-origin reviews are not permitted.',403);
}
async function parse(request){
 if(Number(request.headers.get('content-length')||0)>4096)throw fail('Review request too large.',413);
 const raw=await request.text();
 if(new TextEncoder().encode(raw).length>4096)throw fail('Review request too large.',413);
 let body;try{body=JSON.parse(raw)}catch{throw fail('Invalid review JSON.')}
 if(!body||Array.isArray(body)||typeof body!=='object')throw fail('Invalid review request.');
 if(!Number.isSafeInteger(body.reviewId)||body.reviewId<1||
   (body.note!==undefined&&typeof body.note!=='string')||
   (body.note!==undefined&&body.note.length>3000))
   throw fail('A valid review ID and optional bounded note are required.');
 return body;
}
export async function onRequest({request,env}){
 try{
  if(!['GET','POST'].includes(request.method))throw fail('Method not allowed.',405);
  const simulator=await toolAccess(env,request,'MARKET_SIMULATOR');
  const training=simulator.authorized?simulator:await toolAccess(env,request,'ONDEMAND_TRAINING');
  // Existing Journal & Analytics subscribers may review their OWN previously
  // linked replay decisions even if Replay-only rights have since expired.
  // This endpoint never serves future OHLC bars or permits a new replay.
  const access=training.authorized?training:await toolAccess(env,request,'JOURNAL_ANALYTICS');
  if(!access.authorized)throw fail('Active replay training or Journal review entitlement is required.',403);
  const url=new URL(request.url),action=url.searchParams.get('action')||'access';
  if(request.method==='GET'&&action==='access')
   return reply({ok:true,authorized:true,replayReviews:true,
    grading:'none',evidence:'locked-first-decision-and-reflection-only'});
  if(request.method==='GET'&&action==='states'){
   const rows=await db(env,'gu_replay_review_locks_v014118?select=review_id,journal_id,pre_reveal_note,locked_at,revealed_at,completed_at&user_id=eq.'+
    encodeURIComponent(access.userId)+'&order=review_id.desc&limit=1001');
   if(!Array.isArray(rows))throw fail('Replay review state unavailable.',503);
   return reply({ok:true,states:rows.slice(0,1000).map(x=>({
    reviewId:Number(x.review_id),journalId:Number(x.journal_id),preRevealNote:x.pre_reveal_note,
    lockedAt:x.locked_at,revealedAt:x.revealed_at,completedAt:x.completed_at
   })),truncated:rows.length>1000});
  }
  if(request.method==='GET'&&action==='evidence'){
   // One service-only PostgreSQL transaction closes the rights/revocation
   // TOCTOU window between separately fetched review, source and market bars.
   const id=Number(url.searchParams.get('reviewId'));
   if(!Number.isSafeInteger(id)||id<1)throw fail('Valid review ID required.',400);
   const result=await db(env,'rpc/gu_v014120_replay_review_evidence','POST',{
    p_actor:access.userId,p_review:id
   });
   if(!result||result.ok!==true||result.reviewId!==id||
      !Number.isSafeInteger(result.observedThroughIndex)||result.observedThroughIndex<0||
      !Array.isArray(result.observations)||result.observations.length<1||
      result.observations.length>40||typeof result.originalSynthetic!=='boolean'||
      typeof result.sourceAttribution!=='string'||typeof result.sessionId!=='string')
    throw fail('Replay evidence contract integrity failed.',503);
   for(let i=0;i<result.observations.length;i++){
    const bar=result.observations[i],prev=result.observations[i-1];
    if(!Number.isSafeInteger(bar.index)||bar.index<0||bar.index>result.observedThroughIndex||
       !Number.isFinite(Date.parse(bar.timestamp))||
       !['open','high','low','close','volume'].every(k=>typeof bar[k]==='number'&&Number.isFinite(bar[k]))||
       ['open','high','low','close'].some(k=>bar[k]<=0)||bar.volume<0||
       bar.high<Math.max(bar.open,bar.close)||bar.low>Math.min(bar.open,bar.close)||
       bar.high<bar.low||i>0&&(bar.index!==prev.index+1||
          Date.parse(bar.timestamp)<=Date.parse(prev.timestamp)))
      throw fail('Replay evidence response failed integrity validation.',503);
   }
   if(result.observations.at(-1).index!==result.observedThroughIndex||
      result.hasEarlierBars!==(result.observations[0].index>0))
    throw fail('Replay evidence cursor mismatched observed bars.',503);
   return reply({ok:true,reviewId:id,sessionId:result.sessionId,
    observedThroughIndex:result.observedThroughIndex,
    observations:result.observations,hasEarlierBars:result.hasEarlierBars,
    originalSynthetic:result.originalSynthetic,
    sourceAttribution:result.sourceAttribution.slice(0,300),
    notice:'Only server-recorded observations already seen in this completed replay are presented. No future candle, fill, trading profit or competency score is disclosed.'});
  }
  if(request.method==='POST'&&['lock','reveal','complete'].includes(action)){
   sameOrigin(request);
   const b=await parse(request);
   if(['lock','complete'].includes(action)&&String(b.note||'').trim().length<20)
    throw fail('Enter at least 20 characters before saving this review.');
   const result=await db(env,'rpc/gu_v014118_review_transaction','POST',{
    p_actor:access.userId,p_review:b.reviewId,p_action:action,p_note:b.note||null
   });
   if(!result||result.ok!==true)throw fail('Replay review transaction not confirmed.',503);
   return reply({...result,reviewId:b.reviewId,graded:false});
  }
  throw fail('Unknown review action.',404);
 }catch(e){return reply({ok:false,error:[400,401,403,404,405,409,413].includes(e.status)?
  e.message:'Replay review service unavailable.'},
  [400,401,403,404,405,409,413].includes(e.status)?e.status:503)}
}
