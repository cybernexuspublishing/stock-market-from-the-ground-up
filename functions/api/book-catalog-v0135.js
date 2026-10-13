/* v0.13.5 Admin publishing metadata, never manuscript editing or direct checkout activation.
 * Read-only synthetic catalog for SHOWCASE_VIEWER. Writes are role + AAL2 protected,
 * default OFF until owner verifies production security, publishing and KDP controls. */
const reply=(x,status=200)=>new Response(JSON.stringify(x),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});
const clean=x=>String(x??'').trim();
const code=x=>/^[A-Z0-9_]{3,90}$/.test(x);
function envCfg(env){const url=clean(env.SUPABASE_URL).replace(/\/$/,''),pub=clean(env.SUPABASE_PUBLISHABLE_KEY),secret=clean(env.SUPABASE_SECRET_KEY);if(!url||!pub||!secret)throw Object.assign(new Error('Catalog administration is unavailable.'),{status:503});return{url,pub,secret}}
async function jf(url,init){const r=await fetch(url,{...init,cache:'no-store'}),s=await r.text();if(!r.ok)throw Object.assign(new Error('Catalog administration failed.'),{status:r.status===401?401:503});return s?JSON.parse(s):[]}
async function rest(env,path,{method='GET',body,prefer}={}){const c=envCfg(env);return jf(c.url+'/rest/v1/'+path,{method,headers:{apikey:c.secret,authorization:'Bearer '+c.secret,accept:'application/json',...(body===undefined?{}:{'content-type':'application/json'}),...(prefer?{prefer}:{})},body:body===undefined?undefined:JSON.stringify(body)})}
async function identity(env,request){const jwt=/^Bearer\s+(.+)$/i.exec(request.headers.get('authorization')||'')?.[1];if(!jwt)throw Object.assign(new Error('Sign in required.'),{status:401});const c=envCfg(env),u=await jf(c.url+'/auth/v1/user',{headers:{apikey:c.pub,authorization:'Bearer '+jwt}});
 if(!u?.id)throw Object.assign(new Error('Authentication failed.'),{status:401});const [profile,roles]=await Promise.all([
 rest(env,'profiles?select=account_kind&id=eq.'+encodeURIComponent(u.id)+'&limit=1'),rest(env,'admin_user_roles?select=role_code,expires_at&user_id=eq.'+encodeURIComponent(u.id))]);
 const active=roles.filter(r=>!r.expires_at||Date.parse(r.expires_at)>Date.now()).map(r=>r.role_code);
 const showcase=profile[0]?.account_kind==='showcase'||active.includes('SHOWCASE_VIEWER');
 if(!showcase&&!active.some(r=>['OWNER','ADMIN','CONTENT_MANAGER'].includes(r)))throw Object.assign(new Error('Staff permissions required.'),{status:403});
 let aal='';try{const raw=jwt.split('.')[1].replace(/-/g,'+').replace(/_/g,'/');aal=JSON.parse(atob(raw)).aal||''}catch{};
 return{id:u.id,showcase,roles:active,aal};}
