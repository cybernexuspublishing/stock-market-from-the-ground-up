/* Private Owner Website Roadmap API v0.14.0.63.
 * No new migration. Records are stored in existing private site_settings rows.
 * Browser never receives privileged Supabase keys or accesses site_settings directly.
 * This API is the ONLY client access to the registry and OWNER progress.
 */
import {roadmapCatalog,roadmapMetadata} from '../_lib/owner-roadmap-catalog.js';
import {roadmapSupplementalItems,roadmapSupplementalReview,roadmapSupplementalMeta} from '../_lib/owner-roadmap-20261018-additions.js';
import {roadmapEngineeringReview} from '../_lib/owner-roadmap-engineering-review.js';
import {delegatedReviewPolicy,delegatedProgressFor} from '../_lib/owner-roadmap-delegation-v014046.js';
import {roadmapOperationalBrief} from '../_lib/owner-roadmap-private-brief-v014063.js';
import {reviewedProductGuidesV01488,supportingCapabilitiesV01488} from '../_lib/owner-roadmap-product-inventory-v01488.js';
const H={'content-type':'application/json; charset=utf-8','cache-control':'private, no-store, max-age=0','pragma':'no-cache','x-content-type-options':'nosniff','x-robots-tag':'noindex, nofollow'};
const reply=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:H});
const fail=(message,status=400)=>Object.assign(new Error(message),{status});
const clean=x=>String(x??'').trim();
const KEY='owner_roadmap.';
const STATUS=new Set(['not_started','in_progress','implemented','blocked','deferred','owner_complete','verified']);
// Preserve every historical requirement; append reviewed 2026-10-18 work without renaming IDs.
const completeCatalog=[...roadmapCatalog,...roadmapSupplementalItems];
const IDS=new Set(completeCatalog.map(x=>x.id));
if(IDS.size!==completeCatalog.length)throw Error('Duplicate Owner roadmap IDs.');
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
 let result=roadmapSupplementalReview[item.id]||meta.items[item.id];
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
const delegatedBaseline=Object.fromEntries(completeCatalog
 .filter(item=>item.scope==='core' && item.kind==='task')
 .map(item=>[item.id,delegatedProgressFor(item.id,reviewFor(item))])
 .filter(([,value])=>value!==null));
