/* v0.14.0.21 — caller-bound, idempotent Market Commons subscriptions.
 * Database RPC is the authorization boundary; never use the service-role key here.
 * Deliberately limited to ungated discussion notifications in v0.14.0.20.
 */
const HEADERS={'content-type':'application/json; charset=utf-8','cache-control':'private, no-store, max-age=0','vary':'Authorization','x-content-type-options':'nosniff'};
const respond=(payload,status=200)=>new Response(JSON.stringify(payload),{status,headers:HEADERS});
const decode=async request=>{
 const raw=await request.text();
 if(raw.length>512)throw Object.assign(Error('Request too large.'),{status:413});
 try{return JSON.parse(raw)}catch{throw Object.assign(Error('Invalid JSON.'),{status:400})}
};
export async function onRequest({request,env}){
 if(!['GET','POST'].includes(request.method))return respond({ok:false,error:'Method not allowed.'},405);
 const route=new URL(request.url),id=Number(route.searchParams.get('topicId'));
 if(!Number.isSafeInteger(id)||id<=0||id>9223372036854775807||!/^\d+$/.test(route.searchParams.get('topicId')||''))
   return respond({ok:false,error:'A valid discussion identifier is required.'},400);
 const token=/^Bearer\s+([^\s]+)$/i.exec(request.headers.get('authorization')||'')?.[1];
 if(!token)return respond({ok:false,error:'Sign in to manage discussion subscriptions.'},401);
 const base=String(env.SUPABASE_URL||'').replace(/\/+$/,''),pub=String(env.SUPABASE_PUBLISHABLE_KEY||'');
 if(!/^https:\/\/[^/]+/.test(base)||!pub)return respond({ok:false,error:'Subscription service unavailable.'},503);
 let input=null;
 if(request.method==='POST'){
   if(Number(request.headers.get('content-length')||0)>512)return respond({ok:false,error:'Request too large.'},413);
   try{input=await decode(request)}catch(e){return respond({ok:false,error:e.message},e.status||400)}
   if(!input||Array.isArray(input)||typeof input!=='object'||Object.keys(input).length!==1||typeof input.subscribe!=='boolean')
     return respond({ok:false,error:'Expected a single boolean subscribe field.'},400);
 }
 const headers={apikey:pub,authorization:'Bearer '+token,accept:'application/json','content-type':'application/json'};
 try{
   const u=await fetch(base+'/auth/v1/user',{headers,cache:'no-store'});
   if(!u.ok)return respond({ok:false,error:'Session expired. Sign in again.'},401);
   const identity=await u.json().catch(()=>null);
   if(!identity?.id)return respond({ok:false,error:'Session expired. Sign in again.'},401);
   const rpc=request.method==='GET'?'gu_commons_subscription_get_v01421':'gu_commons_subscription_set_v01421';
   const payload=request.method==='GET'?{p_topic_id:id}:{p_topic_id:id,p_subscribe:input.subscribe};
   const r=await fetch(base+'/rest/v1/rpc/'+rpc,{method:'POST',headers,body:JSON.stringify(payload),cache:'no-store'});
   if(!r.ok){
     const badPermission=r.status===401||r.status===403;
     return respond({ok:false,error:badPermission?'Discussion subscription not permitted.':'Discussion subscriptions are not available; check the reviewed v0.14.0.21 database migration.'},badPermission?403:r.status===400?400:503);
   }
   const result=await r.json().catch(()=>null);
   if(!result||typeof result!=='object'||typeof result.available!=='boolean'||typeof result.subscribed!=='boolean')
     return respond({ok:false,error:'Unexpected subscription response.'},503);
   return respond({ok:true,available:result.available,subscribed:result.subscribed,delivery:'in_app_only',notificationPreferencesUrl:'/dashboard.html?tab=settings'});
 }catch{
   return respond({ok:false,error:'Discussion subscription service temporarily unavailable.'},503);
 }
}
