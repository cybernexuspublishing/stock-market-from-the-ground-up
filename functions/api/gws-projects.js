/* Owner-only GWS safe draft editor: revisioned transactional saves and restores.
 * This endpoint never serves a public client website or issues membership grants. */
const H={'content-type':'application/json; charset=utf-8','cache-control':'private, no-store'},send=(x,s=200)=>new Response(JSON.stringify(x),{status:s,headers:H}),err=(m,s=400)=>Object.assign(new Error(m),{status:s});
function cfg(env){const base=String(env.SUPABASE_URL||'').replace(/\/$/,''),pub=env.SUPABASE_PUBLISHABLE_KEY,secret=env.SUPABASE_SECRET_KEY;if(!base||!pub||!secret)throw err('Configuration unavailable.',503);return{base,pub,secret}}
async function json(url,init){const r=await fetch(url,{...init,cache:'no-store'}),t=await r.text();if(!r.ok){let msg='Database contract unavailable';try{const j=JSON.parse(t);if(j.message?.includes('revision conflict'))throw err('Draft changed. Reload before editing.',409)}catch(e){if(e.status)throw e}throw err(msg,503)}return t?JSON.parse(t):[]}
async function db(env,path,method='GET',body){const c=cfg(env);return json(c.base+'/rest/v1/'+path,{method,headers:{apikey:c.secret,authorization:'Bearer '+c.secret,accept:'application/json',...(body===undefined?{}:{'content-type':'application/json',prefer:'return=representation'})},body:body===undefined?undefined:JSON.stringify(body)})}
async function owner(env,req){const token=/^Bearer\s+(.+)$/i.exec(req.headers.get('authorization')||'')?.[1];if(!token)throw err('Sign in required.',401);const c=cfg(env),u=await json(c.base+'/auth/v1/user',{headers:{apikey:c.pub,authorization:'Bearer '+token}});const [p,r,flags]=await Promise.all([db(env,'profiles?select=account_kind&id=eq.'+encodeURIComponent(u.id)+'&limit=1'),db(env,'admin_user_roles?select=role_code,expires_at&user_id=eq.'+encodeURIComponent(u.id)),db(env,'admin_user_flags?select=status&user_id=eq.'+encodeURIComponent(u.id)+'&limit=1')]);if(['suspended','restricted'].includes(String(flags[0]?.status||'').toLowerCase()))throw err('Account access is restricted.',403);if(p[0]?.account_kind!=='member'||!r.some(x=>x.role_code==='OWNER'&&(!x.expires_at||Date.parse(x.expires_at)>Date.now())))throw err('OWNER role required.',403);if(env.REQUIRE_STAFF_AAL2_V135==='true'){let aal='';try{aal=JSON.parse(atob(token.split('.')[1].replace(/-/g,'+').replace(/_/g,'/'))).aal}catch{}if(aal!=='aal2')throw err('Staff MFA required.',403)}return u.id}
const code=x=>String(x||'').toUpperCase().trim();
export async function onRequest({request,env}){try{const actor=await owner(env,request);
 if(request.method==='GET'){
  const u=new URL(request.url),history=code(u.searchParams.get('history'));
  if(history){if(!/^[A-Z][A-Z0-9_]{2,63}$/.test(history))throw err('Invalid project code.');
   const project=(await db(env,'gws_client_drafts_v014?select=id&project_code=eq.'+encodeURIComponent(history)+'&limit=1'))?.[0];
   if(!project)return send({ok:false,error:'Project not found.'},404);
   const revisions=await db(env,'gws_client_draft_revisions_v0143?select=revision_number,created_at,actor_user_id&project_id=eq.'+project.id+'&order=revision_number.desc&limit=100');
   return send({ok:true,revisions,publishingEnabled:false});}
  const rows=await db(env,'gws_client_drafts_v014?select=id,project_code,label,contact_label,status,page_title,page_summary,page_blocks,revision_number,updated_at&order=updated_at.desc&limit=100');
  return send({ok:true,projects:rows,publishingEnabled:false});
 }
 if(request.method!=='POST')return send({ok:false,error:'Method not allowed.'},405);
 const b=await request.json().catch(()=>null);if(!b||JSON.stringify(b).length>50000)throw err('Invalid project payload.');
 const action=b.action||'save',projectCode=code(b.projectCode),expected=Number(b.expectedRevision);
 if(!/^[A-Z][A-Z0-9_]{2,63}$/.test(projectCode)||!Number.isSafeInteger(expected)||expected<0)throw err('Invalid code or expected revision.');
 if(action==='restore'){
  const revision=Number(b.revision);if(!Number.isSafeInteger(revision)||revision<1)throw err('Invalid revision.');
  const restored=await db(env,'rpc/v0143_gws_restore','POST',{p_actor:actor,p_code:projectCode,p_revision:revision,p_expected:expected});
  return send(restored);
 }
 if(action!=='save')throw err('Unsupported action.');
 const label=String(b.label||'').trim(),title=String(b.pageTitle||'').trim(),summary=String(b.pageSummary||'').trim(),contact=String(b.contactLabel||'').trim();
 if(label.length<3||label.length>120||title.length<3||title.length>150||summary.length>1500||contact.length>120)throw err('Invalid project metadata.');
 if(!Array.isArray(b.pageBlocks)||b.pageBlocks.length>40||b.pageBlocks.some(x=>!x||!['heading','paragraph','callout'].includes(x.type)||typeof x.text!=='string'||x.text.length>2000))throw err('Invalid content blocks.');
 const saved=await db(env,'rpc/v0143_gws_save','POST',{p_actor:actor,p_code:projectCode,p_label:label,p_contact:contact,p_title:title,p_summary:summary,p_blocks:b.pageBlocks,p_expected:expected});
 return send({...saved,notice:'Private draft saved with a recoverable revision. No client website has been published.'});
}catch(e){return send({ok:false,error:e.message||'Project request failed.'},e.status||500)}}
