/* v0.13.4.2 security repair; preserve Market Commons guide operations. */
const J={'content-type':'application/json; charset=utf-8','cache-control':'no-store'};
const out=(x,s=200)=>new Response(JSON.stringify(x),{status:s,headers:J});
const clean=v=>String(v??'').trim();
function cfg(env){const url=clean(env.SUPABASE_URL).replace(/\/$/,''),pub=clean(env.SUPABASE_PUBLISHABLE_KEY),secret=clean(env.SUPABASE_SECRET_KEY);if(!url||!pub||!secret)throw Object.assign(new Error('Supabase environment incomplete.'),{status:503});return{url,pub,secret}}
async function jf(url,opt={}){const r=await fetch(url,opt),t=await r.text();let d={};try{d=t?JSON.parse(t):{}}catch{d={raw:t}}if(!r.ok)throw Object.assign(new Error(d.message||d.error||t||`HTTP ${r.status}`),{status:r.status});return d}
function bearer(r){const h=r.headers.get('authorization')||'';return /^Bearer\s+/i.test(h)?h.replace(/^Bearer\s+/i,'').trim():''}
async function caller(env,req){const tok=bearer(req);if(!tok)throw Object.assign(new Error('Authentication required.'),{status:401});const{url,pub}=cfg(env),user=await jf(`${url}/auth/v1/user`,{headers:{apikey:pub,authorization:`Bearer ${tok}`}});return{tok,user}}
async function rest(env,path,{method='GET',body,prefer}={}){const{url,secret}=cfg(env),h={apikey:secret,authorization:`Bearer ${secret}`,accept:'application/json'};if(body!==undefined)h['content-type']='application/json';if(prefer)h.prefer=prefer;return jf(`${url}/rest/v1/${path}`,{method,headers:h,body:body===undefined?undefined:JSON.stringify(body)})}
async function activeRoles(env,uid){const rows=await rest(env,`admin_user_roles?select=role_code,expires_at&user_id=eq.${encodeURIComponent(uid)}`);return(rows||[]).filter(x=>!x.expires_at||new Date(x.expires_at)>new Date()).map(x=>x.role_code)}
async function requirePermission(env,req,permission){
  const c=await caller(env,req),roles=await activeRoles(env,c.user.id);
  if(roles.includes('SHOWCASE_VIEWER'))throw Object.assign(new Error('Showcase Mode is read-only; operational mutations are blocked.'),{status:403});
  const profiles=await rest(env,`profiles?select=account_kind&id=eq.${encodeURIComponent(c.user.id)}&limit=1`);
  if(profiles?.some(x=>x.account_kind==='showcase'))throw Object.assign(new Error('Showcase Mode is read-only.'),{status:403});
  if(roles.includes('OWNER'))return{...c,roles};
  if(!roles.length)throw Object.assign(new Error('Control Center access required.'),{status:403});
  const grants=await rest(env,`admin_role_permissions?select=role_code&permission_code=eq.${encodeURIComponent(permission)}`);
  if(!(grants||[]).some(x=>roles.includes(x.role_code)))throw Object.assign(new Error(`Permission required: ${permission}`),{status:403});
  return{...c,roles};
}
async function audit(env,actor,action,targetType,targetId,details={}){try{await rest(env,'admin_audit_log',{method:'POST',prefer:'return=minimal',body:{actor_user_id:actor,action,target_type:targetType,target_id:String(targetId||''),details}})}catch{}}
export async function onRequest({request,env}){const u=new URL(request.url),action=clean(u.searchParams.get('action'));try{
  if(action==='commons_topic_save'&&request.method==='POST'){
    const c=await requirePermission(env,request,'forum.moderate'),b=await request.json();
    const id=Number(b.id)||null,forumCode=clean(b.forumCode).toUpperCase(),title=clean(b.title),body=clean(b.body);
    if(!forumCode||!title||!body)return out({error:'Sub-forum, title, and guide body are required.'},400);
    if(title.length>180)return out({error:'Guide title is too long.'},400);
    if(body.length>50000)return out({error:'Guide body is too long.'},400);
    const forum=(await rest(env,`commons_forums?select=forum_code&forum_code=eq.${encodeURIComponent(forumCode)}&limit=1`))?.[0];
    if(!forum)return out({error:'Sub-forum not found.'},404);
    const now=new Date().toISOString();
    if(id){
      const existing=(await rest(env,`commons_topics?select=id,is_official&id=eq.${id}`))?.[0];
      if(!existing)return out({error:'Topic not found.'},404);
      await rest(env,`commons_topics?id=eq.${id}`,{method:'PATCH',prefer:'return=minimal',body:{forum_code:forumCode,title,body,is_official:true,is_pinned:!!b.isPinned,is_locked:!!b.isLocked,status:'published',author_label:'Official Platform Guide',updated_at:now,last_post_at:now}});
      await audit(env,c.user.id,'commons.guide.update','commons_topic',id,{forumCode,title});
      return out({ok:true,id});
    }
    const rows=await rest(env,'commons_topics',{method:'POST',prefer:'return=representation',body:{forum_code:forumCode,author_user_id:c.user.id,author_label:'Official Platform Guide',title,body,ticker:null,status:'published',is_pinned:b.isPinned!==false,is_locked:!!b.isLocked,is_official:true,reply_count:0,created_at:now,updated_at:now,last_post_at:now}});
    const created=Array.isArray(rows)?rows[0]:rows,id2=created?.id;
    await audit(env,c.user.id,'commons.guide.create','commons_topic',id2,{forumCode,title});
    return out({ok:true,id:id2});
  }
  return out({error:'Unknown admin v0.13.3 action.'},404);
}catch(e){return out({error:e.message||'Admin request failed.'},e.status||500)}}
