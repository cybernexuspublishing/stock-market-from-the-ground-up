/* D09 v0.14.0.149: service-only private conversation management.
 * Client never supplies an authoritative user ID. No private answer keys.
 */
import {toolAccess} from './member-tool-access.js';
const H={'content-type':'application/json; charset=utf-8','cache-control':'private, no-store','x-content-type-options':'nosniff'};
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:H});
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const name='gu_member_tutor_conversations_v014149';
function config(env){
 const base=String(env.SUPABASE_URL||'').replace(/\/$/,''),
 key=String(env.SUPABASE_SECRET_KEY||'');
 if(!/^https:\/\/[^/]+$/.test(base)||!key)throw Error('Tutor storage not configured');
 const headers={apikey:key,accept:'application/json','content-type':'application/json'};
 if(/^eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(key))headers.authorization='Bearer '+key;
 return {base,headers};
}
export async function conversationRest(env,path,init={}){
 const {base,headers}=config(env);
 const r=await fetch(base+'/rest/v1/'+path,{cache:'no-store',...init,headers:{...headers,...(init.headers||{})}});
 if(!r.ok)return {ok:false,status:r.status};
 const data=await r.json().catch(()=>null);
 return {ok:true,data};
}
export async function ownedConversation(env,userId,id){
 if(!UUID.test(userId)||!UUID.test(id))return false;
 const r=await conversationRest(env,name+'?select=id&user_id=eq.'+encodeURIComponent(userId)+
  '&id=eq.'+encodeURIComponent(id)+'&limit=1');
 return r.ok&&Array.isArray(r.data)&&r.data.length===1;
}
export async function attachTutorExchange(env,userId,exchangeId,conversationId){
 if(!UUID.test(userId)||!UUID.test(exchangeId)||!UUID.test(conversationId))return false;
 if(!await ownedConversation(env,userId,conversationId))return false;
 const patch=await conversationRest(env,
  'gu_member_tutor_exchanges_v014102?user_id=eq.'+encodeURIComponent(userId)+
  '&id=eq.'+encodeURIComponent(exchangeId),{
   method:'PATCH',headers:{prefer:'return=representation'},
   body:JSON.stringify({conversation_id:conversationId})});
 return patch.ok&&Array.isArray(patch.data)&&patch.data.length===1&&
  patch.data[0].conversation_id===conversationId;
}
export async function onRequest({request,env}){
 try{
  if(!['GET','POST','PATCH','DELETE'].includes(request.method))return json({ok:false,error:'Method not allowed.'},405);
  const auth=await toolAccess(env,request,'MARKET_TUTOR');
  if(!auth.authorized||!UUID.test(auth.userId))return json({ok:false,error:'Market Tutor entitlement required.'},403);
  const url=new URL(request.url);
  if(request.method!=='GET'){
   const origin=request.headers.get('origin'),site=request.headers.get('sec-fetch-site');
   if(origin&&origin!==url.origin||site&&!['same-origin','none'].includes(site))
    return json({ok:false,error:'Cross-site mutation denied.'},403);
  }
  const uid=encodeURIComponent(auth.userId);
  if(request.method==='GET'){
   const r=await conversationRest(env,name+'?select=id,title,created_at,updated_at&user_id=eq.'+
    uid+'&order=updated_at.desc,id.desc&limit=30');
   if(!r.ok||!Array.isArray(r.data))throw Error('unavailable');
   return json({ok:true,conversations:r.data,maximum:30});
  }
  let body={};
  if(request.method==='POST'||request.method==='PATCH'){
   if(!/^application\/json(?:;|$)/i.test(request.headers.get('content-type')||''))return json({ok:false,error:'JSON required.'},415);
   const raw=await request.text();
   if(new TextEncoder().encode(raw).length>1024)return json({ok:false,error:'Request too large.'},413);
   try{body=JSON.parse(raw)}catch{return json({ok:false,error:'Invalid JSON.'},400)}
   if(!body||typeof body.title!=='string'||body.title.trim().length<1||body.title.trim().length>80)
    return json({ok:false,error:'Conversation title must be 1–80 characters.'},400);
   body.title=body.title.trim().replace(/[\u0000-\u001f\u007f]/g,' ');
  }
  if(request.method==='POST'){
   const r=await conversationRest(env,'rpc/gu_v014149_create_tutor_conversation',{
    method:'POST',body:JSON.stringify({p_user:auth.userId,p_title:body.title})});
   if(!r.ok||!UUID.test(String(r.data||'')))return json({ok:false,error:'Conversation storage unavailable or the 30 conversation limit was reached.'},503);
   return json({ok:true,id:r.data,title:body.title},201);
  }
  const id=url.searchParams.get('id')||'';
  if(!UUID.test(id))return json({ok:false,error:'Valid conversation ID required.'},400);
  if(!await ownedConversation(env,auth.userId,id))return json({ok:false,error:'Conversation unavailable.'},404);
  if(request.method==='PATCH'){
   const r=await conversationRest(env,name+'?user_id=eq.'+uid+'&id=eq.'+encodeURIComponent(id),{
    method:'PATCH',headers:{prefer:'return=representation'},
    body:JSON.stringify({title:body.title,updated_at:new Date().toISOString()})});
   if(!r.ok||!Array.isArray(r.data)||r.data.length!==1)throw Error('rename failed');
   return json({ok:true,id,title:body.title});
  }
  if(request.headers.get('x-confirm-delete')!=='DELETE_TUTOR_CONVERSATION')
   return json({ok:false,error:'Explicit deletion confirmation required.'},400);
  const r=await conversationRest(env,name+'?user_id=eq.'+uid+'&id=eq.'+encodeURIComponent(id),{
   method:'DELETE',headers:{prefer:'return=representation'}});
  if(!r.ok||!Array.isArray(r.data)||r.data.length!==1)throw Error('delete failed');
  return json({ok:true,deleted:true,notice:'Saved exchanges were retained and moved to Unfiled.'});
 }catch{
  return json({ok:false,error:'Conversation storage is unavailable; source-only Tutor remains usable.'},503);
 }
}
