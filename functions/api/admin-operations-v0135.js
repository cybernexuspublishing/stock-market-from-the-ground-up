/* v0.13.5 owner operations — narrowly allowlisted admin mutations.
   Historical Admin Control Center remains intact. Synthetic Showcase NEVER reads production tables. */
const response=(x,status=200)=>new Response(JSON.stringify(x),{status,headers:{'content-type':'application/json','cache-control':'no-store'}});
const str=x=>String(x??'').trim(),problem=(x,status=400)=>Object.assign(new Error(x),{status});
function cfg(env){const base=str(env.SUPABASE_URL).replace(/\/$/,''),pub=str(env.SUPABASE_PUBLISHABLE_KEY),secret=str(env.SUPABASE_SECRET_KEY);if(!base||!pub||!secret)throw problem('Admin configuration missing.',503);return{base,pub,secret}}
async function query(url,opt={}){const r=await fetch(url,{...opt,cache:'no-store'}),t=await r.text();if(!r.ok)throw problem('Administration operation failed.',r.status>=500?503:r.status);try{return t?JSON.parse(t):[];}catch{return []}}
async function db(env,path,{method='GET',body,prefer}={}){const c=cfg(env);return query(c.base+'/rest/v1/'+path,{method,headers:{apikey:c.secret,authorization:'Bearer '+c.secret,accept:'application/json',...(body!==undefined?{'content-type':'application/json'}:{}),...(prefer?{prefer}:{})},body:body===undefined?undefined:JSON.stringify(body)})}
async function identity(env,request){const token=/^Bearer\s+(.+)$/i.exec(request.headers.get('authorization')||'')?.[1];if(!token)throw problem('Sign in to the Control Center.',401);const c=cfg(env),u=await query(c.base+'/auth/v1/user',{headers:{apikey:c.pub,authorization:'Bearer '+token}});if(!u?.id)throw problem('Invalid staff session.',401);const [profile,rs]=await Promise.all([db(env,'profiles?select=account_kind&id=eq.'+encodeURIComponent(u.id)+'&limit=1'),db(env,'admin_user_roles?select=role_code,expires_at&user_id=eq.'+encodeURIComponent(u.id))]);const roles=rs.filter(x=>!x.expires_at||Date.parse(x.expires_at)>Date.now()).map(x=>x.role_code);const showcase=profile?.[0]?.account_kind==='showcase'||roles.includes('SHOWCASE_VIEWER');if(!showcase&&!roles.some(r=>['OWNER','ADMIN','TECH_ADMIN','CONTENT_MANAGER','LEARNING_MANAGER'].includes(r)))throw problem('Administrative access denied.',403);
let aal='';try{const raw=token.split('.')[1].replace(/-/g,'+').replace(/_/g,'/');aal=JSON.parse(atob(raw)).aal||''}catch{}return{user:u,roles,owner:roles.includes('OWNER'),showcase,aal}}
const allow=(x)=>/^[A-Z0-9_\-]{2,100}$/.test(str(x));
const LAB_BOOKS=new Set(['FOUNDATION_BOOK_1','FOUNDATION_BOOK_2','FOUNDATION_BOOK_3','DAY_TRADING_BOOK_1','READING_THE_TAPE','SITE_EXCLUSIVE']);
const synthetic={ok:true,synthetic:true,overview:{labs:419,skills:30,books:3,accounts:12,orders:8,notes:'Synthetic training display — no production counts or private data.'},labs:[{lab_id:'DEMO-L01',title:'Synthetic Historical Lab',active:true,registry_visible:true,public_sample:false}],features:[{feature_code:'DEMO_FEATURE',label:'Synthetic Feature',enabled:true}],cases:[],editions:[],campaigns:[]};
async function listing(env,action,bookCode='',page=0){if(action==='overview'){
  const [skills,books,events]=await Promise.all([
    db(env,'competency_definitions?select=competency_code,active&limit=100'),db(env,'catalog_products?select=product_code,product_type,active&limit=100'),db(env,'operations_events_v135?select=id,area,action,object_code,created_at&order=created_at.desc&limit=30')]);
  const book=str(bookCode).toUpperCase();const scoped=LAB_BOOKS.has(book);
  async function countFor(extra=''){if(!scoped)return null;const c=cfg(env);const u=c.base+'/rest/v1/platform_labs?select=lab_id&book_code=eq.'+encodeURIComponent(book)+extra;
    const resp=await fetch(u,{headers:{apikey:c.secret,authorization:'Bearer '+c.secret,prefer:'count=exact',range:'0-0'},cache:'no-store'});
    if(!resp.ok)throw problem('Unable to count the selected collection.',503);
    const match=(resp.headers.get('content-range')||'').match(/\/(\d+)$/);if(!match)throw problem('Lab count unavailable.',503);return Number(match[1]);}
  const [labs,activeLabs,registryLabs]=scoped?await Promise.all([countFor(),countFor('&active=eq.true'),countFor('&active=eq.true&registry_visible=eq.true')]):[null,null,null];
  return{overview:{labs,activeLabs,registryLabs,skills:skills.filter(x=>x.active).length,books:books.filter(x=>x.active&&x.product_type==='book').length,selectedBook:scoped?book:''},events};}
if(action==='labs'){
 const book=str(bookCode).toUpperCase();if(!LAB_BOOKS.has(book))throw problem('Select a book or Site-Exclusive Labs first.',400);
 if(!Number.isSafeInteger(page)||page<0||page>500)throw problem('Invalid page.',400);
 const perPage=50,rows=await db(env,'platform_labs?select=lab_id,title,book_code,lab_type,active,registry_visible,public_sample,sort_order&book_code=eq.'+encodeURIComponent(book)+'&order=sort_order.asc,lab_id.asc&limit='+String(perPage+1)+'&offset='+String(page*perPage));
 return{labs:rows.slice(0,perPage),bookCode:book,page,hasMore:rows.length>perPage};}

if(action==='features')return{features:await db(env,'site_feature_controls?select=feature_code,label,category,enabled,description&order=category.asc&limit=400')};
if(action==='cases')return{cases:await db(env,'competency_cases_v135?select=case_code,competency_code,title,description,active,reviewed_at,version,updated_at&order=created_at.desc&limit=200')};
if(action==='editions')return{editions:await db(env,'book_editions_v135?select=edition_code,product_code,edition_label,format,channel,asin,isbn,active,publication_status&order=edition_code.asc&limit=300')};
if(action==='campaigns')return{campaigns:await db(env,'book_activation_campaigns_v135?select=campaign_code,edition_code,active,label,max_activations&limit=200')};
throw problem('Unsupported admin view.',404)}
async function audit(env,actor,action,objectCode,summary){await db(env,'operations_events_v135',{method:'POST',prefer:'return=minimal',body:{actor_user_id:actor,area:'admin_operations',action,object_code:objectCode,metadata:summary}})}
async function change(env,a,action,b){if(a.showcase)throw problem('Showcase is always read-only.',403);if(env.REQUIRE_STAFF_AAL2_V135==='true'&&a.aal!=='aal2')throw problem('MFA verification is required while the Owner has enabled staff MFA.',403);
 if(action==='lab_update'){
  if(!a.roles.some(r=>['OWNER','ADMIN','LEARNING_MANAGER'].includes(r)))throw problem('Learning administration permission required.',403);
  const id=str(b.labId);if(!/^[A-Za-z0-9_-]{2,100}$/.test(id))throw problem('Invalid Lab ID.');const row={};for(const k of ['active','registry_visible','public_sample'])if(typeof b[k]==='boolean')row[k]=b[k];if(!Object.keys(row).length)throw problem('No valid Lab changes.');await db(env,'platform_labs?lab_id=eq.'+encodeURIComponent(id),{method:'PATCH',prefer:'return=minimal',body:row});await audit(env,a.user.id,action,id,row);return{saved:true};}
 if(action==='feature_update'){
  if(!a.owner)throw problem('OWNER authority is required.',403);const code=str(b.featureCode);if(!allow(code)||typeof b.enabled!=='boolean')throw problem('Invalid feature control.');
  // A legacy feature toggle must never bypass the later v0.13.5.4 security/commerce freeze.
  if(b.enabled&&/MFA|CAPTCHA|TURNSTILE|QR[_-]?ACTIVATION|DIRECT[_-]?DIGITAL|CHECKOUT|PAYMENT_GATE|BOOK_KEY_ISSUANCE/i.test(code))
    throw problem('Restricted commerce and security activation requires a separately approved deployment.',403);
  const row=(await db(env,'site_feature_controls?select=feature_code&feature_code=eq.'+encodeURIComponent(code)+'&limit=1'))?.[0];if(!row)throw problem('Unknown feature flag.',404);
  await db(env,'site_feature_controls?feature_code=eq.'+encodeURIComponent(code),{method:'PATCH',prefer:'return=minimal',body:{enabled:b.enabled}});await audit(env,a.user.id,action,code,{enabled:b.enabled});return{saved:true};}
 if(action==='case_create_draft'){
  if(!a.owner)throw problem('OWNER authority is required.',403);const code=str(b.caseCode).toUpperCase(),skill=str(b.competencyCode).toUpperCase(),title=str(b.title);if(!allow(code)||!allow(skill)||title.length<5||title.length>180)throw problem('Valid case code, competency and title required.');
  const questions=b.questions,keys=b.answerKey;
  if(!Array.isArray(questions)||questions.length<4||questions.length>40||typeof keys!=='object'||!keys||Array.isArray(keys))throw problem('Four or more approved dimension questions and answer keys required.');
  const ids=new Set(),dims=new Set(['knowledge','recognition','decision','process']);const observed=new Set();
  for(const q of questions){const id=str(q?.id),dim=str(q?.dimension);if(!/^[A-Za-z0-9_]{1,40}$/.test(id)||ids.has(id)||!dims.has(dim)||!Array.isArray(q.options)||q.options.length<2||q.options.length>6||str(q.prompt).length<5||str(q.prompt).length>800)throw problem('Invalid assessment question definition.');ids.add(id);observed.add(dim);if(!q.options.some(x=>str(x.code)===str(keys[id])))throw problem('Missing answer key for question '+id);}
  if(observed.size!==4||Object.keys(keys).length!==ids.size)throw problem('Every scoring dimension and exact answer key must be present.');
  await db(env,'competency_cases_v135',{method:'POST',prefer:'return=minimal',body:{case_code:code,competency_code:skill,title,description:str(b.description).slice(0,2000),questions,answer_key:keys,active:false,version:1}});
  await audit(env,a.user.id,action,code,{competencyCode:skill,questionCount:questions.length,draft:true});return{saved:true,draft:true};}
 if(action==='case_publish'){
  if(!a.owner)throw problem('OWNER authority is required.',403);const code=str(b.caseCode).toUpperCase();if(!allow(code)||b.confirmPhrase!=='PUBLISH VERIFIED RUBRIC')throw problem('Explicit rubric signoff required.');const rows=await db(env,'competency_cases_v135?select=case_code,questions,answer_key,reviewed_at&case_code=eq.'+encodeURIComponent(code)+'&limit=1');const c=rows?.[0];if(!c||!Array.isArray(c.questions)||c.questions.length<4||!c.answer_key||Object.keys(c.answer_key).length!==c.questions.length)throw problem('Case is incomplete.');
  if(new Set(c.questions.map(q=>q.dimension)).size!==4)throw problem('Missing scoring dimensions.');
  await db(env,'competency_cases_v135?case_code=eq.'+encodeURIComponent(code),{method:'PATCH',prefer:'return=minimal',body:{active:true,reviewed_at:new Date().toISOString(),reviewed_by:a.user.id}});await audit(env,a.user.id,action,code,{verified:true});return{saved:true,published:true};}
 if(action==='case_retire'){
  if(!a.owner)throw problem('OWNER required.',403);const code=str(b.caseCode).toUpperCase();if(!allow(code))throw problem('Invalid case code.');await db(env,'competency_cases_v135?case_code=eq.'+encodeURIComponent(code),{method:'PATCH',prefer:'return=minimal',body:{active:false}});await audit(env,a.user.id,action,code,{active:false});return{saved:true};}
 throw problem('Unsupported administrative change.',404);
}
export async function onRequest({request,env}){try{const a=await identity(env,request),action=str(new URL(request.url).searchParams.get('action'));if(env.REQUIRE_STAFF_AAL2_V135==='true'&&!a.showcase&&a.aal!=='aal2')throw problem('Verified administrator MFA is required.',403);
 if(request.method==='GET'){if(a.showcase)return response({...synthetic,requested:action});return response({ok:true,staffMfaRequired:env.REQUIRE_STAFF_AAL2_V135==='true',...await listing(env,action,new URL(request.url).searchParams.get('bookCode')||'',Number(new URL(request.url).searchParams.get('page')||0))})}
 if(request.method==='POST'){if(a.showcase)return response({ok:false,error:'SHOWCASE is read-only.'},403);const b=await request.json().catch(()=>({}));return response({ok:true,...await change(env,a,action,b)})}
 return response({ok:false,error:'Unsupported method.'},405);
 }catch(e){return response({ok:false,error:e.message||'Admin request failed.'},e.status||500)}}
