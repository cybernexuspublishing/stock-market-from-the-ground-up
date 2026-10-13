/* Public configuration exposes ONLY Turnstile sitekey, never secret. */
const j=(v,status=200)=>new Response(JSON.stringify(v),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});
export async function onRequest({request,env}){
 if(request.method!=='GET')return j({ok:false,error:'Method not allowed.'},405);
 if(env.ENFORCE_AUTH_TURNSTILE_V135!=='true')return j({ok:true,enabled:false,sitekey:null});
 if(!env.TURNSTILE_SITE_KEY||!env.TURNSTILE_SECRET_KEY)return j({ok:false,error:'Turnstile is enabled but not fully configured.'},503);
 return j({ok:true,enabled:true,sitekey:env.TURNSTILE_SITE_KEY});
}
