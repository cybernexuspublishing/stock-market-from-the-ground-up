import {checkMutationOrigin,boundedForumJson,isForumId} from '../_lib/forum-request-guards-v014105.js';
/* v0.14.0.15: permission-gated moderation of member topics and replies in both forum systems. */
const H={'content-type':'application/json; charset=utf-8','cache-control':'private, no-store'};
const send=(j,s=200)=>new Response(JSON.stringify(j),{status:s,headers:H});const clean=x=>String(x??'').trim(),fail=(x,s=400)=>Object.assign(new Error(x),{status:s});
const idok=x=>isForumId(Number(x));
function config(e){const url=clean(e.SUPABASE_URL).replace(/\/$/,''),pub=clean(e.SUPABASE_PUBLISHABLE_KEY),secret=clean(e.SUPABASE_SECRET_KEY);if(!url||!pub||!secret)throw fail('Configuration missing.',503);return{url,pub,secret}}
async function fetchJSON(url,opts={}){const r=await fetch(url,{...opts,cache:'no-store'}),j=await r.json().catch(()=>({}));if(!r.ok)throw fail(r.status===401?'Authentication expired.':'Forum moderation backend unavailable.',r.status===401?401:503);return j}
async function db(c,path,{method='GET',body,prefer}={}){const h={apikey:c.secret,accept:'application/json'};if(/^eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(c.secret))h.authorization='Bearer '+c.secret;return fetchJSON(c.url+'/rest/v1/'+path,{method,headers:{...h,...(body!==undefined?{'content-type':'application/json'}:{}),...(prefer?{prefer}:{})},body:body===undefined?undefined:JSON.stringify(body)})}
async function staff(c,request){const tok=(request.headers.get('authorization')||'').match(/^Bearer\s+(.+)$/i)?.[1];if(!tok)throw fail('Sign in first.',401);const u=await fetchJSON(c.url+'/auth/v1/user',{headers:{apikey:c.pub,authorization:'Bearer '+tok}}),id=encodeURIComponent(u.id);
 const [profiles,flags,roles]=await Promise.all([db(c,`profiles?select=account_kind&id=eq.${id}&limit=1`),db(c,`admin_user_flags?select=status&user_id=eq.${id}&limit=1`),db(c,`admin_user_roles?select=role_code,expires_at&user_id=eq.${id}&limit=30`)]);
 if(profiles[0]?.account_kind!=='member'||['restricted','suspended'].includes(clean(flags[0]?.status).toLowerCase()))throw fail('Production staff account required.',403);
 const r=(roles||[]).filter(x=>!x.expires_at||Date.parse(x.expires_at)>Date.now()).map(x=>x.role_code);
 if(r.includes('SHOWCASE_VIEWER'))throw fail('Showcase has no moderation authority.',403);
 if(!r.includes('OWNER')){const roleList=r.filter(x=>/^[A-Z0-9_]+$/.test(x));if(!roleList.length)throw fail('Staff permission required.',403);const p=await db(c,`admin_role_permissions?select=role_code&permission_code=eq.forum.moderate&role_code=in.(${roleList.join(',')})&limit=50`);if(!p.length)throw fail('Forum moderation permission required.',403)}return {uid:u.id,owner:r.includes('OWNER')};}