const baselineCounts=Object.values(delegatedBaseline).reduce((counts,item)=>{
 counts[item.approval]=(counts[item.approval]||0)+1;
 return counts;
},{});
const reviewCounts=completeCatalog.filter(x=>x.scope==='core').reduce((counts,item)=>{
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
  const rows=await db(c,'site_settings?select=setting_key,value,public_read,updated_at&setting_key=eq.'+encodeURIComponent(key)+'&limit=1');
  if(rows?.[0]?.public_read===true)throw fail('Private roadmap storage configuration needs review.',503);
  return rows?.[0]||null;
}
function recordRevision(row){
  return row?(row.value?.revision||row.updated_at||null):null;
}
/* Compare-and-swap using existing site_settings.updated_at; no SQL migration.
   Do not silently overwrite another Owner's edits (including a simultaneous
   create). The updated row count must be precisely one. */
async function write(c,user,key,value,prior){
  const now=new Date(Math.max(Date.now(), (prior?.updated_at?Date.parse(prior.updated_at)+1:0))).toISOString();
  const revision=crypto.randomUUID();
  const data={
    setting_key:key,category:'owner_roadmap',
    value:{...value,revision,updatedAt:now,updatedBy:user.id},
    public_read:false,
    description:'Private Owner development requirement progress; no customer access.',
    updated_at:now,updated_by:user.id
  };
  const exists=Boolean(prior);
  const suffix=exists
    ?'site_settings?setting_key=eq.'+encodeURIComponent(key)+'&updated_at=eq.'+encodeURIComponent(prior.updated_at)
    :'site_settings?on_conflict=setting_key';
  let response;
  try {
    response=await fetch(c.base+'/rest/v1/'+suffix,{
      method:exists?'PATCH':'POST',
      headers:{...serviceHeaders(c,true),prefer:exists?'return=representation':'resolution=ignore-duplicates,return=representation'},
      body:JSON.stringify(exists?{
        value:data.value,public_read:false,updated_at:now,updated_by:user.id
      }:data),cache:'no-store'
    });
  } catch {throw fail('Cannot save Owner progress while the database is unavailable.',503)}
  if(!response.ok)throw fail(response.status===409?'Another Owner changed this task. Refresh before saving.':'Owner roadmap storage write failed.',response.status===409?409:503);
  const changed=await response.json().catch(()=>null);
  if(!Array.isArray(changed)||changed.length!==1)throw fail('This task changed in another session. Refresh before saving.',409);
  return data.value;
}
async function audit(c,user,action,id,status){
  try{
    await db(c,'admin_audit_log','POST',{
      actor_user_id:user.id,action,target_type:'OWNER_ROADMAP',target_id:id,
      details:{status,source:'private_owner_roadmap_v014046'}
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
    const value={custom:true,id,area,title,detail,status:'not_started',note:'',archived:false};
    const saved=await write(c,user,KEY+'custom.'+id,value,null);
    const logged=await audit(c,user,'owner_roadmap.add',id,'not_started');
    return reply({ok:true,item:{id,scope:'core',area,title,detail,source:'Owner-added item',evidence:'Owner-authored',kind:'task'},progress:saved,auditLogged:logged});
  }
  const id=clean(body.id);
  if(!IDS.has(id)&&!/^OWN-[a-f0-9-]{36}$/i.test(id))throw fail('Unknown requirement ID.',404);
  const key=KEY+(id.startsWith('OWN-')?'custom.':'task.')+id;
  const prior=await record(c,key);
  if(id.startsWith('OWN-')&&!prior?.value?.custom)throw fail('Custom task does not exist.',404);
  if(prior?.value?.archived===true)throw fail('Archived custom tasks cannot be changed.',404);
  const clientRevision=body.expectedRevision??null;
  if(clientRevision!==recordRevision(prior))throw fail('This task was changed elsewhere. Refresh to load the latest Owner status.',409);
  if(action==='archive'&&id.startsWith('OWN-')){
    const value={...prior.value,archived:true};
    const saved=await write(c,user,key,value,prior);
    const logged=await audit(c,user,'owner_roadmap.archive',id,prior.value.status);
    return reply({ok:true,progress:saved,auditLogged:logged});
  }
  if(action!=='save')throw fail('Unknown Owner roadmap action.',404);
  const status=clean(body.status);
  if(!STATUS.has(status))throw fail('Choose a valid tracking status.',400);
  const note=clean(body.note||'');
  if(note.length>2400)throw fail('Progress note may not exceed 2,400 characters.',400);
  if(status==='verified'&&note.length<20)throw fail('Evidence-verified status requires at least 20 characters of recorded acceptance evidence.',400);
  const value={...(prior?.value||{}),status,note};
  const saved=await write(c,user,key,value,prior);
  const logged=await audit(c,user,'owner_roadmap.update',id,status);
  return reply({ok:true,progress:saved,auditLogged:logged});
}

/* Product inventory is read ONLY AFTER owner() has authorized this request.
 * Prices, plan flags, and explicit tool mappings come from Supabase. Store
 * editorial inclusion/exclusion text remains separately attributed, never
 * rewritten into database entitlements. No user grants or billing data read.
 */
async function ownerProductInventory(c){
 try{
  const [plans,tools,access]=await Promise.all([
   db(c,'platform_plans?select=plan_code,name,description,price_cents,billing_interval,active,public_visible,checkout_enabled,includes_all_tools,includes_all_books,ad_free,sort_order&order=sort_order.asc&limit=100'),
   db(c,'platform_tools?select=tool_code,name,description,category,status,active,public_visible,individual_price_cents,free_preview,href,sort_order,data_requirement,included_full,included_lifetime&order=sort_order.asc&limit=100'),
   db(c,'plan_tool_access?select=plan_code,tool_code&limit=500')
  ]);
  if(!Array.isArray(plans)||!Array.isArray(tools)||!Array.isArray(access)
    ||plans.length===100||tools.length===100||access.length===500){
   throw Error('Catalog response cannot be verified.');
  }
  const allowedPlans=new Set(plans.map(p=>p.plan_code));
  const allowedTools=new Set(tools.map(t=>t.tool_code));
  return {available:true,source:'Authenticated Owner-only Supabase catalog + separately reviewed editorial coverage',
    reviewedGuideVersion:reviewedProductGuidesV01488.version,
    capturedAt:new Date().toISOString(),
    plans,tools,explicitAccess:access.filter(a=>allowedPlans.has(a.plan_code)&&allowedTools.has(a.tool_code)),
    guides:reviewedProductGuidesV01488,capabilities:supportingCapabilitiesV01488,
    note:'Catalog status and price are configuration, not proof of payment processing or working tool features. Existing user entitlements still require server validation.'};
 }catch{
  return {available:false,plans:[],tools:[],explicitAccess:[],guides:null,
    capabilities:supportingCapabilitiesV01488,
    error:'The live membership and tool catalog could not be verified. No price, plan membership or product availability can be certified from this snapshot.'};
 }
}

export async function onRequest({request,env}){
  try{
    if(!['GET','POST'].includes(request.method))return reply({ok:false,error:'Method not allowed.'},405);
    const c=config(env);
    const user=await owner(request,c,env);
    if(request.method==='POST')return await handlePost(request,c,user);
    const state=await allState(c);
    const productInventory=await ownerProductInventory(c);
    const progress={},custom=[];
    for(const row of state){
      const value=row.value||{},key=row.setting_key;
      if(key.startsWith(KEY+'task.')){
        const id=key.slice((KEY+'task.').length);
        if(IDS.has(id))progress[id]={...value,revision:recordRevision(row)};
      }else if(key.startsWith(KEY+'custom.')&&value.custom===true&&!value.archived){
        const id=value.id;
        if(typeof id==='string'&&id.startsWith('OWN-')){progress[id]={...value,revision:recordRevision(row)};custom.push({id,scope:'core',area:value.area||'Owner-added tasks',title:value.title||'Untitled',detail:value.detail||'',source:'Owner-added item',evidence:'Owner-authored',kind:'task'});}
      }
    }
    return reply({ok:true,metadata:{...roadmapMetadata,...roadmapSupplementalMeta,originalCount:roadmapCatalog.length,totalCount:completeCatalog.length},engineeringReview:{...roadmapEngineeringReview.meta,asOf:'2026-10-18',baseline:'b00cc34997571885b41a3eadad00e734472eb867',scope:'Original v0.14.0.45 engineering review is preserved; dated 2026-10-18 source, Owner Supabase CSV and v0.14.0.60 isolated PostgreSQL evidence override explicitly selected items. No production payment or deployed-SHA signoff.',labels:roadmapEngineeringReview.labels,counts:reviewCounts},delegatedReview:{...delegatedReviewPolicy,counts:baselineCounts},delegatedBaseline,operationalBrief:roadmapOperationalBrief,productInventory,items:completeCatalog.map(item=>({...item,engineeringReview:reviewFor(item)})),custom,progress,limitations:'Delegated technical acceptance covers evidenced delivery, not commercial launch or fully tested systems. Supabase-saved Owner progress overrides this read-only baseline.'});
  }catch(err){
    const status=[400,401,403,404,405,409,413,503].includes(err?.status)?err.status:503;
    return reply({ok:false,error:err?.message||'Roadmap service unavailable.'},status);
  }
}
