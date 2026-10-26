import {checkMutationOrigin,boundedForumJson} from '../_lib/forum-request-guards-v014105.js';

/* Owner-only, zero-cost social operations. No calls to X, Stripe or other paid APIs.
 * Manual publication is recorded as MANUAL_RECORDED, never provider-verified.
 */
const reply=(data,status=200)=>new Response(JSON.stringify(data),{
 status,headers:{'content-type':'application/json','cache-control':'no-store','x-content-type-options':'nosniff'}
});
const fault=(message,status=400)=>Object.assign(new Error(message),{status});
const clean=x=>String(x??'').trim();
const uuid=x=>typeof x==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(x);
function configuration(env){
 const base=clean(env.SUPABASE_URL).replace(/\/$/,'');
 const secret=clean(env.SUPABASE_SECRET_KEY),pub=clean(env.SUPABASE_PUBLISHABLE_KEY);
 if(!/^https:\/\/[a-z0-9]{20}\.supabase\.co$/.test(base)||!secret||!pub)
  throw fault('Social management data service is unavailable.',503);
 const headers={apikey:secret,accept:'application/json'};
 if(/^eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(secret))
  headers.authorization='Bearer '+secret;
 return {base,pub,headers};
}
async function db(c,path,method='GET',body){
 const headers={...c.headers,prefer:'return=representation'};
 if(body!==undefined)headers['content-type']='application/json';
 const r=await fetch(c.base+'/rest/v1/'+path,{
  method,headers,body:body===undefined?undefined:JSON.stringify(body),cache:'no-store'
 });
 if(!r.ok)throw fault('Social management data service rejected the request.',503);
 return r.status===204?[]:r.json();
}
async function owner(c,request){
 const token=/^Bearer\s+([^\s]+)$/i.exec(request.headers.get('authorization')||'')?.[1];
 if(!token)throw fault('Owner sign-in required.',401);
 const r=await fetch(c.base+'/auth/v1/user',{headers:{apikey:c.pub,authorization:'Bearer '+token},cache:'no-store'});
 if(!r.ok)throw fault('Valid signed-in Owner required.',401);
 const user=await r.json();
 if(!uuid(user.id))throw fault('Invalid member session.',401);
 const [roles,profiles,flags]=await Promise.all([
  db(c,'admin_user_roles?select=role_code,expires_at&user_id=eq.'+user.id),
  db(c,'profiles?select=account_kind,deleted_at&id=eq.'+user.id+'&limit=1'),
  db(c,'admin_user_flags?select=status&user_id=eq.'+user.id+'&limit=1')
 ]);
 const active=x=>!x.expires_at||Date.parse(x.expires_at)>Date.now();
 if(profiles?.[0]?.account_kind!=='member'||profiles?.[0]?.deleted_at||
    ['restricted','suspended'].includes(flags?.[0]?.status)||
    roles?.some(x=>x.role_code==='SHOWCASE_VIEWER'&&active(x))||
    !roles?.some(x=>x.role_code==='OWNER'&&active(x)))
  throw fault('Owner authority required.',403);
 return user.id;
}
const posts='gu_social_posts_v014276',communities='gu_social_communities_v014276';
function validatePost(body){
 const text=clean(body.body);
 if(!text||Array.from(text).length>280||text.length>280)
  throw fault('X post must contain 1–280 characters.');
 const status=clean(body.status||'draft');
 if(!['draft','approved','planned','archived'].includes(status))
  throw fault('Unsupported post state.');
 let planned_at=null;
 if(status==='planned'){
  if(typeof body.plannedAt!=='string'||!body.plannedAt||!Number.isFinite(Date.parse(body.plannedAt)))
   throw fault('Planned posts require a valid date and time.');
  planned_at=new Date(body.plannedAt).toISOString();
 }
 return {body:text,platform:'x',status,planned_at,external_url:null,updated_at:new Date().toISOString()};
}
function validateCommunity(body){
 const name=clean(body.name),community_url=clean(body.communityUrl),notes=clean(body.notes);
 const membership_status=clean(body.membershipStatus||'unknown');
 const promotion_policy=clean(body.promotionPolicy||'unverified');
 if(name.length<2||name.length>120||!/^https:\/\/(x\.com|twitter\.com)\/i\/communities\/[0-9]+$/.test(community_url)||
   notes.length>2000||!['unknown','not_joined','requested','joined','declined','left'].includes(membership_status)||
   !['unverified','allowed','restricted','prohibited'].includes(promotion_policy))
  throw fault('Community name, URL, rules, or status is invalid.');
 return {platform:'x',name,community_url,notes,membership_status,promotion_policy,updated_at:new Date().toISOString()};
}
function publicationUrl(input){
 try{
  const u=new URL(input);
  if(u.protocol!=='https:'||!['x.com','twitter.com'].includes(u.hostname)||
     u.username||u.password||u.port||u.search||u.hash||
     !/^\/SMFGUAcademy\/status\/[0-9]+$/.test(u.pathname))
   throw Error('bad url');
  return u.href;
 }catch{throw fault('Enter the exact published @SMFGUAcademy X status URL.');}
}
async function one(c,table,actor,id,payload){
 const path=id
   ?table+'?id=eq.'+encodeURIComponent(id)+'&owner_id=eq.'+encodeURIComponent(actor)
   :table;
 const result=await db(c,path,id?'PATCH':'POST',id?payload:{...payload,owner_id:actor});
 if(!Array.isArray(result)||result.length!==1)
  throw fault(id?'Social record was not found.':'Social record could not be saved.',id?404:503);
 return result[0];
}
export async function onRequest({request,env}){
 try{
  if(!['GET','POST'].includes(request.method))return reply({ok:false,error:'Method not allowed.'},405);
  const c=configuration(env);
  const actor=await owner(c,request);
  if(request.method==='GET'){
   const [socialPosts,socialCommunities]=await Promise.all([
    db(c,posts+'?select=id,body,status,planned_at,external_url,created_at,updated_at&owner_id=eq.'+actor+'&order=updated_at.desc&limit=100'),
    db(c,communities+'?select=id,name,community_url,membership_status,promotion_policy,notes,last_verified_at,updated_at&owner_id=eq.'+actor+'&order=updated_at.desc&limit=100')
   ]);
   return reply({ok:true,account:{platform:'x',handle:'@SMFGUAcademy',connectionStatus:'manual_only'},posts:socialPosts,communities:socialCommunities});
  }
  checkMutationOrigin(request);
  const data=await boundedForumJson(request,9000);
  let saved;
  if(data.action==='save_post'){
   if(data.id!==undefined&&!uuid(data.id))throw fault('Invalid post identifier.');
   saved=await one(c,posts,actor,data.id,validatePost(data));
  }else if(data.action==='record_manual_post'){
   if(!uuid(data.id))throw fault('Valid post identifier required.');
   const external_url=publicationUrl(data.externalUrl);
   saved=await one(c,posts,actor,data.id,{status:'manual_recorded',external_url,updated_at:new Date().toISOString()});
  }else if(data.action==='save_community'){
   if(data.id!==undefined&&!uuid(data.id))throw fault('Invalid community identifier.');
   saved=await one(c,communities,actor,data.id,validateCommunity(data));
  }else throw fault('Unknown social management action.');
  // Transactional database triggers write the audit in the same statement.
  return reply({ok:true,record:saved,publicationVerified:false},data.id?200:201);
 }catch(e){
  return reply({ok:false,error:e?.status&&e.status<500?e.message:'Social management is temporarily unavailable.'},e?.status||503);
 }
}
