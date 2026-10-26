/* Signed ebook access for paid website orders only. Never expose service keys. */
const JSON_HEADERS={'content-type':'application/json; charset=utf-8','cache-control':'no-store, private','x-content-type-options':'nosniff','referrer-policy':'no-referrer'};
const reply=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:JSON_HEADERS});
const goodCode=s=>/^[A-Z0-9_]{3,90}$/.test(String(s||''));
function config(env){
 const url=String(env.SUPABASE_URL||'').replace(/\/$/,'');
 const pub=String(env.SUPABASE_PUBLISHABLE_KEY||'');
 const service=String(env.SUPABASE_SECRET_KEY||'');
 if(!/^https:\/\/[a-z0-9.-]+\.supabase\.co$/i.test(url)||!pub||!service)
  throw Object.assign(new Error('Download service is not configured.'),{status:503});
 return {url,pub,service};
}
async function jsonFetch(url,options){
 const res=await fetch(url,{...options,cache:'no-store'});
 const data=await res.json().catch(()=>({}));
 if(!res.ok)throw Object.assign(new Error('The download service could not validate this request.'),{status:res.status===401?401:res.status===403?403:503});
 return data;
}
export async function onRequestPost({request,env}){
 try{
  if(Number(request.headers.get('content-length')||'0')>4096)return reply({ok:false,error:'Request too large.'},413);
  const origin=request.headers.get('origin');
  // Same-origin browser requests; external clients must not get permissive CORS.
  if(origin && origin!==new URL(request.url).origin)return reply({ok:false,error:'Origin not permitted.'},403);
  const jwt=/^Bearer\s+([^\s]+)$/i.exec(request.headers.get('authorization')||'')?.[1];
  if(!jwt)return reply({ok:false,error:'Sign in required.'},401);
  const body=await request.json().catch(()=>({}));
  const code=body?.code;
  const format=body?.format==null?null:String(body.format).toLowerCase();
  if(!goodCode(code)||(format!==null&&!['pdf','epub'].includes(format)))return reply({ok:false,error:'Invalid book code.'},400);
  const cfg=config(env);
  const authHeaders={apikey:cfg.pub,authorization:'Bearer '+jwt};
  // Supabase Auth verifies JWT; the database RPC enforces caller-bound ownership.
  const user=await jsonFetch(cfg.url+'/auth/v1/user',{headers:authHeaders});
  if(!user?.id)return reply({ok:false,error:'Invalid login session.'},401);
  const access=await jsonFetch(cfg.url+'/rest/v1/rpc/'+(format?'gu_digital_format_path_v014305':'gu_digital_book_can_download_v01430'),{
   method:'POST',headers:{...authHeaders,'content-type':'application/json'},
   body:JSON.stringify(format?{p_code:code,p_format:format}:{p_code:code})
  });
  if(access?.allowed!==true)return reply({ok:false,error:'No currently available purchased digital edition for this account.'},403);
  const path=String(access.path||'');
  const pattern=new RegExp('^'+code+'/[a-f0-9-]{36}[.](epub|pdf)$');
  if(!pattern.test(path)||(format&&!path.endsWith('.'+format)))return reply({ok:false,error:'Digital edition not available.'},503);
  const encoded=path.split('/').map(encodeURIComponent).join('/');
  const signed=await jsonFetch(cfg.url+'/storage/v1/object/sign/gu-digital-ebooks/'+encoded,{
   method:'POST',headers:{apikey:cfg.service,authorization:'Bearer '+cfg.service,'content-type':'application/json'},
   body:JSON.stringify({expiresIn:60})
  });
  const fragment=signed.signedURL||signed.signedUrl;
  if(typeof fragment!=='string'||!fragment.startsWith('/object/sign/gu-digital-ebooks/'))
   return reply({ok:false,error:'Private download could not be signed.'},503);
  const downloadUrl=new URL('/storage/v1'+fragment,cfg.url);
  if(downloadUrl.origin!==new URL(cfg.url).origin)return reply({ok:false,error:'Invalid private download destination.'},503);
  downloadUrl.searchParams.set('download',code+'.'+path.split('.').pop());
  return reply({ok:true,url:downloadUrl.toString(),expiresInSeconds:60});
 }catch(e){return reply({ok:false,error:e.status===401?'Please sign in again.':e.status===403?'Access is unavailable.':'The download service is temporarily unavailable.'},e.status===401?401:e.status===403?403:503)}
}
export async function onRequestGet(){return reply({ok:false,error:'POST required.'},405)}
