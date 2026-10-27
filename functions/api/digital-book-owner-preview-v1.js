/* Owner-only private ebook download acceptance test.
 * This NEVER grants customer access, enables book publication, changes KDP
 * rights, or creates orders. Reuses the audited Owner history and recent
 * password/CAPTCHA step-up database gate to authorize each temporary link.
 */
const HEADERS={'content-type':'application/json; charset=utf-8','cache-control':'no-store, private','referrer-policy':'no-referrer','x-content-type-options':'nosniff'};
const reply=(v,status=200)=>new Response(JSON.stringify(v),{status,headers:HEADERS});
const codeOk=v=>/^[A-Z0-9_]{3,90}$/.test(String(v||''));
function cfg(env){
 const url=String(env.SUPABASE_URL||'').replace(/\/$/,'');
 const pub=String(env.SUPABASE_PUBLISHABLE_KEY||'');
 const secret=String(env.SUPABASE_SECRET_KEY||'');
 if(!/^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(url)||!pub||!secret)
  throw Object.assign(Error('Service unavailable'),{status:503});
 return {url,pub,secret};
}
async function data(url,options){
 const res=await fetch(url,{cache:'no-store',...options});
 const payload=await res.json().catch(()=>({}));
 if(!res.ok)throw Object.assign(Error('Owner verification or signing was rejected'),{status:res.status===401?401:res.status===403?403:503});
 return payload;
}
export async function onRequestPost({request,env}){
 try{
  const origin=request.headers.get('origin');
  if(!origin||origin!==new URL(request.url).origin)
   return reply({ok:false,error:'Same-origin Owner request required.'},403);
  if(Number(request.headers.get('content-length')||'0')>1024)
   return reply({ok:false,error:'Request too large.'},413);
  const jwt=/^Bearer\s+([^\s]+)$/i.exec(request.headers.get('authorization')||'')?.[1];
  if(!jwt)return reply({ok:false,error:'Owner sign-in required.'},401);
  const body=await request.text();
  if(body.length>1024)return reply({ok:false,error:'Request too large.'},413);
  let parsed;try{parsed=JSON.parse(body)}catch{return reply({ok:false,error:'Invalid request.'},400)}
  const code=parsed?.code,format=parsed?.format;
  if(!codeOk(code)||!['epub','pdf'].includes(format))return reply({ok:false,error:'Invalid book code or format.'},400);
  const c=cfg(env);
  const authHeaders={apikey:c.pub,authorization:'Bearer '+jwt};
  const user=await data(c.url+'/auth/v1/user',{headers:authHeaders});
  if(!/^[a-f0-9-]{36}$/i.test(String(user?.id||'')))return reply({ok:false,error:'Owner session invalid.'},401);
  // Security-definer RPC enforces OWNER, verified member status, restrictions,
  // and RECENT password/CAPTCHA confirmation for the requesting user.
  const history=await data(c.url+'/rest/v1/rpc/gu_owner_digital_history_v014304',{
   method:'POST',headers:{...authHeaders,'content-type':'application/json'},
   body:JSON.stringify({p_code:code})
  });
  if(history?.ok!==true||!Array.isArray(history.versions))
   return reply({ok:false,error:'Owner digital edition verification failed.'},403);
  const candidates=history.versions.filter(v=>v?.current===true&&v?.format===format&&v?.fileExists===true);
  if(candidates.length!==1)return reply({ok:false,error:'No unique current private edition available.'},409);
  const edition=candidates[0],path=String(edition.path||'');
  if(!new RegExp('^'+code+'/[a-f0-9-]{36}[.]'+format+'$').test(path)||
    !Number.isInteger(edition.version)||edition.version<1||!Number.isSafeInteger(edition.bytes)||
    edition.bytes<=0||edition.bytes>50*1024*1024)
   return reply({ok:false,error:'Private edition metadata failed validation.'},409);
  const secretHeaders={apikey:c.secret,authorization:'Bearer '+c.secret,'content-type':'application/json'};
  const signed=await data(c.url+'/storage/v1/object/sign/gu-digital-ebooks/'+path.split('/').map(encodeURIComponent).join('/'),{
   method:'POST',headers:secretHeaders,body:JSON.stringify({expiresIn:60})
  });
  const fragment=signed.signedURL||signed.signedUrl;
  if(typeof fragment!=='string'||!fragment.startsWith('/object/sign/gu-digital-ebooks/'))
   return reply({ok:false,error:'Private preview could not be signed.'},503);
  const url=new URL('/storage/v1'+fragment,c.url);
  if(url.origin!==new URL(c.url).origin)return reply({ok:false,error:'Invalid preview destination.'},503);
  url.searchParams.set('download',code+'-owner-preview-v'+edition.version+'.'+format);
  // Audit is mandatory. Fail closed if the event cannot be recorded.
  await data(c.url+'/rest/v1/admin_audit_log',{
   method:'POST',
   headers:{...secretHeaders,prefer:'return=representation'},
   body:JSON.stringify({actor_user_id:user.id,action:'commerce.digital.owner_preview.signed',target_type:'catalog_product',
    target_id:code,details:{format,version:edition.version,expiresInSeconds:60,customerAccessChanged:false}})
  });
  return reply({ok:true,url:url.toString(),version:edition.version,format,expiresInSeconds:60,
   customerAccessChanged:false});
 }catch(e){
  const status=e.status===401?401:e.status===403?403:e.status===409?409:503;
  return reply({ok:false,error:status===401?'Please sign in again.':status===403?'Owner password confirmation or permission is required.':'Private preview could not be prepared. Sales and downloads remain unchanged.'},status);
 }
}
export async function onRequestGet(){return reply({ok:false,error:'POST required.'},405)}
