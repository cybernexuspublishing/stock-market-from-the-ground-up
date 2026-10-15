/* v0.14.0.20 — authenticated member notification preferences.
 * Uses caller's JWT and PostgreSQL RLS/RPC authority. NEVER uses the service-role key.
 */
const HEADERS={
 'content-type':'application/json; charset=utf-8',
 'cache-control':'private, no-store, max-age=0',
 'vary':'Authorization',
 'x-content-type-options':'nosniff'
};
const reply=(payload,status=200)=>new Response(JSON.stringify(payload),{status,headers:HEADERS});
async function handler({request,env}){
 const method=request.method;
 if(!['GET','POST'].includes(method))return reply({ok:false,error:'Method not allowed.'},405);
 const token=/^Bearer\s+([^\s]+)$/i.exec(request.headers.get('authorization')||'')?.[1];
 if(!token)return reply({ok:false,error:'Sign in to manage notification preferences.'},401);
 const url=String(env.SUPABASE_URL||'').replace(/\/+$/,''),pub=String(env.SUPABASE_PUBLISHABLE_KEY||'');
 if(!/^https:\/\/[^/]+/.test(url)||!pub)return reply({ok:false,error:'Notification preferences unavailable.'},503);
 let body;
 if(method==='POST'){
   if(Number(request.headers.get('content-length')||0)>1024)return reply({ok:false,error:'Request too large.'},413);
   body=await request.json().catch(()=>null);
   if(!body||Array.isArray(body)||typeof body!=='object'||
      Object.keys(body).length!==1||typeof body.subscribedRepliesEnabled!=='boolean')
     return reply({ok:false,error:'Expected subscribedRepliesEnabled as a boolean.'},400);
 }
 const headers={apikey:pub,authorization:'Bearer '+token,accept:'application/json','content-type':'application/json'};
 try{
   const u=await fetch(url+'/auth/v1/user',{headers,cache:'no-store'});
   if(!u.ok)return reply({ok:false,error:'Session expired.'},401);
   const who=await u.json().catch(()=>({}));if(!who?.id)return reply({ok:false,error:'Session expired.'},401);
   const rpc=method==='GET'?'gu_commons_notice_pref_get_v01420':'gu_commons_notice_pref_save_v01420';
   const r=await fetch(url+'/rest/v1/rpc/'+rpc,{
     method:'POST',headers,cache:'no-store',
     body:JSON.stringify(method==='GET'?{}:{p_subscribed_replies_enabled:body.subscribedRepliesEnabled})
   });
   if(!r.ok)return reply({ok:false,error:r.status===403?'Member permission denied.':'Notification database contract unavailable.'},r.status===403?403:503);
   const result=await r.json().catch(()=>null);
   if(!result||typeof result!=='object'||typeof result.subscribed_replies_enabled!=='boolean')
     return reply({ok:false,error:'Unexpected notification preference response.'},503);
   return reply({ok:true,preferences:{subscribedRepliesEnabled:result.subscribed_replies_enabled},updatedAt:result.updated_at||null});
 }catch{return reply({ok:false,error:'Notification preference service unavailable.'},503)}
}
export function onRequest(ctx){return handler(ctx)}
