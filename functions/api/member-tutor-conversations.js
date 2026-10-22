/* D09 v0.14.0.149 — server-authoritative member Tutor conversation CRUD.
 * Owner-reviewed additive SQL prerequisite; graceful 503 if uninstalled.
 * Existing v102 ungrouped private exchanges remain available separately.
 */
import {toolAccess} from './member-tool-access.js';
const H={'content-type':'application/json; charset=utf-8','cache-control':'private, no-store','x-content-type-options':'nosniff'};
const reply=(v,status=200)=>new Response(JSON.stringify(v),{status,headers:H});
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function configuration(env){
 const url=String(env.SUPABASE_URL||'').replace(/\/$/,'');
 const key=String(env.SUPABASE_SECRET_KEY||'');
 if(!/^https:\/\/[^/]+$/.test(url)||!key)throw Error('Private storage unavailable');
 const h={apikey:key,accept:'application/json','content-type':'application/json'};
 if(/^eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(key))h.authorization='Bearer '+key;
 return {url,h};
}
async function storage(env,path,init={}){
 const {url,h}=configuration(env);
 const r=await fetch(url+'/rest/v1/'+path,{method:'GET',cache:'no-store',...init,headers:{...h,...(init.headers||{})}});
 if(!r.ok)throw Error('Conversation storage is not installed, not authorized, or unavailable');
 const raw=await r.text();return raw?JSON.parse(raw):null;
}
async function bodyOf(request){
 const count=Number(request.headers.get('content-length')||0);
 if(!Number.isSafeInteger(count)||count<0||count>1200)throw Object.assign(Error('Request too large'),{status:413});
 const raw=await request.text();
 if(new TextEncoder().encode(raw).length>1200)throw Object.assign(Error('Request too large'),{status:413});
 try{const body=JSON.parse(raw);if(!body||typeof body!=='object'||Array.isArray(body))throw Error();return body}
 catch{throw Object.assign(Error('Invalid request body'),{status:400})}
}
const cleanTitle=x=>typeof x==='string'?x.trim():'';
export async function onRequest({request,env}){
 try{
  if(!['GET','POST','PATCH','DELETE'].includes(request.method))return reply({ok:false,error:'Method not allowed.'},405);
  const auth=await toolAccess(env,request,'MARKET_TUTOR');
  if(!auth.authorized||!UUID.test(auth.userId))return reply({ok:false,error:'Market Tutor member entitlement required.'},403);
  const url=new URL(request.url),member=encodeURIComponent(auth.userId);
  if(request.method!=='GET'){
   const origin=request.headers.get('origin'),site=request.headers.get('sec-fetch-site');
   if(origin&&origin!==url.origin || site&&!['same-origin','none'].includes(site))
    return reply({ok:false,error:'Cross-site mutation refused.'},403);
   if(!/^application\/json(?:\s*;|\s*$)/i.test(request.headers.get('content-type')||''))
    return reply({ok:false,error:'JSON required.'},415);
  }
  const table='gu_tutor_conversations_v014149';
  if(request.method==='GET'){
   const conversationId=url.searchParams.get('conversationId');
   if(conversationId!==null){
    if(!UUID.test(conversationId))return reply({ok:false,error:'Invalid conversation ID.'},400);
    const owned=await storage(env,table+'?select=id,title&id=eq.'+encodeURIComponent(conversationId)+
     '&user_id=eq.'+member+'&limit=1');
    if(!Array.isArray(owned)||owned.length!==1)return reply({ok:false,error:'Conversation not found.'},404);
    const rows=await storage(env,'gu_member_tutor_exchanges_v014102?select=id,question,learner_answer,mode,answer,generation,source_titles,created_at'+
     '&user_id=eq.'+member+'&conversation_id=eq.'+encodeURIComponent(conversationId)+
     '&order=created_at.asc&limit=200');
    if(!Array.isArray(rows))throw Error('Invalid history response');
    return reply({ok:true,conversation:owned[0],history:rows,limit:200,graded:false,masteryAwarded:false});
   }
   const items=await storage(env,table+'?select=id,title,created_at,updated_at&user_id=eq.'+member+
    '&order=updated_at.desc&limit=30');
   if(!Array.isArray(items))throw Error('Invalid list response');
   return reply({ok:true,conversations:items,limit:30,graded:false,masteryAwarded:false});
  }
  if(request.method==='POST'){
   const body=await bodyOf(request);
   const title=cleanTitle(body.title||'New conversation'),reqId=String(body.requestId||'');
   if(title.length<3||title.length>90||!UUID.test(reqId))return reply({ok:false,error:'Invalid title or request ID.'},400);
   const id=await storage(env,'rpc/gu_v014149_create_tutor_conversation',{
    method:'POST',body:JSON.stringify({p_user:auth.userId,p_request:reqId,p_title:title})});
   if(!UUID.test(id))throw Error('Creation was not confirmed');
   return reply({ok:true,id,title,graded:false,masteryAwarded:false},201);
  }
  if(request.method==='PATCH'){
   const body=await bodyOf(request),id=String(body.id||''),title=cleanTitle(body.title);
   if(!UUID.test(id)||title.length<3||title.length>90)return reply({ok:false,error:'Invalid conversation update.'},400);
   const items=await storage(env,table+'?user_id=eq.'+member+'&id=eq.'+encodeURIComponent(id),{
    method:'PATCH',headers:{prefer:'return=representation'},body:JSON.stringify({title,updated_at:new Date().toISOString()})});
   if(!Array.isArray(items)||items.length!==1)return reply({ok:false,error:'Conversation not found.'},404);
   return reply({ok:true,conversation:{id,title},graded:false,masteryAwarded:false});
  }
  const body=await bodyOf(request),id=String(body.id||'');
  if(!UUID.test(id)||body.confirm!=='DELETE_CONVERSATION')
   return reply({ok:false,error:'Explicit deletion confirmation required.'},400);
  const deleted=await storage(env,'rpc/gu_v014149_delete_tutor_conversation',{
   method:'POST',body:JSON.stringify({p_user:auth.userId,p_conversation:id})});
  return deleted===true?reply({ok:true,deleted:true}):reply({ok:false,error:'Conversation not found.'},404);
 }catch(e){
  if([400,401,403,413,415].includes(e.status))return reply({ok:false,error:e.status===401?'Sign in required.':e.message},e.status);
  return reply({ok:false,error:'Private conversation storage is not installed or temporarily unavailable.'},503);
 }
}