const mockCatalog=[{product_code:'FOUNDATION_BOOK_1',title:'Foundations Book I',short_title:'Foundations I',description:'Synthetic demonstration record',kdp_select:true,direct_digital_enabled:false,direct_physical_enabled:false},{product_code:'FOUNDATION_BOOK_2',title:'Foundations Book II',short_title:'Foundations II',description:'Synthetic demonstration record',kdp_select:true,direct_digital_enabled:false,direct_physical_enabled:false},{product_code:'FOUNDATION_BOOK_3',title:'Foundations Book III',short_title:'Foundations III',description:'Synthetic demonstration record',kdp_select:true,direct_digital_enabled:false,direct_physical_enabled:false}];
const urlOrNull=x=>{const v=clean(x);if(!v)return null;try{const u=new URL(v);if(u.protocol!=='https:'||v.length>1024)throw Error();return v}catch{throw Object.assign(new Error('Purchase URLs must use HTTPS and be at most 1,024 characters.'),{status:400})}};
export async function onRequest({request,env}){try{
 const who=await identity(env,request),flag=env.ENABLE_BOOK_CATALOG_EDITS_V135==='true';
 if(request.method==='GET'){
  if(who.showcase)return reply({ok:true,synthetic:true,writesEnabled:false,products:mockCatalog,editions:[],campaigns:[],note:'Only synthetic publishing records are displayed.'});
  if(env.REQUIRE_STAFF_AAL2_V135==='true'&&who.aal!=='aal2')return reply({ok:false,error:'Complete MFA verification before accessing the Control Center.',mfaRequired:true},403);
  const [products,editions,campaigns]=await Promise.all([
   rest(env,'catalog_products?select=product_code,product_type,title,short_title,description,author,publisher,active,kdp_select,direct_digital_enabled,direct_physical_enabled,amazon_kindle_url,amazon_paperback_url,amazon_hardcover_url,metadata,updated_at&order=sort_order.asc'),
   rest(env,'book_editions_v135?select=edition_code,product_code,edition_label,format,channel,asin,isbn,publication_status,active,updated_at&order=edition_code.asc'),
   rest(env,'book_activation_campaigns_v135?select=campaign_code,edition_code,active,label,max_activations,updated_at&order=campaign_code.asc')]);
  return reply({ok:true,synthetic:false,writesEnabled:flag&&(env.REQUIRE_STAFF_AAL2_V135!=='true'||who.aal==='aal2')&&who.roles.some(r=>['OWNER','ADMIN'].includes(r)),products,editions,campaigns});
 }
 if(request.method!=='POST')return reply({ok:false,error:'Unsupported method.'},405);
 if(who.showcase)return reply({ok:false,error:'Showcase is read-only.'},403);
 if(!flag)return reply({ok:false,error:'Catalog edits are disabled until production verification.'},503);
 if(!who.roles.some(r=>['OWNER','ADMIN'].includes(r))||(env.REQUIRE_STAFF_AAL2_V135==='true'&&who.aal!=='aal2'))return reply({ok:false,error:'Owner/Admin role and configured authentication assurance are required.'},403);
 const body=await request.json().catch(()=>null);if(!body||JSON.stringify(body).length>16000)return reply({ok:false,error:'Invalid request.'},400);
 const action=new URL(request.url).searchParams.get('action')||'';
 if(action==='update_book'){
  const productCode=clean(body.productCode).toUpperCase();if(!code(productCode))return reply({ok:false,error:'Invalid product code.'},400);
  const product=(await rest(env,'catalog_products?select=product_code,product_type,kdp_select&product_code=eq.'+encodeURIComponent(productCode)+'&limit=1'))?.[0];
  if(!product||product.product_type!=='book')return reply({ok:false,error:'Book product not found.'},404);
  const title=clean(body.title),shortTitle=clean(body.shortTitle),description=clean(body.description);
  if(title.length<5||title.length>240||shortTitle.length<3||shortTitle.length>120||description.length<40||description.length>12000)return reply({ok:false,error:'Title (5–240), short title (3–120), and description (40–12,000) required.'},400);
  const patch={title,short_title:shortTitle,description,amazon_kindle_url:urlOrNull(body.amazonKindleUrl),amazon_paperback_url:urlOrNull(body.amazonPaperbackUrl),amazon_hardcover_url:urlOrNull(body.amazonHardcoverUrl),updated_at:new Date().toISOString()};
  // Explicitly forbid writes to kdp_select, direct_digital_enabled and physical checkout here.
  await rest(env,'catalog_products?product_code=eq.'+encodeURIComponent(productCode),{method:'PATCH',body:patch,prefer:'return=minimal'});
  try{await rest(env,'admin_audit_log',{method:'POST',body:{actor_user_id:who.id,action:'book_catalog.v135.metadata_update',target_type:'product',target_id:productCode,details:{fields:Object.keys(patch),kdp_protection_preserved:true}},prefer:'return=minimal'})}catch{}
  return reply({ok:true,productCode,notice:'Catalog metadata updated. KDP and checkout controls unchanged.'});
 }
 return reply({ok:false,error:'Unsupported catalog operation.'},404);
}catch(e){return reply({ok:false,error:e.message||'Catalog request failed.'},e.status||500)}}