export async function onRequest({request,env}){try{const c=config(env),user=await staff(c,request),url=new URL(request.url);if(request.method==='GET'){const scope=clean(url.searchParams.get('scope')),type=clean(url.searchParams.get('type')),id=Number(url.searchParams.get('id'));if(!['legacy','commons'].includes(scope)||!['topic','post'].includes(type)||!idok(id))throw fail('Invalid lookup.');const target={legacy:{topic:'forum_topics',post:'forum_posts'},commons:{topic:'commons_topics',post:'commons_posts'}}[scope][type];const projection='id,status,updated_at,body'+(type==='topic'?',title,is_locked,is_pinned'+(scope==='commons'?',is_official':''):'');const row=(await db(c,`${target}?select=${projection}&id=eq.${id}&limit=1`))[0];if(!row)throw fail('Content not found.',404);if(row.is_official&&!user.owner)throw fail('Official guides require Owner review.',403);return send({ok:true,content:{id,status:row.status,version:row.updated_at,title:row.title||null,body:clean(row.body).slice(0,10000),locked:!!row.is_locked,pinned:!!row.is_pinned,official:!!row.is_official}})}if(request.method!=='POST')return send({error:'Method not allowed.'},405);
 checkMutationOrigin(request);const b=await boundedForumJson(request,16000);const scope=clean(b.scope),type=clean(b.type),action=clean(b.action),id=Number(b.id);if(!['legacy','commons'].includes(scope)||!['topic','post'].includes(type)||!idok(id))throw fail('Invalid forum target.');const tables={legacy:{topic:'forum_topics',post:'forum_posts'},commons:{topic:'commons_topics',post:'commons_posts'}},table=tables[scope][type];
 if(!['edit','hide','restore','delete','lock','unlock','pin','unpin'].includes(action)||type==='post'&&!['edit','hide','restore','delete'].includes(action))throw fail('Unsupported moderation action.');
 const fields='id,status,updated_at'+(type==='topic'?',is_locked,is_pinned'+(scope==='commons'?',is_official':''):'');const old=(await db(c,`${table}?select=${fields}&id=eq.${id}&limit=1`))[0];if(!old)throw fail('Content not found.',404);if(old.is_official&&!user.owner)throw fail('Only Owner can moderate official guides.',403);
 if(action==='edit'&&!['published','hidden'].includes(old.status))throw fail('Only published or hidden content may be edited.',409);if(action==='restore'&&!['hidden','deleted'].includes(old.status))throw fail('This content is not hidden.',409);if(action==='restore'&&old.status==='deleted'&&!user.owner)throw fail('Only Owner may restore content deleted by its author.',403);if(action==='hide'&&old.status!=='published')throw fail('Only published content can be hidden.',409);if(action==='delete'&&b.confirmation!=='DELETE')throw fail('Type DELETE to confirm.',400);
 if(!clean(b.version)||clean(b.version)!==clean(old.updated_at))throw fail('Content changed; refresh its moderation details.',409);
 const note=clean(b.note);if(note.length<5||note.length>500)throw fail('Moderation requires a 5–500 character reason.');
 let newBody=null,newTitle=null;
 if(action==='edit'){
  newBody=clean(b.body);const limit=scope==='legacy'?(type==='topic'?12000:8000):10000;
  if(newBody.length<(type==='topic'?10:2)||newBody.length>limit)throw fail('Content must satisfy the forum text-length limits.');
  if(type==='topic'){newTitle=clean(b.title);if(newTitle.length<5||newTitle.length>(scope==='legacy'?140:180))throw fail('Discussion title must satisfy the forum title limits.');}
 }
 // Do not restore the old PATCH + separate audit INSERT code. Even if a
 // front-end version race passes, a failed audit must roll back the update.
 // The RPC re-verifies staff role, record version, status, official/Owner
 // protection and performs row-locked mutation + audit in ONE transaction.
 const result=await db(c,'rpc/gu_v014113_moderate_with_audit',{method:'POST',body:{
  p_actor:user.uid,p_scope:scope,p_type:type,p_id:id,p_action:action,
  p_version:clean(b.version),p_note:note,p_body:newBody,p_title:newTitle,
  p_confirmation:action==='delete'?'DELETE':null
 }});
 if(result?.ok!==true){
  const reason=String(result?.reason||'').toLowerCase();
  if(['conflict','invalid_version'].includes(reason))throw fail('Forum content changed; refresh moderation details.',409);
  if(reason==='not_found')throw fail('Content no longer exists.',404);
  if(reason==='denied')throw fail('Current moderation permissions do not allow this action.',403);
  if(reason==='invalid_request')throw fail('Forum content or moderation reason is invalid.',400);
  throw fail('Atomic moderation and audit could not be verified.',503);
 }
 if(result.atomic!==true||result.auditRecorded!==true)throw fail('Moderation audit transaction did not confirm success.',503);
 return send({ok:true,action,auditRecorded:true,atomic:true});
}catch(e){return send({ok:false,error:e.message||'Moderation failed.'},[400,401,403,404,405,409,413].includes(e.status)?e.status:503)}}
