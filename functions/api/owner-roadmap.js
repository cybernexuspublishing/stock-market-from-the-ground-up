/* Private Owner Website Roadmap API v0.14.0.45.
 * No new migration. Records are stored in existing private site_settings rows.
 * Browser never receives privileged Supabase keys or accesses site_settings directly.
 * This API is the ONLY client access to the registry and OWNER progress.
 */
import {roadmapCatalog,roadmapMetadata} from '../_lib/owner-roadmap-catalog.js';
import {roadmapEngineeringReview} from '../_lib/owner-roadmap-engineering-review.js';
const H={'content-type':'application/json; charset=utf-8','cache-control':'private, no-store, max-age=0','pragma':'no-cache','x-content-type-options':'nosniff','x-robots-tag':'noindex, nofollow'};
const reply=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:H});
const fail=(message,status=400)=>Object.assign(new Error(message),{status});
const clean=x=>String(x??'').trim();
const KEY='owner_roadmap.';
const STATUS=new Set(['not_started','in_progress','implemented','blocked','deferred','owner_complete','verified']);
const IDS=new Set(roadmapCatalog.map(x=>x.id));
/* Owner progress is authoritative for manual completion; this snapshot is NOT
 * written to site_settings and never marks Owner checkboxes complete. */
const execStage = {
 source_implemented:new Set([1,2,3,4,5,11,12,14,19,21,23,24,26,30,31,35,43,45,48,53,54,57,58,60,64]),
 in_progress:new Set([13,15,16,17,18,22,27,28,29,55,66,67,69,70,75,77]),
 blocked:new Set([6,7,8,9,10,32,34,36,38,42,44,47,74,76])
};
const historicStage={
 deployed_verified:new Set([1,2,3]),
 source_implemented:new Set([4,5,7,8,9,10,11,12,13,14,15,16,17,19,25,26,27,28,29,30,31,32,33,34,35,36,37]),
 in_progress:new Set([6,22,24]),
 blocked:new Set([38]),
 backlog:new Set([18,20,21,23])
};
function stageFor(n,map,fallback='backlog'){
 for(const [stage,ids] of Object.entries(map))if(ids.has(n))return stage;
 return fallback;
}
function reviewFor(item){
 if(item.kind==='reference'||item.scope==='trace')return null;
 const meta=roadmapEngineeringReview;
 let result=meta.items[item.id];
 if(!result){
   const n=Number(item.id.split('-')[1]);
   const isExec=item.id.startsWith('EXEC-');
   const isPromise=item.id.startsWith('PROM-');
   if(!isExec&&!isPromise)return {stage:'needs_review',summary:meta.labels.needs_review.note};
   const stage=stageFor(n,isExec?execStage:historicStage);
   const sourceStatus=item.evidence||'No established acceptance evidence';
   const explanation=isExec
     ? 'Historical 77-step task; v0.14.0.6 registered this step as not fully verified. '+meta.labels[stage].note
     : 'Prior commitment evidence (historical; may predate the v0.14.0.44 release): '+sourceStatus+'. '+meta.labels[stage].note;
   result={stage,summary:explanation};
 }
 return result;
}
const reviewCounts=roadmapCatalog.filter(x=>x.scope==='core').reduce((counts,item)=>{
 const stage=reviewFor(item)?.stage||'needs_review';
 counts[stage]=(counts[stage]||0)+1;return counts;
},{});

