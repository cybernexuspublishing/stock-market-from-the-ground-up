import {checkMutationOrigin,boundedForumJson} from '../_lib/forum-request-guards-v014105.js';

/* Free, Owner-only social marketing operations.
 * NO outbound X/Stripe/Meta API calls, paid requests, automatic scheduling or claims of provider verification.
 * Provider publishing remains a separate, disabled capability.
 */
const response=(body,status=200)=>new Response(JSON.stringify(body),{
 status,headers:{'content-type':'application/json','cache-control':'no-store','x-content-type-options':'nosniff'}
});
const err=(message,status=400)=>Object.assign(new Error(message),{status});
const val=x=>String(x??'').trim();
const isUUID=x=>typeof x==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(x);
const tables=Object.freeze({
 posts:'gu_social_posts_v014276',communities:'gu_social_communities_v014276',
 campaigns:'gu_social_campaigns_v014278',templates:'gu_social_templates_v014278',
 tasks:'gu_social_tasks_v014278',metrics:'gu_social_metrics_v014278',
 revisions:'gu_social_post_revisions_v014278',audit:'gu_social_audit_v014276'
});
function config(env){
 const base=val(env.SUPABASE_URL).replace(/\/$/,''),secret=val(env.SUPABASE_SECRET_KEY),pub=val(env.SUPABASE_PUBLISHABLE_KEY);
 if(!/^https:\/\/[a-z0-9]{20}\.supabase\.co$/.test(base)||!secret||!pub)throw err('Social data service unavailable.',503);
 const headers={apikey:secret,accept:'application/json'};
 if(/^eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(secret))headers.authorization='Bearer '+secret;
 return {base,pub,headers};
}
async function db(c,path,method='GET',body){
 const headers={...c.headers,prefer:'return=representation'};
 if(body!==undefined)headers['content-type']='application/json';
 const r=await fetch(c.base+'/rest/v1/'+path,{method,headers,
  body:body===undefined?undefined:JSON.stringify(body),cache:'no-store'});
 if(!r.ok)throw err('Social data service rejected the operation.',503);
 return r.status===204?[]:r.json();
}
async function authenticate(c,request){
 const jwt=/^Bearer\s+([^\s]+)$/i.exec(request.headers.get('authorization')||'')?.[1];
 if(!jwt)throw err('Owner sign-in required.',401);
 const res=await fetch(c.base+'/auth/v1/user',{headers:{apikey:c.pub,authorization:'Bearer '+jwt},cache:'no-store'});
 if(!res.ok)throw err('Valid Owner session required.',401);
 const user=await res.json();if(!isUUID(user.id))throw err('Invalid user session.',401);
 const [roles,profiles,flags]=await Promise.all([
  db(c,'admin_user_roles?select=role_code,expires_at&user_id=eq.'+user.id),
  db(c,'profiles?select=account_kind,deleted_at&id=eq.'+user.id+'&limit=1'),
  db(c,'admin_user_flags?select=status&user_id=eq.'+user.id+'&limit=1')
 ]);
 const active=x=>!x.expires_at||Date.parse(x.expires_at)>Date.now();
 if(profiles?.[0]?.account_kind!=='member'||profiles?.[0]?.deleted_at||
  ['suspended','restricted'].includes(flags?.[0]?.status)||
  roles?.some(x=>x.role_code==='SHOWCASE_VIEWER'&&active(x))||
  !roles?.some(x=>x.role_code==='OWNER'&&active(x)))throw err('Owner authority required.',403);
 return user.id;
}
function bounded(input,min,max,name){const x=val(input);if(x.length<min||x.length>max)throw err(name+' must be '+min+'–'+max+' characters.');return x}
function among(input,choices,name){const x=val(input);if(!choices.includes(x))throw err('Invalid '+name+'.');return x}
function date(input,name){if(input===undefined||input===null||input==='')return null;
 if(typeof input!=='string'||!Number.isFinite(Date.parse(input)))throw err('Invalid '+name+'.');
 return new Date(input).toISOString();
}
function https(input,name,hosts){
 if(input===undefined||input===null||input==='')return null;
 try{const u=new URL(input);
  if(u.protocol!=='https:'||u.username||u.password||u.port||u.href.length>1000||
    !u.hostname.includes('.')||u.hostname.toLowerCase()==='localhost'||
    /(^|\.)internal$|\.local$/.test(u.hostname)||/^127\.|^10\.|^192\.168\./.test(u.hostname)||
    (hosts&&!hosts.includes(u.hostname.toLowerCase())))throw Error('not approved');
  return u.href;
 }catch{throw err('Invalid '+name+' HTTPS URL.')}
}
function xStatus(url){
 const u=https(url,'published X post',['x.com','twitter.com']);
 if(!u||!/^https:\/\/(x\.com|twitter\.com)\/SMFGUAcademy\/status\/[0-9]+$/.test(u))throw err('Enter an exact @SMFGUAcademy post URL.');
 return u;
}
function version(data){if(!Number.isSafeInteger(data.version)||data.version<1)throw err('Expected record version required.');return data.version}
function post(data,actor){
 const body=bounded(data.body,1,280,'X post');
 const status=among(data.status||'draft',['draft','approved','planned','archived'],'post status');
 const planned_at=status==='planned'?date(data.plannedAt,'planned time'):null;
 if(status==='planned'&&!planned_at)throw err('Planned posts require a time.');
 if(data.campaignId!==undefined&&data.campaignId!==null&&data.campaignId!==''&&!isUUID(data.campaignId))throw err('Invalid campaign.');
 return {body,platform:'x',status,planned_at,external_url:null,
  campaign_id:data.campaignId||null,approved_by:['approved','planned'].includes(status)?actor:null,
  approved_at:['approved','planned'].includes(status)?new Date().toISOString():null,
  updated_at:new Date().toISOString()};
}
function community(data){
 const name=bounded(data.name,2,120,'Community name');
 const url=https(data.communityUrl,'X community',['x.com','twitter.com']);
 if(!url||!/^https:\/\/(x\.com|twitter\.com)\/i\/communities\/[0-9]+$/.test(url))throw err('Enter an exact X Community URL.');
 return {platform:'x',name,community_url:url,notes:bounded(data.notes||'',0,2000,'Notes'),
  membership_status:among(data.membershipStatus||'unknown',
   ['unknown','not_joined','requested','joined','declined','left'],'membership'),
  promotion_policy:among(data.promotionPolicy||'unverified',
   ['unverified','allowed','restricted','prohibited'],'promotion rule'),
  updated_at:new Date().toISOString()};
}
function campaign(data){
 const starts_at=date(data.startsAt,'campaign start'),ends_at=date(data.endsAt,'campaign end');
 if(starts_at&&ends_at&&new Date(ends_at)<=new Date(starts_at))throw err('Campaign end must follow start.');
 return {title:bounded(data.title,3,120,'Campaign title'),
  objective:bounded(data.objective||'',0,500,'Campaign objective'),
  category:among(data.category||'education',['education','founding600','bootcamp','labs','books','tools','brand'],'category'),
  destination_url:https(data.destinationUrl,'campaign destination'),
  state:among(data.state||'draft',['draft','active','paused','archived'],'campaign state'),
  starts_at,ends_at,updated_at:new Date().toISOString()};
}
function template(data){
 return {name:bounded(data.name,3,100,'Template name'),
  category:among(data.category||'education',['education','founding600','bootcamp','labs','books','tools','brand'],'category'),
  body:bounded(data.body,1,280,'X template'),
  updated_at:new Date().toISOString()};
}
function task(data){
 return {title:bounded(data.title,3,180,'Task title'),details:bounded(data.details||'',0,2000,'Details'),
  kind:among(data.kind||'follow_up',['follow_up','engagement','community_review','publication_review','support'],'task kind'),
  state:among(data.state||'open',['open','in_progress','completed','cancelled'],'task state'),
  due_at:date(data.dueAt,'task date'),target_url:https(data.targetUrl,'task link'),
  updated_at:new Date().toISOString()};
}
async function save(c,table,actor,data,payload,{requireVersion=false}={}){
 if(data.id!==undefined&&!isUUID(data.id))throw err('Invalid record identifier.');
 let path=table,method='POST';
 if(data.id){
  path+='?id=eq.'+encodeURIComponent(data.id)+'&owner_id=eq.'+actor;
  method='PATCH';
  if(requireVersion){const expected=version(data);payload.version=expected+1;path+='&version=eq.'+expected}
 }else payload.owner_id=actor;
 const records=await db(c,path,method,payload);
 if(!Array.isArray(records)||records.length!==1)
  throw err(data.id?'Record changed, no longer exists, or requires a reload.':'Unable to save record.',data.id?409:503);
 return records[0];
}
async function ownedPost(c,actor,id){
 const rows=await db(c,tables.posts+'?select=id,status,owner_id,version,external_url&owner_id=eq.'+actor+'&id=eq.'+encodeURIComponent(id)+'&limit=1');
 if(!Array.isArray(rows)||rows.length!==1)throw err('Post not found.',404);
 return rows[0];
}
async function list(c,table,actor,cols='*',order='updated_at.desc',limit=100){
 return db(c,table+'?select='+cols+'&owner_id=eq.'+actor+'&order='+order+'&limit='+limit);
}
async function snapshot(c,actor){
 const [posts,communities,campaigns,templates,tasks,metrics,audit]=await Promise.all([
  list(c,tables.posts,actor,'id,body,status,planned_at,external_url,campaign_id,version,approved_at,created_at,updated_at'),
  list(c,tables.communities,actor,'id,name,community_url,membership_status,promotion_policy,notes,last_verified_at,updated_at'),
  list(c,tables.campaigns,actor,'id,title,objective,destination_url,category,state,starts_at,ends_at,created_at,updated_at'),
  list(c,tables.templates,actor,'id,name,body,category,created_at,updated_at'),
  list(c,tables.tasks,actor,'id,title,details,kind,state,due_at,target_url,updated_at'),
  list(c,tables.metrics,actor,'id,post_id,observed_at,views,likes,replies,reposts,link_clicks,source','observed_at.desc'),
  db(c,tables.audit+'?select=action,resource_type,resource_id,details,created_at&actor=eq.'+actor+'&order=created_at.desc&limit=50')
 ]);
 return {ok:true,account:{platform:'x',handle:'@SMFGUAcademy',connectionStatus:'manual_only',apiPublishingEnabled:false,
  platformApiSpendingLimitCents:0},posts,communities,campaigns,templates,tasks,metrics,audit};
}
function metric(data,actor){
 if(!isUUID(data.postId))throw err('Select a published post.');
 const result={owner_id:actor,post_id:data.postId,source:'owner_manual',observed_at:new Date().toISOString()};
 for(const key of ['views','likes','replies','reposts','link_clicks']){
  const x=data[key];
  if(x===undefined||x===null||x==='')result[key]=null;
  else if(!Number.isSafeInteger(x)||x<0||x>1000000000)throw err('Metric '+key+' must be a nonnegative integer.');
  else result[key]=x;
 }
 if(Object.values(result).every(x=>x===null))throw err('At least one metric is required.');
 return result;
}
export async function onRequest({request,env}){
 try{
  if(!['GET','POST'].includes(request.method))return response({ok:false,error:'Method not allowed.'},405);
  const c=config(env),actor=await authenticate(c,request);
  if(request.method==='GET')return response(await snapshot(c,actor));
  checkMutationOrigin(request);
  const data=await boundedForumJson(request,12000);
  let saved;
  if(data.action==='save_post'){
   saved=await save(c,tables.posts,actor,data,post(data,actor),{requireVersion:true});
  }else if(data.action==='record_manual_post'){
   if(!isUUID(data.id))throw err('Select a post.');
   const previous=await ownedPost(c,actor,data.id);
   if(!['approved','planned'].includes(previous.status))throw err('Approve the post before recording publication.',409);
   const expected=version(data);
   if(expected!==previous.version)throw err('Post changed. Reload before recording publication.',409);
   saved=await save(c,tables.posts,actor,data,{
    status:'manual_recorded',external_url:xStatus(data.externalUrl),version:expected+1,
    updated_at:new Date().toISOString()
   },{requireVersion:false});
  }else if(data.action==='save_community'){
   saved=await save(c,tables.communities,actor,data,community(data));
  }else if(data.action==='save_campaign'){
   saved=await save(c,tables.campaigns,actor,data,campaign(data));
  }else if(data.action==='save_template'){
   saved=await save(c,tables.templates,actor,data,template(data));
  }else if(data.action==='save_task'){
   saved=await save(c,tables.tasks,actor,data,task(data));
  }else if(data.action==='record_metrics'){
   const post=await ownedPost(c,actor,data.postId);
   if(post.status!=='manual_recorded')throw err('Manual metrics require a recorded published post.',409);
   saved=await save(c,tables.metrics,actor,{},metric(data,actor));
  }else throw err('Unknown social operation.');
  // External providers are never contacted. A pasted X URL remains Owner reported.
  return response({ok:true,record:saved,publicationVerified:false},data.id?200:201);
 }catch(e){
  return response({ok:false,error:e?.status&&e.status<500?e.message:'Social management temporarily unavailable.'},e?.status||503);
 }
}
