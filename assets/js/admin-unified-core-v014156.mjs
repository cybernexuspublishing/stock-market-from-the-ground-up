/* Deployment 16 Stage A: one declarative Admin registry and read-only API boundary.
 * No provider activation, price mutation, entitlement grant, or customer write.
 * Existing editing modules remain on /admin.html until individually migrated.
 */
export const MODULES=Object.freeze([
 {id:'overview',label:'Dashboard',group:'Overview',order:10,permission:'dashboard.view',action:'dashboard',collection:'summary',kind:'record',legacy:'#dashboard'},
 {id:'members',label:'Members',group:'People',order:10,permission:'users.view',action:'users',collection:'users',kind:'members',legacy:'#users'},
 {id:'roles',label:'Roles & Access',group:'People',order:20,permission:'roles.view',action:'roles',collection:'roles',kind:'roles',legacy:'#roles'},
 {id:'labs',label:'Labs & Question Bank',group:'Learning',order:10,permission:'content.view',kind:'link',href:'/training-editor.html'},
 {id:'tutor',label:'Tutor Operations',group:'Learning',order:20,permission:'content.view',kind:'link',href:'/admin.html#content'},
 {id:'bootcamp',label:'30-Day Bootcamp',group:'Learning',order:30,permission:'content.view',kind:'link',href:'/admin-operations.html'},
 {id:'products',label:'Products & Books',group:'Commerce',order:10,permission:'catalog.view',action:'catalog',collection:'products',kind:'products',legacy:'#products'},
 {id:'billing',label:'Orders & Subscriptions',group:'Commerce',order:20,permission:'commerce.view',action:'commerce',collection:'orders',kind:'billing',legacy:'#commerce'},
 {id:'reports',label:'Market Commons Reports',group:'Community',order:10,permission:'forum.view',action:'forum',collection:'reports',kind:'reports',legacy:'#community'},
 {id:'communications',label:'Communications',group:'Community',order:20,permission:'forum.view',kind:'link',href:'/admin.html#community'},
 {id:'settings',label:'Site Settings',group:'Platform',order:10,permission:'settings.view',kind:'link',href:'/admin.html#settings'},
 {id:'audit',label:'Audit Log',group:'Platform',order:20,permission:'audit.view',action:'audit',collection:'entries',kind:'audit',legacy:'#audit'},
 {id:'system',label:'System Readiness',group:'Platform',order:30,permission:'system.view',action:'system',collection:'integrations',kind:'system',legacy:'#system'}
].map(x=>Object.freeze(x)));
export const GROUPS=Object.freeze(['Overview','People','Learning','Commerce','Community','Platform']);
const ACTIONS=new Set(['context','dashboard','users','user_detail','roles','catalog','commerce','forum','audit','system']);
const PARAMS=Object.freeze({users:['page','per_page','q'],user_detail:['id'],audit:['page','limit']});
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function authorized(mod,ctx){
 return !!(ctx&&Array.isArray(ctx.permissions)&&ctx.permissions.includes('control_panel.access')&&ctx.permissions.includes(mod.permission));
}
export function resolveRoute(hash,ctx){
 const id=String(hash||'').replace(/^#/,'');
 const m=MODULES.find(x=>x.id===id&&authorized(x,ctx));
 return m||MODULES.find(x=>authorized(x,ctx))||null;
}
export function createAdminClient({getToken,transport=fetch}){
 if(typeof getToken!=='function'||typeof transport!=='function')throw Error('Authenticated client required');
 return async function adminRead(action,{signal,params={}}={}){
  if(!ACTIONS.has(action))throw Error('Unsupported read-only Admin action');
  // Reject invalid module parameters BEFORE contacting privileged APIs.
  const entries=Object.entries(params||{});
  if(entries.some(([key,value])=>!(PARAMS[action]||[]).includes(key)||value==null||String(value).length>200))
   throw Error('Unsupported Admin read parameter.');
  if(action==='user_detail'&&(entries.length!==1||!UUID.test(String(params.id||''))))
   throw Error('Invalid member identifier.');
  for(const [key,value] of entries){
   if(['page','per_page','limit'].includes(key)&&(!/^[0-9]{1,6}$/.test(String(value))||Number(value)<1||Number(value)>10000))
    throw Error('Invalid Admin pagination value.');
  }
  const token=await getToken();
  if(!token)throw Error('Administrator session expired. Sign in again.');
  const url=new URL('/api/admin','https://admin.internal');
  url.searchParams.set('action',action);
  for(const [k,v] of Object.entries(params)){
   if(!/^[a-z][a-z0-9_]{0,30}$/i.test(k)||v==null)throw Error('Invalid search parameter');
   url.searchParams.set(k,String(v).slice(0,200));
  }
  const res=await transport(url.pathname+url.search,{method:'GET',headers:{authorization:'Bearer '+token,accept:'application/json'},cache:'no-store',credentials:'same-origin',signal});
  if(!res.ok)throw Error(res.status===401||res.status===403?'Administrator access is unavailable.':'Admin request failed ('+res.status+').');
  const data=await res.json();
  if(!data||data.ok!==true)throw Error(typeof data?.error==='string'?data.error:'Admin response unavailable.');
  return data;
 };
}
function present(v){return v==null?'Unavailable':String(v).slice(0,180);}
export function readRows(mod,data){
 if(mod.kind==='record')return Object.entries(data.summary||{}).slice(0,25).map(([k,v])=>({title:k,detail:present(v)}));
 if(mod.kind==='members')return (data.users||[]).slice(0,50).map(u=>({title:present(u.profile?.username||u.email||'Member'),detail:present(u.flag?.status||'Status unavailable')}));
 if(mod.kind==='roles')return (data.roles||[]).slice(0,50).map(v=>({title:present(v.name||v.role_code),detail:present(v.description||'No description')}));
 if(mod.kind==='products')return (data.products||[]).slice(0,50).map(v=>({title:present(v.short_title||v.product_code),detail:present(v.title||'Product')}));
 if(mod.kind==='billing')return [...(data.orders||[]).slice(0,25).map(v=>({title:'Order '+present(v.id),detail:'Status: '+present(v.status)})),...(data.subscriptions||[]).slice(0,25).map(v=>({title:'Subscription '+present(v.plan_code),detail:'Status: '+present(v.status)}))];
 if(mod.kind==='reports')return (data.reports||[]).slice(0,50).map(v=>({title:present(v.content_type)+' report',detail:present(v.status)+': '+present(v.reason)}));
 if(mod.kind==='audit')return (data.entries||[]).slice(0,50).map(v=>({title:present(v.action),detail:present(v.created_at)}));
 if(mod.kind==='system')return Object.entries(data.integrations||{}).slice(0,40).map(([k,v])=>({title:k,detail:v?'Configured (not a live-health check)':'Not configured'}));
 return [];
}
