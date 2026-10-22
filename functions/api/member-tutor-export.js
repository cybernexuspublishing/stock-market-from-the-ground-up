/* D09 v0.14.0.149: privacy portability of the learner's own saved notes.
 * GET is authorized by real Supabase user identity, NOT an active paid Tutor
 * entitlement. Expired subscribers keep access to their prior private data.
 * No other account rows, model calls, rubric, portfolio or payment content.
 */
const H={'content-type':'application/json; charset=utf-8','cache-control':'private, no-store','vary':'Authorization',
 'x-content-type-options':'nosniff','x-robots-tag':'noindex'};
const json=(v,status=200)=>new Response(JSON.stringify(v),{status,headers:H});
const UID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function cfg(env){
 const base=String(env.SUPABASE_URL||'').replace(/\/$/,'');
 const pub=String(env.SUPABASE_PUBLISHABLE_KEY||''),secret=String(env.SUPABASE_SECRET_KEY||'');
 if(!/^https:\/\/[^/]+$/.test(base)||!pub||!secret)throw Error('Private export unavailable');
 const h={apikey:secret,accept:'application/json'};
 if(/^eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(secret))h.authorization='Bearer '+secret;
 return {base,pub,h};
}
async function read(c,path){
 const r=await fetch(c.base+'/rest/v1/'+path,{headers:c.h,cache:'no-store'});
 if(!r.ok)throw Error('Private Tutor export storage unavailable');
 const data=await r.json().catch(()=>null);
 if(!Array.isArray(data))throw Error('Invalid private Tutor export');
 return data;
}
export async function onRequest({request,env}){
 try{
  if(request.method!=='GET')return json({ok:false,error:'GET required.'},405);
  const token=/^Bearer\s+(\S+)$/i.exec(request.headers.get('authorization')||'')?.[1];
  if(!token)return json({ok:false,error:'Sign in to export your own notes.'},401);
  const c=cfg(env);
  const auth=await fetch(c.base+'/auth/v1/user',{cache:'no-store',
   headers:{apikey:c.pub,authorization:'Bearer '+token}});
  if(!auth.ok)return json({ok:false,error:'Your member session has expired.'},401);
  const user=await auth.json().catch(()=>null);
  if(!UID.test(user?.id||''))return json({ok:false,error:'Invalid member identity.'},401);
  const member=encodeURIComponent(user.id);
  const profiles=await read(c,'profiles?select=account_kind&id=eq.'+member+'&limit=1');
  if(profiles[0]?.account_kind!=='member')return json({ok:false,error:'This account has no eligible private member notes.'},403);
  const items=await read(c,'gu_member_tutor_exchanges_v014102?select=id,question,learner_answer,mode,answer,generation,source_titles,created_at'+
   '&user_id=eq.'+member+'&order=created_at.asc&limit=200');
  if(items.length>200)throw Error('Unbounded private Tutor export');
  // Conversations were added in an Owner-reviewed optional migration. Absence
  // of the new table must NOT prevent portability of existing saved exchanges.
  let conversations=[],conversationStorageAvailable=false;
  try{
   conversations=await read(c,'gu_tutor_conversations_v014149?select=id,title,created_at,updated_at'+
    '&user_id=eq.'+member+'&order=created_at.asc&limit=30');
   conversationStorageAvailable=true;
  }catch{/* Only v102 notes are necessary for basic portability. */}
  return json({ok:true,schema:'groundup-private-tutor-export-v1',graded:false,masteryAwarded:false,
   exportedAtUtc:new Date().toISOString(),savedExchanges:items,conversations,
   conversationStorageAvailable,
   notice:'Your private ungraded Tutor notes. An active Tutor subscription was not required to export them. No assessment scores, private rubrics or real trading orders are represented.'});
 }catch{
  return json({ok:false,error:'Private Tutor export is temporarily unavailable or not installed.'},503);
 }
}