function config(env){
  const base=clean(env.SUPABASE_URL).replace(/\/$/,'');
  const pub=clean(env.SUPABASE_PUBLISHABLE_KEY),secret=clean(env.SUPABASE_SECRET_KEY);
  if(!/^https:\/\//.test(base)||!pub||!secret)throw fail('Owner roadmap service not configured.',503);
  return{base,pub,secret};
}
async function requestJson(url,options={},authEndpoint=false){
  let response;
  try{response=await fetch(url,{...options,cache:'no-store'})}
  catch{throw fail('Database service temporarily unavailable.',503)}
  let data;
  try{data=await response.json()}catch{data=null}
  if(!response.ok){
    // Error details may contain private database context. Do not reflect those to browsers.
    if(response.status===401||response.status===403)throw fail(authEndpoint?'Invalid or expired sign-in.':'Database access was denied.',authEndpoint?401:503);
    throw fail('Owner roadmap storage request failed.',503);
  }
  return data;
}
function serviceHeaders(c,json=false){
  // Modern Supabase sb_secret_* uses apikey only, whereas legacy service-role
  // JWTs may use apikey + Bearer. Keep tokens strictly server-side.
  const secret=c.secret;
  const h={apikey:secret,accept:'application/json'};
  if(/^eyJ[A-Za-z0-9_-]+[.]eyJ[A-Za-z0-9_-]+[.][A-Za-z0-9_-]+$/.test(secret))h.authorization='Bearer '+secret;
  if(json)h['content-type']='application/json';
  return h;
}
async function db(c,endpoint,method='GET',payload,prefer){
  return requestJson(c.base+'/rest/v1/'+endpoint,{method,headers:{...serviceHeaders(c,payload!==undefined),...(prefer?{prefer}:{})},body:payload===undefined?undefined:JSON.stringify(payload)});
}
async function owner(request,c,env){
  const matched=/^Bearer\s+([^\s]+)$/i.exec(request.headers.get('authorization')||'');
  if(!matched)throw fail('Sign in with an Owner account.',401);
  const user=await requestJson(c.base+'/auth/v1/user',{headers:{apikey:c.pub,authorization:'Bearer '+matched[1]}},true);
  if(!user?.id)throw fail('Invalid signed-in account.',401);
  const id=encodeURIComponent(user.id);
  const [profiles,roles,flags]=await Promise.all([
    db(c,'profiles?select=account_kind&id=eq.'+id+'&limit=1'),
    db(c,'admin_user_roles?select=role_code,expires_at&user_id=eq.'+id),
    db(c,'admin_user_flags?select=status&user_id=eq.'+id+'&limit=1')
  ]);
  const eligible=profiles?.[0]?.account_kind==='member' &&
    !['restricted','suspended'].includes(String(flags?.[0]?.status||'active').toLowerCase());
  const activeOwner=Array.isArray(roles)&&roles.some(r=>r.role_code==='OWNER'&&(!r.expires_at||Date.parse(r.expires_at)>Date.now()));
  if(!eligible||!activeOwner)throw fail('This page is restricted to eligible Owner / Super Admin accounts.',403);
  if(env.REQUIRE_STAFF_AAL2_V135==='true'){
    let assurance='';try{
      const claims=JSON.parse(atob(matched[1].split('.')[1].replace(/-/g,'+').replace(/_/g,'/')));
      assurance=claims.aal||'';
    }catch{}
    if(assurance!=='aal2')throw fail('Verified staff MFA is required for Owner access.',403);
  }
  return{id:user.id};
}
async function allState(c){
  const all=[];
  // PostgREST may cap rows at 1000. Pagination prevents silent loss as this register grows.
  for(let page=0;page<20;page++){
    const batch=await db(c,'site_settings?select=setting_key,value,updated_at,updated_by,public_read&setting_key=like.owner_roadmap.*&order=setting_key.asc&limit=750&offset='+(page*750));
    if(!Array.isArray(batch))throw fail('Unexpected roadmap storage response.',503);
    if(batch.some(x=>x.public_read===true))throw fail('Private roadmap storage configuration needs review.',503);
    all.push(...batch);if(batch.length<750)return all;
  }
  throw fail('Roadmap storage limit reached; contact the Owner.',503);
}
async function record(c,key){
  const rows=await db(c,'site_settings?select=setting_key,value,public_read&setting_key=eq.'+encodeURIComponent(key)+'&limit=1');
  if(rows?.[0]?.public_read===true)throw fail('Private roadmap storage configuration needs review.',503);
  return rows?.[0]?.value||null;
}
async function write(c,user,key,value){
  const now=new Date().toISOString();
  await db(c,'site_settings?on_conflict=setting_key','POST',{
    setting_key:key,category:'owner_roadmap',value,public_read:false,
    description:'Private Owner development requirement progress; no customer access.',
    updated_at:now,updated_by:user.id
  },'resolution=merge-duplicates,return=representation');
  return now;
}
async function audit(c,user,action,id,status){
  try{
    await db(c,'admin_audit_log','POST',{
      actor_user_id:user.id,action,target_type:'OWNER_ROADMAP',target_id:id,
      details:{status,source:'private_owner_roadmap_v014045'}
    },'return=minimal');return true;
  }catch{return false}
}
async function handlePost(request,c,user){
  const origin=request.headers.get('origin');
  if(origin&&origin!==new URL(request.url).origin)throw fail('Cross-origin Owner updates are not permitted.',403);
  const len=Number(request.headers.get('content-length')||0);
  if(len>12000)throw fail('Request too large.',413);
  const body=await request.json().catch(()=>null);
  if(!body||JSON.stringify(body).length>12000)throw fail('Invalid change request.',400);
  const action=clean(body.action||'save');
  if(action==='add'){
    const title=clean(body.title),detail=clean(body.detail),area=clean(body.area)||'Owner-added tasks';
    if(title.length<4||title.length>180||detail.length>2400||area.length>90)throw fail('Invalid custom task details.',400);
    const id='OWN-'+crypto.randomUUID();
    const value={custom:true,id,area,title,detail,status:'not_started',note:'',updatedAt:new Date().toISOString(),updatedBy:user.id,archived:false};
    await write(c,user,KEY+'custom.'+id,value);
    const logged=await audit(c,user,'owner_roadmap.add',id,'not_started');
    return reply({ok:true,item:{id,scope:'core',area,title,detail,source:'Owner-added item',evidence:'Owner-authored',kind:'task'},progress:value,auditLogged:logged});
  }
  const id=clean(body.id);
  if(!IDS.has(id)&&!/^OWN-[a-f0-9-]{36}$/i.test(id))throw fail('Unknown requirement ID.',404);
  const key=KEY+(id.startsWith('OWN-')?'custom.':'task.')+id;
  const prior=await record(c,key);
  if(id.startsWith('OWN-')&&!prior?.custom)throw fail('Custom task does not exist.',404);
  if(action==='archive'&&id.startsWith('OWN-')){
    const value={...prior,archived:true,updatedAt:new Date().toISOString(),updatedBy:user.id};
    await write(c,user,key,value);
    const logged=await audit(c,user,'owner_roadmap.archive',id,prior.status);
    return reply({ok:true,progress:value,auditLogged:logged});
  }
  if(action!=='save')throw fail('Unknown Owner roadmap action.',404);
  const status=clean(body.status);
  if(!STATUS.has(status))throw fail('Choose a valid tracking status.',400);
  const note=clean(body.note||'');
  if(note.length>2400)throw fail('Progress note may not exceed 2,400 characters.',400);
  const value={...(prior||{}),status,note,updatedAt:new Date().toISOString(),updatedBy:user.id};
  await write(c,user,key,value);
  const logged=await audit(c,user,'owner_roadmap.update',id,status);
  return reply({ok:true,progress:value,auditLogged:logged});
}
export async function onRequest({request,env}){
  try{
    if(!['GET','POST'].includes(request.method))return reply({ok:false,error:'Method not allowed.'},405);
    const c=config(env);
    const user=await owner(request,c,env);
    if(request.method==='POST')return await handlePost(request,c,user);
    const state=await allState(c);
    const progress={},custom=[];
    for(const row of state){
      const value=row.value||{},key=row.setting_key;
      if(key.startsWith(KEY+'task.')){
        const id=key.slice((KEY+'task.').length);
        if(IDS.has(id))progress[id]=value;
      }else if(key.startsWith(KEY+'custom.')&&value.custom===true&&!value.archived){
        const id=value.id;
        if(typeof id==='string'&&id.startsWith('OWN-')){progress[id]=value;custom.push({id,scope:'core',area:value.area||'Owner-added tasks',title:value.title||'Untitled',detail:value.detail||'',source:'Owner-added item',evidence:'Owner-authored',kind:'task'});}
      }
    }
    return reply({ok:true,metadata:roadmapMetadata,engineeringReview:{...roadmapEngineeringReview.meta,labels:roadmapEngineeringReview.labels,counts:reviewCounts},items:roadmapCatalog.map(item=>({...item,engineeringReview:reviewFor(item)})),custom,progress,limitations:'Engineering source audit labels are advisory; they never alter saved Owner progress or certify complete live functionality.'});
  }catch(err){
    const status=[400,401,403,404,405,413,503].includes(err?.status)?err.status:503;
    return reply({ok:false,error:err?.message||'Roadmap service unavailable.'},status);
  }
}
