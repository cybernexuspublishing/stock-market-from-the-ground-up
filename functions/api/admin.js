const allowedPrelaunchStoreCodesV014175 = new Set(["FOUNDING_30","FOUNDING_60","BC-05-TRUTH","BC-07-WATCH","BC-10-SCAN","BC-30-CORE","BC-45-CHART","BC-60-RISK","BC-90-PRACT","SC-07-CANDLE","SC-10-TAPE","SC-10-VWAP","SC-07-NEWS","SC-07-EDGAR","SC-10-SIZING","SC-07-BREAK","SC-07-JOURNAL","SPARKS_10","SPARKS_30","SPARKS_75","ONDEMAND_TRAINING","DISCOVERY_LAB","SCANNER_BUILDER","WATCHLIST_WORKBENCH","CATALYST_RESEARCH","FLOAT_SUPPLY_LAB","MARKET_STRUCTURE_LAB","MULTI_TIMEFRAME_LAB","RISK_POSITION_LAB","EXECUTION_LAB","LIQUIDITY_SPREAD_LAB","HALT_SSR_LAB","PATTERN_FAILURE_LIBRARY","ORDER_FLOW_TAPE_LAB","MARKET_CONTEXT_LAB","TRADE_REVIEW_REPLAY","STRATEGY_VALIDATION","OPTIONS_LAB"]);
const JSON_HEADERS={"content-type":"application/json; charset=utf-8","cache-control":"no-store"};
const out=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:JSON_HEADERS});
const bad=(message,status=400,extra={})=>out({ok:false,error:message,...extra},status);
const ok=(data={})=>out({ok:true,...data});
const clean=(v)=>String(v??'').trim();
const safeCode=(v)=>clean(v).toUpperCase().replace(/[^A-Z0-9_\-]/g,'_').slice(0,80);
const nowIso=()=>new Date().toISOString();

function serviceHeaders(value){
 const secret=clean(value);
 if(secret.startsWith('sb_secret_'))return {apikey:secret};
 if(/^eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(secret))
  return {apikey:secret,authorization:'Bearer '+secret};
 throw new Error('Supabase service key is unavailable or malformed.');
}

function envConfig(env){
  const url=clean(env.SUPABASE_URL).replace(/\/$/,'');
  const pub=clean(env.SUPABASE_PUBLISHABLE_KEY);
  const secret=clean(env.SUPABASE_SECRET_KEY);
  if(!url||!pub||!secret)throw new Error('Supabase server environment is incomplete.');
  return {url,pub,secret};
}
function bearer(request){const h=request.headers.get('authorization')||'';return h.startsWith('Bearer ')?h.slice(7):''}
async function jbody(request){try{return await request.json()}catch{return {}}}
async function rawFetch(url,opts={}){const r=await fetch(url,opts);let data=null;const text=await r.text();if(text){try{data=JSON.parse(text)}catch{data=text}}if(!r.ok){const msg=(data&&typeof data==='object'&&(data.message||data.msg||data.error_description||data.error))||text||`HTTP ${r.status}`;throw Object.assign(new Error(String(msg)),{status:r.status,data})}return {response:r,data}}
async function serviceRest(env,path,{method='GET',body,prefer,headers={}}={}){const {url,secret}=envConfig(env);const h={...serviceHeaders(secret),accept:'application/json',...headers};if(body!==undefined)h['content-type']='application/json';if(prefer)h.prefer=prefer;return rawFetch(`${url}/rest/v1/${path}`,{method,headers:h,body:body===undefined?undefined:JSON.stringify(body)})}
async function caller(env,request){const token=bearer(request);if(!token)throw Object.assign(new Error('Authentication required.'),{status:401});const {url,pub}=envConfig(env);const {data}=await rawFetch(`${url}/auth/v1/user`,{headers:{apikey:pub,authorization:`Bearer ${token}`}});return {token,user:data}}
async function adminAuth(env,path,{method='GET',body}={}){const {url,secret}=envConfig(env);const headers={...serviceHeaders(secret),accept:'application/json'};if(body!==undefined)headers['content-type']='application/json';return rawFetch(`${url}/auth/v1/admin/${path}`,{method,headers,body:body===undefined?undefined:JSON.stringify(body)})}
async function countTable(env,table,filter=''){const {url,secret}=envConfig(env);const r=await fetch(`${url}/rest/v1/${table}?select=*${filter?`&${filter}`:''}`,{headers:{...serviceHeaders(secret),prefer:'count=exact',range:'0-0'}});if(!r.ok)return null;const cr=r.headers.get('content-range')||'';const m=cr.match(/\/(\d+|\*)$/);return m&&m[1]!=='*'?Number(m[1]):null}
async function roleContext(env,userId){
  const enc=encodeURIComponent(userId);
  const {data:urs}=await serviceRest(env,`admin_user_roles?select=role_code,expires_at&user_id=eq.${enc}`);
  const active=(urs||[]).filter(r=>!r.expires_at||new Date(r.expires_at).getTime()>Date.now());
  const roles=[...new Set(active.map(r=>r.role_code))];
  if(!roles.length)return {roles:[],permissions:[]};
  // An existing JWT does not override a subsequent account restriction.
  const [profile,flag]=await Promise.all([
    one(env,`profiles?select=account_kind,deleted_at&id=eq.${enc}&limit=1`),
    one(env,`admin_user_flags?select=status&user_id=eq.${enc}&limit=1`)
  ]);
  if(!profile||profile.deleted_at||['restricted','suspended'].includes(clean(flag?.status).toLowerCase()))
    return {roles:[],permissions:[]};
  if(roles.includes('SHOWCASE_VIEWER')){
    if(roles.length!==1||profile.account_kind!=='showcase')return {roles:[],permissions:[]};
  }else if(profile.account_kind!=='member')return {roles:[],permissions:[]};
  const inRoles=roles.map(r=>`"${r.replace(/"/g,'')}"`).join(',');
  const {data:rps}=await serviceRest(env,`admin_role_permissions?select=permission_code&role_code=in.(${encodeURIComponent(inRoles)})`);
  return {roles,permissions:[...new Set((rps||[]).map(x=>x.permission_code))]};
}
// Safe, bounded query numbers for Admin identity and audit paging.
// Invalid query strings do not reach privileged GoTrue/PostgREST endpoints.
function adminPageInt(value,{fallback=1,min=1,max=10000}={}){
 if(value===null||value===undefined||value==='')return fallback;
 const text=String(value);
 if(!/^[0-9]{1,7}$/.test(text))throw Object.assign(new Error('Invalid administrative page or limit.'),{status:400});
 const v=Number(text);
 if(!Number.isSafeInteger(v)||v<min||v>max)
  throw Object.assign(new Error('Administrative page or limit is outside the supported range.'),{status:400});
 return v;
}
function has(ctx,p){return ctx.permissions.includes(p)}
async function withContext(env,request,permission){const c=await caller(env,request);const ctx=await roleContext(env,c.user.id);if(!has(ctx,'control_panel.access')||(permission&&!has(ctx,permission)))throw Object.assign(new Error('Administrative permission denied.'),{status:403});return {...c,ctx}}
async function audit(env,actor,action,targetType,targetId,details={}){try{await serviceRest(env,'admin_audit_log',{method:'POST',prefer:'return=minimal',body:{actor_user_id:actor||null,action,target_type:targetType||null,target_id:targetId==null?null:String(targetId),details}})}catch{}}
async function one(env,path){const {data}=await serviceRest(env,path);return Array.isArray(data)?(data[0]||null):data}
async function tableRows(env,table,select='*',extra=''){const {data}=await serviceRest(env,`${table}?select=${encodeURIComponent(select)}${extra}`);return data||[]}
function assertHttpsOrBlank(v,label){const s=clean(v);if(!s)return '';if(!/^https:\/\//i.test(s))throw new Error(`${label} must use https://`);return s}
function showcaseRows(action,url){
  const now=nowIso(),ago=d=>new Date(Date.now()-d*86400000).toISOString();
  const fakeUsers=[
    {id:'showcase-user-001',email:'alex.demo@example.test',created_at:ago(120),last_sign_in_at:ago(1),banned_until:null,profile:{id:'showcase-user-001',username:'AlexDemo',display_name:'AlexDemo',session_timeout_minutes:30},flag:null,roles:[]},
    {id:'showcase-user-002',email:'casey.annual@example.test',created_at:ago(75),last_sign_in_at:ago(2),banned_until:null,profile:{id:'showcase-user-002',username:'CaseyAnnual',display_name:'CaseyAnnual',session_timeout_minutes:60},flag:null,roles:['MODERATOR']},
    {id:'showcase-user-003',email:'jordan.free@example.test',created_at:ago(14),last_sign_in_at:ago(4),banned_until:null,profile:{id:'showcase-user-003',username:'JordanFree',display_name:'JordanFree',session_timeout_minutes:30},flag:{status:'active'},roles:[]}
  ];
  if(action==='dashboard')return ok({summary:{users:1284,library:3471,orders:842,subscriptions:613,openReports:4,auditEntries:18942,catalogProducts:5,publishedContent:87,activeEntitlements:907},roles:['SHOWCASE_VIEWER'],showcase:true});
  if(action==='users')return ok({users:fakeUsers,page:1,perPage:100,showcase:true});
  if(action==='user_detail')return ok({user:{id:'showcase-user-001',email:'alex.demo@example.test',created_at:ago(120),last_sign_in_at:ago(1)},profile:{id:'showcase-user-001',username:'AlexDemo',display_name:'AlexDemo',first_name:'Alex',last_name:'Demo',account_kind:'member'},flag:{status:'active'},notes:[{id:1,note:'Synthetic support note for showcase presentation.',note_type:'support',created_at:ago(3)}],roles:[],library:[{id:1,product_code:'FOUNDATION_BOOK_1',access_type:'companion',granted_at:ago(90)}],entitlements:[{product_key:'full_learning_access',status:'active',starts_at:ago(90)}],orders:[{id:1001,status:'paid',total_cents:6999,created_at:ago(30)}],subscriptions:[{id:501,plan_code:'FULL_MONTHLY',status:'active',current_period_end:new Date(Date.now()+15*86400000).toISOString()}],planGrants:[{id:1,plan_code:'FULL_MONTHLY',status:'active',starts_at:ago(90),ends_at:null}],toolPasses:[],activity:{journalCount:18,labAttemptCount:42},showcase:true});
  if(action==='roles')return ok({roles:[{role_code:'OWNER',name:'Owner / Super Admin',priority:1,is_system:true,is_assignable:false},{role_code:'ADMIN',name:'Administrator',priority:10,is_system:true,is_assignable:true},{role_code:'MODERATOR',name:'Moderator',priority:30,is_system:true,is_assignable:true},{role_code:'SHOWCASE_VIEWER',name:'Showcase Viewer',priority:90,is_system:true,is_assignable:true}],permissions:[{permission_code:'dashboard.view',category:'Dashboard',name:'View dashboard',risk_level:'low'},{permission_code:'users.view',category:'Accounts',name:'View users',risk_level:'standard'},{permission_code:'catalog.view',category:'Catalog',name:'View catalog',risk_level:'low'}],rolePermissions:[{role_code:'SHOWCASE_VIEWER',permission_code:'dashboard.view'},{role_code:'SHOWCASE_VIEWER',permission_code:'users.view'},{role_code:'SHOWCASE_VIEWER',permission_code:'catalog.view'}],showcase:true});
  if(action==='catalog')return ok({products:[
    {product_code:'FOUNDATION_BOOK_1',product_type:'book',family:'foundations',title:'The Stock Market: From the Ground Up — Foundations Book I',short_title:'Foundations Book I',active:true,publication_status:'publication_candidate',store_visible:true,kdp_select:true,companion_access:true,sort_order:10},
    {product_code:'FOUNDATION_BOOK_2',product_type:'book',family:'foundations',title:'The Stock Market: From the Ground Up — Foundations Book II',short_title:'Foundations Book II',active:true,publication_status:'publication_candidate',store_visible:true,kdp_select:true,companion_access:true,sort_order:20},
    {product_code:'FOUNDATION_BOOK_3',product_type:'book',family:'foundations',title:'The Stock Market: From the Ground Up — Foundations Book III',short_title:'Foundations Book III',active:true,publication_status:'publication_candidate',store_visible:true,kdp_select:true,companion_access:true,sort_order:30},
    {product_code:'DAY_TRADING_BOOK_1',product_type:'book',family:'day_trading',title:'Day Trading Book 1',short_title:'Day Trading Book 1',active:true,publication_status:'in_development',store_visible:true,kdp_select:false,companion_access:true,sort_order:40},
    {product_code:'READING_THE_TAPE',product_type:'book',family:'reading_the_tape',title:'Reading the Tape',short_title:'Reading the Tape',active:true,publication_status:'in_development',store_visible:true,kdp_select:false,companion_access:true,sort_order:50}
  ],showcase:true});
  if(action==='settings')return ok({settings:[{setting_key:'site.version',category:'site',value:'0.13.4',public_read:true,description:'Synthetic showcase setting.'},{setting_key:'commerce.checkout_enabled',category:'commerce',value:false,public_read:false,description:'Checkout master switch.'}],showcase:true});
  if(action==='content')return ok({content:[{content_code:'WELCOME',content_type:'announcement',title:'Welcome to the Platform',summary:'Synthetic showcase content.',body:'This is synthetic showcase content.',status:'published',sort_order:10,updated_at:now}],showcase:true});
  if(action==='commerce')return ok({orders:[{id:1001,user_id:'showcase-user-001',status:'paid',currency:'USD',total_cents:6999,created_at:ago(3)},{id:1002,user_id:'showcase-user-002',status:'paid',currency:'USD',total_cents:69900,created_at:ago(12)}],subscriptions:[{id:501,user_id:'showcase-user-001',plan_code:'FULL_MONTHLY',status:'active',current_period_end:new Date(Date.now()+15*86400000).toISOString()},{id:502,user_id:'showcase-user-002',plan_code:'FULL_ANNUAL',status:'active',current_period_end:new Date(Date.now()+210*86400000).toISOString()}],showcase:true});
  if(action==='forum')return ok({topics:[{id:101,title:'How to separate a breakout trigger from the reason for entry',ticker:'DEMO',status:'published',is_pinned:true,is_locked:false,author_id:'showcase-user-002',created_at:ago(5),updated_at:ago(1)}],posts:[{id:201,topic_id:101,body:'Synthetic discussion reply.',status:'published',author_id:'showcase-user-001',created_at:ago(1),updated_at:ago(1)}],reports:[],showcase:true});
  if(action==='audit')return ok({entries:[{id:1,actor_user_id:'showcase-owner',action:'catalog.save',target_type:'product',target_id:'FOUNDATION_BOOK_1',details:{showcase:true},created_at:ago(1)},{id:2,actor_user_id:'showcase-admin',action:'support.reply',target_type:'ticket',target_id:'SUP-DEMO-001',details:{showcase:true},created_at:ago(2)}],showcase:true});
  if(action==='system')return ok({integrations:{supabaseUrl:true,publishableKey:true,secretKey:true,bootstrapEmailConfigured:true,workersAI:true,paymentWebhookSecret:true},runtime:'Cloudflare Pages Functions — SHOWCASE',secretsExposed:false,showcase:true});
  if(action==='platform')return ok({plans:[{plan_code:'FREE',name:'Free Membership',price_cents:0,billing_interval:'none',ad_free:false,active:true},{plan_code:'FULL_MONTHLY',name:'Monthly Membership',price_cents:6999,billing_interval:'month',ad_free:false,active:true},{plan_code:'FULL_ANNUAL',name:'Annual Membership',price_cents:69900,billing_interval:'year',ad_free:false,active:true},{plan_code:'LIFETIME',name:'Lifetime Membership',price_cents:249900,billing_interval:'lifetime',ad_free:true,active:true}],tools:[{tool_code:'MARKET_SIMULATOR',name:'Advanced Market Simulator & Replay',category:'Trade Lab',status:'live',individual_price_cents:2999,active:true},{tool_code:'JOURNAL_ANALYTICS',name:'Trading Journal & Performance Analytics',category:'Trade Lab',status:'live',individual_price_cents:2999,active:true},{tool_code:'CATALYST_RESEARCH',name:'Catalyst & Filing Research Lab',category:'Research',status:'live',individual_price_cents:2999,active:true}],planTools:[],showcase:true});
  if(action==='ads')return ok({advertisers:[{id:1,name:'Example Brokerage Education',status:'active',website_url:'https://example.test'}],placements:[{placement_code:'HOME_INLINE',name:'Home — Sponsor',active:true,sort_order:10},{placement_code:'FREE_DASHBOARD',name:'Dashboard — Sponsor',active:true,sort_order:20}],campaigns:[{id:1,advertiser_id:1,name:'Fall Learning Campaign',status:'active',billing_model:'cpm',budget_cents:250000,updated_at:now}],creatives:[{id:1,campaign_id:1,placement_code:'HOME_INLINE',status:'active',headline:'Synthetic Sponsor Creative',destination_url:'https://example.test',updated_at:now}],adPolicies:[{access_code:'FREE',label:'Free Membership',ads_enabled:true,max_impressions_per_session:3,max_impressions_per_24h:6,minimum_minutes_between_ads:5},{access_code:'LIFETIME',label:'Lifetime Membership',ads_enabled:false,max_impressions_per_session:0,max_impressions_per_24h:0,minimum_minutes_between_ads:0}],metrics:{impressions:128420,clicks:2147},showcase:true});
  if(action==='marketdata')return ok({providers:[{provider_code:'TIINGO_BYO',name:'Tiingo',status:'live',hours:'Provider dependent',active:true},{provider_code:'ALPACA_BYO',name:'Alpaca',status:'beta',hours:'Provider dependent',active:true}],datasets:[{dataset_code:'DEMO_NVDA_2024',title:'NVDA Historical Teaching Dataset',ticker:'NVDA',provider_code:'ALPACA_BYO',dataset_type:'ohlcv',interval_label:'1m',status:'verified',updated_at:now}],envelopes:[{envelope_code:'DEMO_NVDA_BREAKOUT',title:'NVDA Breakout Context',ticker:'NVDA',dataset_code:'DEMO_NVDA_2024',multi_day_runner:false,status:'verified',updated_at:now}],showcase:true});
  if(action==='inventory')return ok({books:[{product_code:'FOUNDATION_BOOK_1',short_title:'Foundations Book I',title:'Foundations Book I',publication_status:'publication_candidate',active:true,sort_order:10},{product_code:'READING_THE_TAPE',short_title:'Reading the Tape',title:'Reading the Tape',publication_status:'in_development',active:true,sort_order:50}],tools:[{tool_code:'MARKET_SIMULATOR',name:'Advanced Market Simulator & Replay',category:'Trade Lab',status:'live',active:true,public_visible:true,sort_order:10}],labs:[{lab_id:'DT-SHOWCASE-001',title:'Breakout Recognition — Showcase',active:true,registry_visible:true,sort_order:10}],placements:[{placement_code:'HOME_INLINE',name:'Home — Sponsor',active:true,sort_order:10}],navItems:[{item_code:'TOP_COMMONS',label:'Market Commons',active:true,public_visible:true,sort_order:10}],officialPosts:[{post_code:'GUIDE_BREAKOUT',title:'Breakouts — What, Why, When, How',status:'published',public_visible:true,sort_order:10}],adPolicies:[],showcase:true});
  return ok({showcase:true});
}

async function handleGet(env,request,action,url){
  if(action==='context'){
    const c=await caller(env,request);const ctx=await roleContext(env,c.user.id);const ownerCount=await countTable(env,'admin_user_roles','role_code=eq.OWNER');const bootstrapEmail=clean(env.ADMIN_BOOTSTRAP_EMAIL).toLowerCase();return ok({user:{id:c.user.id,email:c.user.email},roles:ctx.roles,permissions:ctx.permissions,bootstrapAvailable:ctx.roles.length===0&&ownerCount===0&&!!bootstrapEmail&&clean(c.user.email).toLowerCase()===bootstrapEmail});
  }
  const sc=await caller(env,request),scCtx=await roleContext(env,sc.user.id);if(scCtx.roles.includes('SHOWCASE_VIEWER'))return showcaseRows(action,url);
  if(action==='store_product_release_check'){
    const c=await withContext(env,request,'catalog.view');
    if(!c.ctx.roles.includes('OWNER'))return bad('Owner authorization required.',403);
    const sku=clean(url.searchParams.get('sku')).toUpperCase();
    if(!allowedPrelaunchStoreCodesV014175.has(sku))return bad('Product not registered for this release workflow.',404);
    const item=await one(env,'store_product_overrides_v014175?select=sku,lifecycle,store_visible,version&sku=eq.'+encodeURIComponent(sku)+'&limit=1');
    // Unknown external acceptance is a blocker, never an implicit pass.
    const blockers=[
      'Approved product-specific Stripe price and current environment mapping not verified',
      'Content, historical-data rights, independent assessments and accessibility not accepted',
      'Server-owned fulfillment and entitlement delivery not accepted',
      'Refund, cancellation and applicable tax treatment not accepted',
      'Signed-webhook lifecycle, idempotency and real-member test acceptance not verified',
      'Owner LIVE payment authorization intentionally not granted by this workflow'
    ];
    if(!item?.store_visible)blockers.unshift('Product visibility or current draft has not been published');
    return ok({sku,version:item?.version||0,lifecycle:item?.lifecycle||'coming_soon',
      checkout_ready:false,can_enable_live_payments:false,blockers});
  }
  if(action==='store_product_overrides'){
    const c=await withContext(env,request,'catalog.view');
    if(!c.ctx.roles.includes('OWNER'))return bad('Owner authorization required.',403);
    const {data}=await serviceRest(env,'store_product_overrides_v014175?select=sku,title,description,store_visible,lifecycle,version,updated_at&order=sku.asc');
    return ok({items:data||[]});
  }
  if(action==='dashboard'){
    const c=await withContext(env,request,'dashboard.view');
    // Each operational count comes from its existing authoritative table.
    // A failing source stays null; absence of data is never reported as zero.
    const [users,library,orders,subs,reports,auditCount,catalog,content,
      pendingLabReviews,draftAssessments,founderOccupied,academyActive,
      openSupportTickets,currentDigitalEditions]=await Promise.all([
      countTable(env,'profiles'),
      countTable(env,'user_library'),
      countTable(env,'site_orders'),
      countTable(env,'site_subscriptions'),
      countTable(env,'forum_reports','status=eq.open'),
      countTable(env,'admin_audit_log'),
      countTable(env,'catalog_products'),
      countTable(env,'managed_content','status=eq.published'),
      countTable(env,'lab_instruction_v014','reviewed_at=is.null'),
      countTable(env,'lab_training_sets_v014','review_state=eq.draft'),
      countTable(env,'gu_founder_members_v014173','revoked_at=is.null'),
      countTable(env,'gu_bootcamp_academy_enrollments_v014168','status=eq.active'),
      countTable(env,'support_tickets','status=in.(new,open,assigned,in_progress,waiting_member,waiting_staff,escalated)'),
      countTable(env,'gu_digital_versions_v014303','current=eq.true')
    ]);
    // Bounded record-level queue. Sensitive records are fetched only for the
    // corresponding existing server-side permission. A failed query is not zero.
    const queueSpecs=[
      {category:'Learning',severity:'warning',permission:'content.view',table:'lab_instruction_v014',select:'lab_id,updated_at',filter:'reviewed_at=is.null',target:'training-review',kind:'instruction'},
      {category:'Assessments',severity:'warning',permission:'content.view',table:'lab_training_sets_v014',select:'lab_id,version,updated_at',filter:'review_state=eq.draft',target:'training-review',kind:'assessment'},
      {category:'Community',severity:'warning',permission:'forum.view',table:'forum_reports',select:'id,status,created_at',filter:'status=eq.open',target:'community',kind:'report'},
      {category:'Support',severity:'warning',permission:'users.view',table:'support_tickets',select:'id,ticket_number,status,priority,created_at',filter:'status=in.(new,open,assigned,in_progress,waiting_member,waiting_staff,escalated)',target:'users',kind:'ticket'}
    ];
    const queueResults=await Promise.all(queueSpecs.filter(spec=>has(c.ctx,spec.permission)||spec.permission==='content.view'&&has(c.ctx,'learning.manage')).map(async spec=>{
      try{
        const order=spec.kind==='instruction'||spec.kind==='assessment'?'updated_at':'created_at';
        const rows=await tableRows(env,spec.table,spec.select,`&${spec.filter}&order=${order}.desc&limit=4`);
        return {category:spec.category,available:true,items:rows.map(row=>({
          kind:spec.kind,category:spec.category,severity:spec.severity,
          id:String(row.id??row.lab_id??''),label:spec.kind==='instruction'?'Lab '+String(row.lab_id)+' — instruction review':spec.kind==='assessment'?'Lab '+String(row.lab_id)+' — assessment v'+String(row.version):spec.kind==='report'?'Forum report #'+String(row.id):'Support ticket '+String(row.ticket_number||row.id),
          status:spec.kind==='instruction'?'Unreviewed':spec.kind==='assessment'?'Draft':String(row.status||'Open'),
          createdAt:row.created_at||row.updated_at||null,target:spec.target
        }))};
      }catch{return {category:spec.category,available:false,items:[]}}
    }));
    let recentActivity=null;
    if(has(c.ctx,'audit.view')){
      try{recentActivity=(await tableRows(env,'admin_audit_log','id,actor_user_id,action,target_type,target_id,created_at','&order=created_at.desc&limit=8'))
        .map(event=>({id:event.id,actor:event.actor_user_id||null,action:event.action||'Unknown',targetType:event.target_type||null,targetId:event.target_id||null,at:event.created_at||null}));}
      catch{recentActivity=null}
    }
    const activeEntitlements=await countTable(env,'entitlements','status=in.(active,trialing)');
    return ok({queue:queueResults,recentActivity,permissions:c.ctx.permissions,summary:{users,library,orders,subscriptions:subs,openReports:reports,
      auditEntries:auditCount,catalogProducts:catalog,publishedContent:content,
      activeEntitlements,pendingLabReviews,draftAssessments,founderOccupied,
      academyActive,openSupportTickets,currentDigitalEditions},
      observedAt:new Date().toISOString(),roles:c.ctx.roles});
  }
  if(action==='users'){
    const c=await withContext(env,request,'users.view');const q=clean(url.searchParams.get('q')).toLowerCase().slice(0,120);const page=adminPageInt(url.searchParams.get('page'));const perPage=adminPageInt(url.searchParams.get('per_page'),{fallback:100,min:20,max:200});
    const {data}=await adminAuth(env,`users?page=${page}&per_page=${perPage}`);const unfiltered=Array.isArray(data?.users)?data.users:[];let users=unfiltered;
    if(q)users=users.filter(u=>[u.email,u.phone,u.user_metadata?.username,u.user_metadata?.display_name].some(v=>String(v||'').toLowerCase().includes(q)));
    const ids=users.map(u=>u.id);let profiles=[],flags=[],urs=[];
    if(ids.length){const list=ids.join(',');[profiles,flags,urs]=await Promise.all([tableRows(env,'profiles','id,username,display_name,session_timeout_minutes',`&id=in.(${list})`),tableRows(env,'admin_user_flags','user_id,status,reason,updated_at',`&user_id=in.(${list})`),tableRows(env,'admin_user_roles','user_id,role_code,expires_at',`&user_id=in.(${list})`)]).catch(()=>[[],[],[]])}
    const pm=new Map(profiles.map(x=>[x.id,x])),fm=new Map(flags.map(x=>[x.user_id,x]));const rm={};urs.forEach(x=>{(rm[x.user_id]??=[]).push(x.role_code)});
    return ok({users:users.map(u=>({id:u.id,email:u.email,created_at:u.created_at,last_sign_in_at:u.last_sign_in_at,banned_until:u.banned_until,profile:pm.get(u.id)||null,flag:fm.get(u.id)||null,roles:rm[u.id]||[]})),page,perPage,hasNext:unfiltered.length===perPage,searchScope:q?'CURRENT_AUTH_PAGE_ONLY':'UNFILTERED_AUTH_PAGE'});
  }
  if(action==='user_summary'){
    // Dedicated minimal read: never send notes, billing metadata, library
    // grants, private entitlements or provider credentials to the new shell.
    await withContext(env,request,'users.view');
    const id=clean(url.searchParams.get('id'));
    if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))
      return bad('Valid member ID required.',400);
    const {data:user}=await adminAuth(env,'users/'+encodeURIComponent(id));
    const [profile,flag,roles,journalCount,labCount]=await Promise.all([
      one(env,'profiles?select=id,username,account_kind&'+'id=eq.'+encodeURIComponent(id)),
      one(env,'admin_user_flags?select=status&user_id=eq.'+encodeURIComponent(id)),
      tableRows(env,'admin_user_roles','role_code,expires_at','&user_id=eq.'+encodeURIComponent(id)),
      countTable(env,'decision_journal','user_id=eq.'+encodeURIComponent(id)),
      countTable(env,'lab_attempts','user_id=eq.'+encodeURIComponent(id))
    ]);
    return ok({user:{id:user.id,email:user.email,created_at:user.created_at,last_sign_in_at:user.last_sign_in_at},
      profile,flag,roles:(roles||[]).filter(x=>!x.expires_at||Date.parse(x.expires_at)>Date.now()),
      activity:{journalCount,labAttemptCount:labCount},minimized:true});
  }
  if(action==='user_detail'){
    const c=await withContext(env,request,'users.view');const id=clean(url.searchParams.get('id'));if(!id)return bad('User id required.');
    const {data:user}=await adminAuth(env,`users/${encodeURIComponent(id)}`);
    const [profile,flag,notes,roles,library,entitlements,orders,subs,planGrants,toolPasses]=await Promise.all([
      one(env,`profiles?select=*&id=eq.${encodeURIComponent(id)}`),one(env,`admin_user_flags?select=*&user_id=eq.${encodeURIComponent(id)}`),tableRows(env,'admin_user_notes','*',`&user_id=eq.${encodeURIComponent(id)}&order=created_at.desc&limit=50`),tableRows(env,'admin_user_roles','role_code,granted_at,expires_at',`&user_id=eq.${encodeURIComponent(id)}`),tableRows(env,'user_library','*',`&user_id=eq.${encodeURIComponent(id)}&order=granted_at.desc`),tableRows(env,'entitlements','*',`&user_id=eq.${encodeURIComponent(id)}`),tableRows(env,'site_orders','*',`&user_id=eq.${encodeURIComponent(id)}&order=created_at.desc&limit=50`),tableRows(env,'site_subscriptions','*',`&user_id=eq.${encodeURIComponent(id)}&order=created_at.desc&limit=20`),tableRows(env,'user_plan_grants','*',`&user_id=eq.${encodeURIComponent(id)}&order=created_at.desc`),tableRows(env,'user_tool_passes','*,platform_tools(name,href)',`&user_id=eq.${encodeURIComponent(id)}&order=created_at.desc`)
    ]);
    const journalCount=await countTable(env,'decision_journal',`user_id=eq.${encodeURIComponent(id)}`);const labCount=await countTable(env,'lab_attempts',`user_id=eq.${encodeURIComponent(id)}`);
    return ok({user,profile,flag,notes,roles,library,entitlements,orders,subscriptions:subs,planGrants,toolPasses,activity:{journalCount,labAttemptCount:labCount}});
  }
  if(action==='roles'){
    await withContext(env,request,'roles.view');const [roles,permissions,map]=await Promise.all([tableRows(env,'admin_roles','*','&order=priority.asc,name.asc'),tableRows(env,'admin_permissions','*','&order=category.asc,name.asc'),tableRows(env,'admin_role_permissions','*')]);return ok({roles,permissions,rolePermissions:map});
  }
  if(action==='catalog'){
    await withContext(env,request,'catalog.view');return ok({products:await tableRows(env,'catalog_products','*','&order=sort_order.asc,product_code.asc')});
  }
  if(action==='settings'){
    await withContext(env,request,'settings.view');return ok({settings:await tableRows(env,'site_settings','*','&order=category.asc,setting_key.asc')});
  }
  if(action==='sparks_prices'){
    const c=await withContext(env,request,'settings.view');
    if(!c.ctx.roles.includes('OWNER'))return bad('Only Owner may manage Sparks pricing.',403);
    return ok({prices:await tableRows(env,'gu_sparks_price_catalog_v1','*','&order=category.asc,sku.asc')});
  }
  if(action==='content'){
    await withContext(env,request,'content.view');const type=clean(url.searchParams.get('type'));return ok({content:await tableRows(env,'managed_content','*',`${type?`&content_type=eq.${encodeURIComponent(type)}`:''}&order=content_type.asc,sort_order.asc,title.asc`)});
  }
  if(action==='commerce'){
    await withContext(env,request,'commerce.view');const [orders,subs]=await Promise.all([tableRows(env,'site_orders','*','&order=created_at.desc&limit=100'),tableRows(env,'site_subscriptions','*','&order=created_at.desc&limit=100')]);return ok({orders,subscriptions:subs});
  }
  if(action==='store_reports'){
    const ctx=await withContext(env,request,'commerce.view');
    if(!ctx.ctx.roles.includes('OWNER'))return out({ok:false,error:'Owner finance reporting access required.'},403);
    const today=new Date().toISOString().slice(0,10);
    const from=clean(url.searchParams.get('from'))||new Date(Date.now()-90*86400000).toISOString().slice(0,10);
    const to=clean(url.searchParams.get('to'))||today;
    if(!/^\d{4}-\d{2}-\d{2}$/.test(from)||!/^\d{4}-\d{2}-\d{2}$/.test(to)||
       !Number.isFinite(Date.parse(from))||!Number.isFinite(Date.parse(to))||
       from>to||Date.parse(to)-Date.parse(from)>366*86400000)
      return out({ok:false,error:'Select a valid date range no longer than 366 days.'},400);
    const orderRows=await tableRows(env,'site_orders',
       'id,provider,provider_order_id,status,currency,subtotal_cents,tax_cents,total_cents,paid_at,refunded_at,metadata,user_id',
       '&paid_at=gte.'+encodeURIComponent(from+'T00:00:00Z')+
       '&paid_at=lt.'+encodeURIComponent(new Date(Date.parse(to+'T00:00:00Z')+86400000).toISOString())+
       '&order=paid_at.desc&limit=251');
    // The presence of a paid status without provider provenance is insufficient
    // evidence to count a real receipt. No TEST/shadow/unknown mode is revenue.
    const verified=orderRows.slice(0,250).filter(x=>x.status==='paid'&&
      x.currency==='USD'&&!x.refunded_at&&
      (x.metadata?.livemode===true||x.metadata?.livemode==='true')&&
      typeof x.provider_order_id==='string'&&x.provider_order_id.length>=8);
    const ids=verified.map(o=>Number(o.id)).filter(x=>Number.isSafeInteger(x)&&x>0);
    const [lines,products]=await Promise.all([
      ids.length?tableRows(env,'site_order_items','order_id,product_code,description,quantity,unit_price_cents,total_cents',
       '&order_id=in.('+ids.join(',')+')&limit=1200'):Promise.resolve([]),
      tableRows(env,'catalog_products','product_code,product_type,family,title','&limit=500')
    ]);
    return out({ok:true,from,to,limit:250,truncated:orderRows.length>250,
       paidOrders:verified,items:lines,categories:products.map(x=>({
         code:x.product_code,type:x.product_type,category:x.family,title:x.title
       })),unverifiedOrRefundedRows:orderRows.slice(0,250).length-verified.length,
       revenuePolicy:'Verified live USD paid orders only; excludes refunded, TEST and unknown provider provenance. Subtotals exclude stated tax. Fees and other costs may be missing.'});
  }
  if(action==='forum'){
    await withContext(env,request,'forum.view');let topics=[],posts=[],reports=[];try{topics=await tableRows(env,'forum_topics','id,title,ticker,lab_id,status,is_pinned,is_locked,author_id,created_at,updated_at','&order=updated_at.desc&limit=100')}catch{}try{posts=await tableRows(env,'forum_posts','id,topic_id,body,status,author_id,created_at,updated_at','&order=created_at.desc&limit=100')}catch{}try{reports=await tableRows(env,'forum_reports','*','&order=created_at.desc&limit=100')}catch{}return ok({topics,posts,reports});
  }
  if(action==='audit'){
    await withContext(env,request,'audit.view');const limit=adminPageInt(url.searchParams.get('limit'),{fallback:150,min:25,max:300});const page=adminPageInt(url.searchParams.get('page'));const offset=(page-1)*limit;const entries=await tableRows(env,'admin_audit_log','*',`&order=created_at.desc,id.desc&limit=${limit}&offset=${offset}`);return ok({entries,page,perPage:limit,hasNext:entries.length===limit});
  }
  if(action==='system'){
    await withContext(env,request,'system.view');const cfg=envConfig(env);return ok({integrations:{supabaseUrl:!!cfg.url,publishableKey:!!cfg.pub,secretKey:!!cfg.secret,bootstrapEmailConfigured:!!clean(env.ADMIN_BOOTSTRAP_EMAIL),workersAI:!!env.AI,paymentWebhookSecret:!!clean(env.PAYMENT_WEBHOOK_SECRET)},runtime:'Cloudflare Pages Functions',secretsExposed:false});
  }
  if(action==='platform'){
    await withContext(env,request,'commerce.view');
    const [plans,tools,matrix]=await Promise.all([tableRows(env,'platform_plans','*','&order=sort_order.asc'),tableRows(env,'platform_tools','*','&order=sort_order.asc'),tableRows(env,'plan_tool_access','*')]);
    return ok({plans,tools,planTools:matrix});
  }
  if(action==='ads'){
    await withContext(env,request,'ads.view');
    const [advertisers,placements,campaigns,creatives,adPolicies]=await Promise.all([tableRows(env,'advertisers','*','&order=updated_at.desc'),tableRows(env,'ad_placements','*','&order=sort_order.asc'),tableRows(env,'ad_campaigns','*','&order=updated_at.desc'),tableRows(env,'ad_creatives','*','&order=updated_at.desc'),tableRows(env,'plan_ad_policies','*','&order=access_code.asc')]);
    const impressions=await countTable(env,'ad_events','event_type=eq.impression');const clicks=await countTable(env,'ad_events','event_type=eq.click');
    return ok({advertisers,placements,campaigns,creatives,adPolicies,metrics:{impressions,clicks}});
  }
  if(action==='marketdata'){
    await withContext(env,request,'datasets.view');
    const [providers,datasets,envelopes]=await Promise.all([tableRows(env,'market_data_providers','*','&order=sort_order.asc'),tableRows(env,'market_datasets','*','&order=updated_at.desc&limit=200'),tableRows(env,'historical_context_envelopes','*','&order=updated_at.desc&limit=200')]);
    return ok({providers,datasets,envelopes});
  }
  if(action==='inventory'){
    await withContext(env,request,'settings.view');
    const [books,tools,labs,placements,navItems,officialPosts,adPolicies]=await Promise.all([
      tableRows(env,'catalog_products','product_code,short_title,title,product_type,active,publication_status,sort_order','&order=sort_order.asc'),
      tableRows(env,'platform_tools','tool_code,name,category,status,active,public_visible,sort_order','&order=sort_order.asc'),
      tableRows(env,'platform_labs','*','&order=sort_order.asc,lab_id.asc'),
      tableRows(env,'ad_placements','*','&order=sort_order.asc'),
      tableRows(env,'site_navigation_items','*','&order=menu_group.asc,sort_order.asc'),
      tableRows(env,'forum_official_posts','*','&order=pinned.desc,sort_order.asc'),
      tableRows(env,'plan_ad_policies','*','&order=access_code.asc')
    ]);
    return ok({books,tools,labs,placements,navItems,officialPosts,adPolicies});
  }
  return bad('Unknown admin action.',404);
}

async function handlePost(env,request,action){
  const body=await jbody(request);
  if(action!=='bootstrap'){const sc=await caller(env,request),scCtx=await roleContext(env,sc.user.id);if(scCtx.roles.includes('SHOWCASE_VIEWER'))return bad('Showcase mode is read-only. Production changes are blocked.',403);}
  if(action==='bootstrap'){
    const c=await caller(env,request);
    const required=clean(env.ADMIN_BOOTSTRAP_EMAIL).toLowerCase();
    if(!required)return bad('ADMIN_BOOTSTRAP_EMAIL is not configured in Cloudflare.',409);
    if(clean(c.user.email).toLowerCase()!==required)return bad('This account is not the configured bootstrap owner.',403);
    if(!c.user.email_confirmed_at&&!c.user.confirmed_at)return bad('Verify this email address before claiming OWNER.',409);
    const owners=await countTable(env,'admin_user_roles','role_code=eq.OWNER');
    if(owners>0)return bad('An OWNER already exists.',409);

    await serviceRest(env,'admin_user_roles',{method:'POST',prefer:'return=minimal',body:{user_id:c.user.id,role_code:'OWNER',granted_by:c.user.id}});

    // OWNER receives permanent Full Learning Access so every protected learning tool works without a paid subscription.
    await serviceRest(env,'entitlements?on_conflict=user_id,product_key',{method:'POST',prefer:'resolution=merge-duplicates,return=minimal',body:{user_id:c.user.id,product_key:'full_learning_access',status:'active',source:'admin',starts_at:nowIso(),ends_at:null}});

    // Add every currently active companion-enabled catalog item to My Library.
    try{
      const products=await tableRows(env,'catalog_products','product_code','&active=eq.true&companion_access=eq.true');
      if(products.length){
        await serviceRest(env,'user_library?on_conflict=user_id,product_code,access_type',{method:'POST',prefer:'resolution=merge-duplicates,return=minimal',body:products.map(p=>({user_id:c.user.id,product_code:p.product_code,access_type:'companion',source_channel:'admin',source_reference:'OWNER_BOOTSTRAP',expires_at:null,metadata:{owner_access:true}}))});
      }
    }catch{}

    await audit(env,c.user.id,'owner.bootstrap','user',c.user.id,{email:c.user.email,full_learning_access:true,library_access:'all current companion products'});
    return ok({role:'OWNER',fullLearningAccess:true});
  }
  if(action==='set_role'){
    const c=await withContext(env,request,'roles.manage');const target=clean(body.user_id),role=safeCode(body.role_code),enabled=body.enabled!==false;if(!target||!role)return bad('User and role are required.');if(role==='OWNER'&&!has(c.ctx,'owner.manage'))return bad('Only an OWNER can change OWNER authority.',403);
    const roleRow=await one(env,`admin_roles?select=role_code,is_assignable&role_code=eq.${encodeURIComponent(role)}`);if(!roleRow||!roleRow.is_assignable)return bad('Role is not assignable.');
    if(!enabled&&role==='OWNER'){const owners=await countTable(env,'admin_user_roles','role_code=eq.OWNER');if(owners<=1)return bad('The last OWNER cannot be removed.',409)}
    if(enabled)await serviceRest(env,'admin_user_roles?on_conflict=user_id,role_code',{method:'POST',prefer:'resolution=merge-duplicates,return=minimal',body:{user_id:target,role_code:role,granted_by:c.user.id,expires_at:body.expires_at||null}});else await serviceRest(env,`admin_user_roles?user_id=eq.${encodeURIComponent(target)}&role_code=eq.${encodeURIComponent(role)}`,{method:'DELETE',prefer:'return=minimal'});
    await audit(env,c.user.id,enabled?'role.assign':'role.remove','user',target,{role});return ok();
  }
  if(action==='save_role'){
    return bad('Legacy two-phase role save is retired. Reload Roles & Permissions and use the atomic Save Role workflow.',409);
  }
  if(action==='save_role_atomic'){
    const c=await withContext(env,request,'roles.manage');
    if(!c.ctx.roles.includes('OWNER'))return bad('Only an active OWNER may save staff roles.',403);
    const role=clean(body.role_code),name=clean(body.name),description=clean(body.description||'');
    const priority=Number(body.priority);
    if(!/^[A-Z][A-Z0-9_]{1,79}$/.test(role)||['OWNER','SHOWCASE_VIEWER'].includes(role)||
       !name||name.length>120||description.length>1000||
       !Number.isInteger(priority)||priority<1||priority>9999||
       typeof body.is_assignable!=='boolean'||
       !Array.isArray(body.permissions)||!Array.isArray(body.expected_permissions)||
       body.permissions.length>100||body.expected_permissions.length>100||
       [...body.permissions,...body.expected_permissions].some(x=>typeof x!=='string'||!x.trim()))
      return bad('Invalid role metadata, permissions, or concurrency snapshot.',400);
    const previous=body.expected_updated_at;
    if(previous!==null&&previous!==undefined&&
       (typeof previous!=='string'||!Number.isFinite(Date.parse(previous))))
      return bad('Invalid role version; reload the role editor.',400);
    try{
      const {data}=await serviceRest(env,'rpc/v014255_admin_role_editor_save',{
        method:'POST',body:{
          p_actor:c.user.id,p_role_code:role,p_name:name,p_description:description,
          p_priority:priority,p_is_assignable:body.is_assignable,
          p_permissions:[...new Set(body.permissions.map(clean))],
          p_expected_permissions:[...new Set(body.expected_permissions.map(clean))],
          p_expected_updated_at:previous||null
        }
      });
      if(data?.ok!==true)return bad('Atomic role save was not confirmed.',503);
      return ok({role_code:role,atomic:true,created:data.created,
        updated_at:data.updated_at,permissionsUpdated:data.permission_count});
    }catch(error){
      if(/changed since this editor loaded/i.test(error.message||''))
        return bad('Role changed while this editor was open. Reload Roles & Permissions and retry.',409);
      throw error;
    }
  }
  if(action==='set_role_permissions'){
    const c=await withContext(env,request,'roles.manage');
    if(!c.ctx.roles.includes('OWNER'))return bad('Only an active OWNER may replace role permissions.',403);
    const role=safeCode(body.role_code);
    if(!role||['OWNER','SHOWCASE_VIEWER'].includes(role))return bad('Protected or invalid role cannot be edited.',403);
    if(!Array.isArray(body.permissions)||!Array.isArray(body.expected_permissions)||
       body.permissions.length>100||body.expected_permissions.length>100||
       [...body.permissions,...body.expected_permissions].some(p=>typeof p!=='string'||!p.trim()))
      return bad('Provide valid desired and expected permission arrays.',400);
    const desired=[...new Set(body.permissions.map(clean))],expected=[...new Set(body.expected_permissions.map(clean))];
    try{
      const {data}=await serviceRest(env,'rpc/v014252_admin_role_permissions_replace',{
        method:'POST',body:{p_actor:c.user.id,p_role_code:role,p_permissions:desired,p_expected_permissions:expected}
      });
      if(data?.ok!==true)return bad('Atomic role update was not confirmed.',503);
      return ok({role_code:role,permissionsUpdated:data.count,atomic:true});
    }catch(e){
      if(/changed after this editor loaded/i.test(e.message||''))return bad('Role changed since this editor loaded. Refresh Roles & Permissions and retry.',409);
      throw e;
    }
  }
  if(action==='user_ban'){
    const c=await withContext(env,request,'users.suspend');const target=clean(body.user_id),duration=clean(body.duration||'none');if(!target)return bad('User required.');if(target===c.user.id)return bad('You cannot suspend your own administrative account.',409);await adminAuth(env,`users/${encodeURIComponent(target)}`,{method:'PUT',body:{ban_duration:duration}});await audit(env,c.user.id,duration==='none'?'user.unban':'user.ban','user',target,{duration});return ok();
  }
  if(action==='user_delete'){
    const c=await withContext(env,request,'users.delete');if(!has(c.ctx,'owner.manage'))return bad('OWNER authority required.',403);const target=clean(body.user_id);if(clean(body.confirmation)!=='DELETE ACCOUNT')return bad('Type DELETE ACCOUNT exactly to confirm.',400);if(!target)return bad('User required.');if(target===c.user.id)return bad('Self-deletion is blocked from the admin panel.',409);const targetRoles=await tableRows(env,'admin_user_roles','role_code',`&user_id=eq.${encodeURIComponent(target)}`);if(targetRoles.some(r=>r.role_code==='OWNER')){const owners=await countTable(env,'admin_user_roles','role_code=eq.OWNER');if(owners<=1)return bad('The last OWNER cannot be deleted.',409)}await audit(env,c.user.id,'user.delete','user',target,{confirmation:'DELETE ACCOUNT'});await adminAuth(env,`users/${encodeURIComponent(target)}`,{method:'DELETE'});return ok();
  }
  if(action==='user_flag'){
    const c0=await caller(env,request),ctx0=await roleContext(env,c0.user.id);if(!has(ctx0,'users.manage')&&!has(ctx0,'users.moderate'))throw Object.assign(new Error('Administrative permission denied.'),{status:403});const c={...c0,ctx:ctx0};const target=clean(body.user_id),status=clean(body.status||'active');if(!target)return bad('User required.');if(!['active','watch','restricted','suspended'].includes(status))return bad('Invalid flag status.');await serviceRest(env,'admin_user_flags?on_conflict=user_id',{method:'POST',prefer:'resolution=merge-duplicates,return=minimal',body:{user_id:target,status,reason:clean(body.reason).slice(0,1000)||null,internal_note:clean(body.internal_note).slice(0,5000)||null,updated_by:c.user.id,updated_at:nowIso()}});await audit(env,c.user.id,'user.flag','user',target,{status,reason:clean(body.reason).slice(0,250)});return ok();
  }
  if(action==='username_override'){
    const c=await withContext(env,request,'users.manage');const target=clean(body.user_id),raw=clean(body.username);if(!/^[A-Za-z][A-Za-z0-9_]{2,23}$/.test(raw))return bad('Username must be 3–24 characters: letters, numbers, underscore; first character must be a letter.');const username=raw.charAt(0).toUpperCase()+raw.slice(1);await serviceRest(env,`profiles?id=eq.${encodeURIComponent(target)}`,{method:'PATCH',prefer:'return=minimal',body:{username,display_name:username}});await audit(env,c.user.id,'user.username_override','user',target,{username});return ok({username});
  }
  if(action==='user_note'){
    const c0=await caller(env,request),ctx0=await roleContext(env,c0.user.id);if(!has(ctx0,'support.manage')&&!has(ctx0,'users.manage')&&!has(ctx0,'users.moderate'))throw Object.assign(new Error('Administrative permission denied.'),{status:403});const c={...c0,ctx:ctx0};const target=clean(body.user_id),note=clean(body.note);if(!target||!note)return bad('User and note are required.');const note_type=['general','support','moderation','commerce','learning','security'].includes(body.note_type)?body.note_type:'general';await serviceRest(env,'admin_user_notes',{method:'POST',prefer:'return=minimal',body:{user_id:target,note:note.slice(0,10000),note_type,created_by:c.user.id}});await audit(env,c.user.id,'user.note','user',target,{note_type});return ok();
  }
  if(action==='library_grant'){
    const c=await withContext(env,request,'library.manage');const target=clean(body.user_id),product=safeCode(body.product_code);if(!target||!product)return bad('User and product are required.');const row={user_id:target,product_code:product,access_type:clean(body.access_type||'companion'),source_channel:'admin',source_reference:clean(body.source_reference)||null,expires_at:body.expires_at||null,metadata:{admin_note:clean(body.note)||undefined}};await serviceRest(env,'user_library?on_conflict=user_id,product_code,access_type',{method:'POST',prefer:'resolution=merge-duplicates,return=minimal',body:row});await audit(env,c.user.id,'library.grant','user',target,{product_code:product,access_type:row.access_type});return ok();
  }
  if(action==='library_revoke'){
    const c=await withContext(env,request,'library.manage');const id=Number(body.id);if(!id)return bad('Library record id required.');await serviceRest(env,`user_library?id=eq.${id}`,{method:'DELETE',prefer:'return=minimal'});await audit(env,c.user.id,'library.revoke','library',id,{});return ok();
  }
  if(action==='entitlement_grant'){
    const c=await withContext(env,request,'entitlements.manage');const target=clean(body.user_id),product=clean(body.product_key||'full_learning_access');if(!target)return bad('User required.');const row={user_id:target,product_key:product,status:body.status==='trialing'?'trialing':'active',source:'admin',starts_at:body.starts_at||nowIso(),ends_at:body.ends_at||null};await serviceRest(env,'entitlements?on_conflict=user_id,product_key',{method:'POST',prefer:'resolution=merge-duplicates,return=minimal',body:row});await audit(env,c.user.id,'entitlement.grant','user',target,{product_key:product,status:row.status,ends_at:row.ends_at});return ok();
  }
  if(action==='entitlement_revoke'){
    const c=await withContext(env,request,'entitlements.manage');const target=clean(body.user_id),product=clean(body.product_key);if(!target||!product)return bad('User and product key required.');await serviceRest(env,`entitlements?user_id=eq.${encodeURIComponent(target)}&product_key=eq.${encodeURIComponent(product)}`,{method:'DELETE',prefer:'return=minimal'});await audit(env,c.user.id,'entitlement.revoke','user',target,{product_key:product});return ok();
  }
  if(action==='catalog_save'){
    const c=await withContext(env,request,'catalog.manage');const code=safeCode(body.product_code);if(!code||!body.title||!body.short_title)return bad('Product code, title, and short title are required.');
    if(body.product_type&&body.product_type!=='book')return bad('The Books editor cannot create membership or tool SKUs. Use the corresponding Products category.',409);
    const original=await one(env,'catalog_products?select=*&product_code=eq.'+encodeURIComponent(code)+'&limit=1');
    const pick=(key,fallback)=>Object.prototype.hasOwnProperty.call(body,key)?body[key]:fallback;
    const imageUrl=clean(pick('cover_image_url',original?.cover_image_url));
    if(imageUrl&&!/^https:\/\//i.test(imageUrl)&&!/^\/assets\/images\/books\/[a-zA-Z0-9_.-]+$/.test(imageUrl))
      return bad('Book cover must use a secure HTTPS image or an approved internal book-cover asset.',400);
    const sampleUrl=clean(pick('sample_url',original?.sample_url));
    if(sampleUrl&&!/^https:\/\//i.test(sampleUrl)&&!/^\/?[A-Za-z0-9_-]+\.html(?:#[A-Za-z0-9_-]+)?$/.test(sampleUrl))
      return bad('Book sample link must use HTTPS or a valid internal page.',400);
    const kdp=!!body.kdp_select,digital=!!body.direct_digital_enabled;if(kdp&&digital)return bad('Direct digital sale cannot be enabled while KDP Select is ON for this title.',409);
    const row={product_code:code,product_type:'book',family:clean(body.family||'other'),title:clean(body.title),short_title:clean(body.short_title),author:clean(body.author)||null,publisher:clean(body.publisher)||null,description:clean(body.description)||null,active:body.active!==false,sort_order:Number(body.sort_order||100),kdp_select:kdp,companion_access:!!body.companion_access,book_key_trial_days:Math.max(0,Number(body.book_key_trial_days||0)),amazon_kindle_url:assertHttpsOrBlank(body.amazon_kindle_url,'Kindle URL')||null,amazon_paperback_url:assertHttpsOrBlank(body.amazon_paperback_url,'Paperback URL')||null,amazon_hardcover_url:assertHttpsOrBlank(body.amazon_hardcover_url,'Hardcover URL')||null,direct_digital_enabled:digital,direct_digital_checkout_url:assertHttpsOrBlank(body.direct_digital_checkout_url,'Direct digital checkout URL')||null,direct_physical_enabled:!!body.direct_physical_enabled,direct_physical_checkout_url:assertHttpsOrBlank(body.direct_physical_checkout_url,'Direct physical checkout URL')||null,publication_status:['in_development','coming_soon','publication_candidate','published','archived'].includes(body.publication_status)?body.publication_status:'coming_soon',branch_slug:clean(body.branch_slug||body.family||'other'),included_lifetime:body.included_lifetime!==false,edition_label:clean(body.edition_label)||null,companion_url:assertHttpsOrBlank(body.companion_url,'Companion URL')||null,release_date:body.release_date||null,cover_image_url:imageUrl||null,sample_url:sampleUrl||null,store_visible:pick('store_visible',original?.store_visible)!==false,sales_status:['coming_soon','published','retired'].includes(pick('sales_status',original?.sales_status))?pick('sales_status',original?.sales_status):'coming_soon',metadata:body.metadata&&typeof body.metadata==='object'?body.metadata:original?.metadata||{},updated_at:nowIso(),updated_by:c.user.id};
    await serviceRest(env,'catalog_products?on_conflict=product_code',{method:'POST',prefer:'resolution=merge-duplicates,return=minimal',body:row});await audit(env,c.user.id,'catalog.save','product',code,{kdp_select:kdp,direct_digital_enabled:digital,active:row.active});return ok({product_code:code});
  }
  if(action==='catalog_archive'){
    const c=await withContext(env,request,'catalog.manage');const code=safeCode(body.product_code);await serviceRest(env,`catalog_products?product_code=eq.${encodeURIComponent(code)}`,{method:'PATCH',prefer:'return=minimal',body:{active:false,updated_at:nowIso(),updated_by:c.user.id}});await audit(env,c.user.id,'catalog.archive','product',code,{});return ok();
  }
  if(action==='sparks_price_save'){
    const c=await withContext(env,request,'settings.manage');
    if(!c.ctx.roles.includes('OWNER'))return bad('Only Owner may set Sparks prices.',403);
    const sku=clean(body.sku).toUpperCase();
    const cost=Number(body.sparks_cost),label=clean(body.label),description=clean(body.description);
    if(!/^[A-Z][A-Z0-9_]{2,79}$/.test(sku)||!Number.isSafeInteger(cost)||cost<1||cost>100000||
       label.length<3||label.length>120||description.length>500)
      return bad('Supply a valid SKU, description, and Sparks cost (1–100,000).',400);
    const state=clean(body.state).toLowerCase();
    if(!['active','planned','disabled'].includes(state))return bad('Invalid release status.',400);
    // Category and duration are catalog metadata for new, nonredeemable drafts only.
    // Existing SKUs retain their fulfillment contract and duration: an Owner price
    // change must never silently alter the customer's purchased pass duration.
    const draftCategory=clean(body.category||'OTHER').toUpperCase();
    const draftHours=body.duration_hours===undefined||body.duration_hours===null||
      body.duration_hours===''?null:Number(body.duration_hours);
    if(!['CHART_STUDIO','AD_FREE','PRACTICE','OTHER'].includes(draftCategory)||
      (draftHours!==null&&(!Number.isSafeInteger(draftHours)||draftHours<1||draftHours>8760)))
      return bad('New-item category or planned duration is invalid.',400);
    const original=await one(env,'gu_sparks_price_catalog_v1?select=sku,category,fulfillment,version,sparks_cost,state,label,description,duration_hours&sku=eq.'+
      encodeURIComponent(sku)+'&limit=1');
    if(original){
      if(body.category!==undefined&&clean(body.category).toUpperCase()!==original.category)
        return bad('Existing offer category cannot change without a separate fulfillment review.',409);
      if(body.duration_hours!==undefined&&body.duration_hours!==original.duration_hours)
        return bad('Existing offer duration is locked to its redemption contract.',409);
      const version=Number(body.version);
      if(!Number.isSafeInteger(version)||version!==original.version)return bad('Price changed elsewhere; refresh and try again.',409);
      if(original.fulfillment==='UNINTEGRATED'&&state==='active')
        return bad('Unintegrated items cannot be released without a verified redemption handler.',409);
      const {data}=await serviceRest(env,'gu_sparks_price_catalog_v1?sku=eq.'+encodeURIComponent(sku)+
         '&version=eq.'+original.version,{
        method:'PATCH',prefer:'return=representation',
        body:{sparks_cost:cost,label,description,state,version:original.version+1,
          updated_by:c.user.id,updated_at:nowIso()}
      });
      if(!Array.isArray(data)||data.length!==1)return bad('Price was modified concurrently. Refresh the catalog.',409);
      await audit(env,c.user.id,'sparks.price.update','sparks_sku',sku,{
        before:{sparks_cost:original.sparks_cost,state:original.state,version:original.version},
        after:{sparks_cost:cost,state,version:original.version+1}});
      return ok({price:data[0]});
    }
    if(body.version!==null&&body.version!==undefined)return bad('SKU not found; refresh before updating.',404);
    if(state==='active')return bad('New products are drafts until a redemption handler is implemented and accepted.',409);
    const {data}=await serviceRest(env,'gu_sparks_price_catalog_v1',{
      method:'POST',prefer:'return=representation',body:{
        sku,category:draftCategory,label,description,sparks_cost:cost,
        fulfillment:'UNINTEGRATED',state:'planned',duration_hours:draftHours,updated_by:c.user.id}
    });
    await audit(env,c.user.id,'sparks.price.draft_create','sparks_sku',sku,{
      sparks_cost:cost,category:draftCategory,duration_hours:draftHours,state:'planned'});
    return ok({price:data?.[0]});
  }
  if(action==='setting_save'){
    const c=await withContext(env,request,'settings.manage');const key=clean(body.setting_key);if(!key)return bad('Setting key required.');if(key==='commerce.checkout_enabled')return bad('Checkout activation is controlled by the audited payment rollout, not generic Site Settings.',409);if(/secret|password|token|private[_-]?key|service[_-]?role/i.test(key))return bad('Secrets must stay in Cloudflare environment variables, not site_settings.',409);if(key==='website_background_v1'){
      if(!c.ctx.roles.includes('OWNER'))return bad('Only Owner can publish a website background.',403);
      const v=body.value;
      const prefix=String(c.user.id||'').toLowerCase()+'/SITE_BACKGROUND/';
      const path=String(v?.path||'');
      const valid=path.startsWith(prefix)&&/^[a-z0-9_-]{10,60}\\.(jpg|jpeg|png|webp)$/.test(path.slice(prefix.length));
      if(!v||typeof v!=='object'||Array.isArray(v)||typeof v.enabled!=='boolean'||
         !Number.isFinite(v.overlay)||v.overlay<.35||v.overlay>.92||
         !['center','top','bottom'].includes(v.position)||
         (v.enabled&&!valid)||(!v.enabled&&path))return bad('Invalid Owner background or image path.',400);
      if(v.enabled){
       const {url}=envConfig(env);
       const imageUrl=url+'/storage/v1/object/public/gu-store-photos/'+path.split('/').map(encodeURIComponent).join('/');
       const check=await fetch(imageUrl,{method:'HEAD',cache:'no-store'});
       if(!check.ok||!/^image\\/(jpeg|png|webp)/i.test(check.headers.get('content-type')||''))return bad('Uploaded background image not verified.',409);
      }
      body.category='design';body.public_read=true;body.description='Owner-approved sitewide background image and readability overlay';
    }
    if(key==='feature.crownlight_continuous_workspace_v1'){
      if(!c.ctx.roles.includes('OWNER'))return bad('Owner authority required for Chart Studio presentation.',403);
      const v=body.value;
      const allowedPages=new Set(["simulator.html","dashboard.html","labs.html","learn.html","market-tutor.html","journal.html","bootcamp-academy.html","my-library.html","account.html","market-commons.html","forum.html","skills.html","membership.html","store.html","index.html"]);
      if(!v||typeof v!=='object'||Array.isArray(v)||typeof v.enabled!=='boolean'||
         !Array.isArray(v.pages)||v.pages.length>allowedPages.size||
         new Set(v.pages).size!==v.pages.length||
         v.pages.some(page=>typeof page!=='string'||!allowedPages.has(page))||
         Object.keys(v).some(k=>!['enabled','pages','styles'].includes(k))||
         (v.styles!==undefined&&(
           !v.styles||typeof v.styles!=='object'||Array.isArray(v.styles)||
           Object.keys(v.styles).some(page=>!allowedPages.has(page)||!v.pages.includes(page)||
             !['classic','continuous','focus','compact','spacious'].includes(v.styles[page]))
         )))
        return bad('Specify a boolean enabled state and distinct approved page filenames.',400);
      body.category='design';body.public_read=false;
      body.description='Owner-controlled Crownlight continuous trading workspace presentation';
    }
    const row={setting_key:key,category:clean(body.category||'general'),value:body.value,public_read:!!body.public_read,description:clean(body.description)||null,updated_at:nowIso(),updated_by:c.user.id};await serviceRest(env,'site_settings?on_conflict=setting_key',{method:'POST',prefer:'resolution=merge-duplicates,return=minimal',body:row});await audit(env,c.user.id,'setting.save','setting',key,{public_read:row.public_read});return ok();
  }
  if(action==='content_save'){
    const c=await withContext(env,request,'content.manage');const type=clean(body.content_type);if(type==='tutor_topic'&&!has(c.ctx,'tutor.manage'))return bad('Tutor management permission required.',403);if(type==='announcement'&&!has(c.ctx,'announcements.manage'))return bad('Announcement management permission required.',403);const code=safeCode(body.content_code);if(!code||!body.title)return bad('Content code and title are required.');const allowed=['tutor_topic','announcement','resource','release','challenge','faq'];if(!allowed.includes(type))return bad('Invalid content type.');const row={content_code:code,content_type:type,title:clean(body.title),summary:clean(body.summary)||null,body:clean(body.body)||null,status:['draft','published','archived'].includes(body.status)?body.status:'draft',sort_order:Number(body.sort_order||100),starts_at:body.starts_at||null,ends_at:body.ends_at||null,metadata:body.metadata&&typeof body.metadata==='object'?body.metadata:{},updated_at:nowIso(),updated_by:c.user.id};await serviceRest(env,'managed_content?on_conflict=content_code',{method:'POST',prefer:'resolution=merge-duplicates,return=minimal',body:row});await audit(env,c.user.id,'content.save','content',code,{type,status:row.status});return ok({content_code:code});
  }
  if(action==='content_archive'){
    const c=await withContext(env,request,'content.manage');const code=safeCode(body.content_code);await serviceRest(env,`managed_content?content_code=eq.${encodeURIComponent(code)}`,{method:'PATCH',prefer:'return=minimal',body:{status:'archived',updated_at:nowIso(),updated_by:c.user.id}});await audit(env,c.user.id,'content.archive','content',code,{});return ok();
  }
  if(action==='forum_action'){
    // The original one-click PATCH followed by a separate audit INSERT is
    // NOT transactional. It could produce moderation without an audit row.
    // Use the pre-existing privileged v113 editor/RPC with row locking,
    // stale version, reason and a single database audit transaction instead.
    await withContext(env,request,'forum.moderate');
    return bad('Legacy one-click moderation is retired. Use Inspect / Edit / Moderate.',409);
  }
  if(action==='report_resolve'){
    const c=await withContext(env,request,'forum.moderate');const id=Number(body.id);if(!id)return bad('Report id required.');const status=['reviewing','resolved','dismissed'].includes(body.status)?body.status:'resolved';await serviceRest(env,`forum_reports?id=eq.${id}`,{method:'PATCH',prefer:'return=minimal',body:{status,resolved_by:c.user.id,resolution_note:clean(body.resolution_note).slice(0,5000)||null,resolved_at:status==='reviewing'?null:nowIso()}});await audit(env,c.user.id,'forum.report','report',id,{status});return ok();
  }
  if(action==='store_product_overlay_save'){
    const c=await withContext(env,request,'catalog.view');
    if(!c.ctx.roles.includes('OWNER'))return bad('Owner authorization required.',403);
    const sku=clean(body.sku).toUpperCase(),title=clean(body.title),description=clean(body.description);
    if(!allowedPrelaunchStoreCodesV014175.has(sku))return bad('This product belongs to an existing editor or is not registered as an upcoming SKU.',404);
    const lifecycle=clean(body.lifecycle),visible=body.store_visible,version=body.expected_version;
    if(!/^[A-Z][A-Z0-9_-]{1,79}$/.test(sku)||title.length<1||title.length>160||
       description.length>2400||typeof visible!=='boolean'||!Number.isSafeInteger(version)||version<0)
      return bad('Invalid product fields or version.',400);
    if(!['draft','coming_soon','paused','release_ready'].includes(lifecycle))
      return bad('For Sale is locked until separate payment and fulfillment acceptance.',409);
    const {data}=await serviceRest(env,'rpc/store_product_overlay_save_v014175',{
       method:'POST',body:{p_actor:c.user.id,p_sku:sku,p_title:title,p_description:description,
       p_store_visible:visible,p_lifecycle:lifecycle,p_expected_version:version}});
    return ok({item:data,notice:'Product information saved and audited. Checkout remains separately controlled.'});
  }
  if(action==='plan_copy_save'){
    const c=await withContext(env,request,'plans.manage');
    if(!c.ctx.roles.includes('OWNER'))return bad('OWNER approval required for customer-facing membership copy.',403);
    const code=safeCode(body.plan_code),name=clean(body.name),description=clean(body.description);
    if(!code||!name||name.length>160||description.length>2400)
      return bad('Membership name or description is missing or exceeds editorial limits.',400);
    const existing=await one(env,'platform_plans?select=plan_code,name,description,updated_at&plan_code=eq.'+encodeURIComponent(code)+'&limit=1');
    if(!existing)return bad('Membership plan does not exist.',404);
    if(!existing.updated_at||existing.updated_at!==body.expected_updated_at)
      return bad('Membership changed since you opened it. Reload Products before saving.',409);
    const result=await serviceRest(env,'platform_plans?plan_code=eq.'+encodeURIComponent(code)+
      '&updated_at=eq.'+encodeURIComponent(existing.updated_at),
      {method:'PATCH',prefer:'return=representation',body:{name,description,updated_at:nowIso()}});
    if(!Array.isArray(result.data)||result.data.length!==1)
      return bad('Concurrent membership update detected. Reload the catalog.',409);
    await audit(env,c.user.id,'platform.plan.copy.update','plan',code,{fields:['name','description'],billingPriceChanged:false,entitlementsChanged:false});
    return ok({plan_code:code,notice:'Membership name and description saved. Prices, benefits and Stripe mappings were not changed.'});
  }
  if(action==='plan_save'){
    return bad('Legacy plan editor is disabled for pricing/availability mutations. Use Owner Membership Availability; provider-verified pricing changes need a separate audited flow.',409);
    const c=await withContext(env,request,'plans.manage');const code=safeCode(body.plan_code);if(!code||!body.name)return bad('Plan code and name are required.');
    const row={plan_code:code,name:clean(body.name),description:clean(body.description)||null,price_cents:Math.max(0,Number(body.price_cents||0)),currency:'USD',billing_interval:['none','month','year','lifetime'].includes(body.billing_interval)?body.billing_interval:'none',active:body.active!==false,public_visible:body.public_visible!==false,ad_free:!!body.ad_free,includes_all_tools:!!body.includes_all_tools,includes_all_books:!!body.includes_all_books,checkout_url:assertHttpsOrBlank(body.checkout_url,'Checkout URL')||null,sort_order:Number(body.sort_order||100),metadata:body.metadata&&typeof body.metadata==='object'?body.metadata:{},updated_at:nowIso()};
    await serviceRest(env,'platform_plans?on_conflict=plan_code',{method:'POST',prefer:'resolution=merge-duplicates,return=minimal',body:row});await audit(env,c.user.id,'platform.plan.save','plan',code,{price_cents:row.price_cents});return ok({plan_code:code});
  }
  if(action==='tool_save'){
    const c=await withContext(env,request,'tools.manage');
    const code=safeCode(body.tool_code),name=clean(body.name);
    if(!code||!name||name.length>160)return bad('A valid tool code and name are required.');
    const current=await one(env,'platform_tools?select=*&tool_code=eq.'+encodeURIComponent(code)+'&limit=1');
    const nextStatus=clean(body.status||'planned');
    if(!['live','beta','planned','paused','retired'].includes(nextStatus))return bad('Invalid tool release status.');
    // Product editing must NEVER activate a new checkout, publish an
    // unverified tool as LIVE, or silently alter a Stripe-bound price.
    if(nextStatus==='live'&&current?.status!=='live')return bad('A new LIVE tool requires a separate verified release and Stripe/entitlement activation.',409);
    if(current?.status==='live'&&nextStatus!=='live')return bad('Pausing a billed LIVE tool requires a separate subscription-impact review.',409);
    const price=Number(body.individual_price_cents??0);
    if(!Number.isSafeInteger(price)||price<0||price>100000000)return bad('Individual price must be a valid nonnegative amount in cents.');
    if(current?.status==='live'&&price!==Number(current.individual_price_cents))
      return bad('LIVE Stripe prices cannot be edited here. Create and verify a matching Stripe Price and payment mapping first.',409);
    if(current?.status==='live'&&(['included_full','included_lifetime','free_preview'].some(key=>
      Object.prototype.hasOwnProperty.call(body,key)&&Boolean(body[key])!==Boolean(current[key]))))
      return bad('Changing LIVE tool entitlements/free previews requires a separate access-impact review.',409);
    if(clean(body.individual_checkout_url)!==clean(current?.individual_checkout_url))
      return bad('Checkout destinations must be activated in the signed payment integration, not the product editor.',409);
    const href=clean(body.href||'');
    if(href&&!/^(?:\/?[A-Za-z0-9_-]+\.html)(?:#[A-Za-z0-9_-]+)?$/.test(href))
      return bad('Tool pages must use an existing safe internal site route.',400);
    const row={tool_code:code,name,category:clean(body.category||'Platform').slice(0,90),
      description:clean(body.description).slice(0,4000)||null,href:href||null,status:nextStatus,
      active:body.active!==false,public_visible:body.public_visible!==false,
      included_full:current?.status==='live'?current.included_full:body.included_full===true,
      included_lifetime:current?.status==='live'?current.included_lifetime:body.included_lifetime===true,
      individual_price_cents:price,individual_checkout_url:current?.individual_checkout_url||null,
      free_preview:current?.status==='live'?current.free_preview:body.free_preview===true,
      sort_order:Number.isSafeInteger(Number(body.sort_order))?Number(body.sort_order):100,
      data_requirement:clean(body.data_requirement).slice(0,1200)||null,
      metadata:current?.metadata||{},updated_at:nowIso()};
    // Optimistic row-revision control: a late editor must never overwrite
    // a tool's changed Stripe price, release status or access configuration.
    let changed;
    if(current){
      if(!current.updated_at)return bad('Tool revision unavailable. Refresh before editing.',409);
      const result=await serviceRest(env,'platform_tools?tool_code=eq.'+encodeURIComponent(code)+
        '&updated_at=eq.'+encodeURIComponent(current.updated_at),
        {method:'PATCH',prefer:'return=representation',body:row});
      changed=result.data;
    }else{
      const result=await serviceRest(env,'platform_tools?on_conflict=tool_code',
        {method:'POST',prefer:'resolution=ignore-duplicates,return=representation',body:row});
      changed=result.data;
    }
    if(!Array.isArray(changed)||changed.length!==1)
      return bad('This tool changed in another session. Reload the Products list before saving.',409);
    await audit(env,c.user.id,'platform.tool.save','tool',code,{before:current?{status:current.status,individual_price_cents:current.individual_price_cents}:null,after:{status:row.status,individual_price_cents:row.individual_price_cents},salesChanged:false});
    return ok({tool_code:code,notice:'Product information saved; Stripe Price and entitlement rollout unchanged.'});
  }
  if(action==='plan_grant'){
    const c=await withContext(env,request,'entitlements.manage');const target=clean(body.user_id),plan=safeCode(body.plan_code);if(!target||!plan)return bad('User and plan are required.');const ps=body.starts_at?new Date(body.starts_at):new Date(),pe=body.ends_at?new Date(body.ends_at):null;if(pe&&pe<=ps)return bad('Ending date must be after the begin date.');
    await serviceRest(env,'user_plan_grants',{method:'POST',prefer:'return=minimal',body:{user_id:target,plan_code:plan,status:'active',starts_at:body.starts_at?new Date(body.starts_at).toISOString():nowIso(),ends_at:body.ends_at?new Date(body.ends_at).toISOString():null,source:'admin',source_reference:`ADMIN:${c.user.id}`,metadata:{granted_by_admin:true}}});await audit(env,c.user.id,'platform.plan.grant','user',target,{plan_code:plan});return ok();
  }
  if(action==='tool_grant'){
    const c=await withContext(env,request,'entitlements.manage');const target=clean(body.user_id),tool=safeCode(body.tool_code);if(!target||!tool)return bad('User and tool are required.');const ts=body.starts_at?new Date(body.starts_at):new Date(),te=body.ends_at?new Date(body.ends_at):null;if(te&&te<=ts)return bad('Ending date must be after the begin date.');
    await serviceRest(env,'user_tool_passes',{method:'POST',prefer:'return=minimal',body:{user_id:target,tool_code:tool,status:'active',starts_at:body.starts_at?new Date(body.starts_at).toISOString():nowIso(),ends_at:body.ends_at?new Date(body.ends_at).toISOString():null,metadata:{granted_by_admin:true}}});await audit(env,c.user.id,'platform.tool.grant','user',target,{tool_code:tool});return ok();
  }
  if(action==='plan_revoke'){
    const c=await withContext(env,request,'entitlements.manage');const target=clean(body.user_id),id=Number(body.id);if(!target||!id)return bad('User and plan grant id are required.');
    await serviceRest(env,`user_plan_grants?id=eq.${id}&user_id=eq.${encodeURIComponent(target)}`,{method:'PATCH',prefer:'return=minimal',body:{status:'canceled',ends_at:nowIso(),updated_at:nowIso()}});await audit(env,c.user.id,'platform.plan.revoke','user',target,{grant_id:id});return ok();
  }
  if(action==='tool_revoke'){
    const c=await withContext(env,request,'entitlements.manage');const target=clean(body.user_id),id=Number(body.id);if(!target||!id)return bad('User and tool pass id are required.');
    await serviceRest(env,`user_tool_passes?id=eq.${id}&user_id=eq.${encodeURIComponent(target)}`,{method:'PATCH',prefer:'return=minimal',body:{status:'canceled',ends_at:nowIso(),updated_at:nowIso()}});await audit(env,c.user.id,'platform.tool.revoke','user',target,{tool_pass_id:id});return ok();
  }
  if(action==='inventory_toggle'){
    const c=await withContext(env,request,'settings.manage');const type=clean(body.entity_type),id=clean(body.entity_id),enabled=body.enabled!==false;
    if(!type||!id)return bad('Entity type and id are required.');
    let table='',filter='',patch={};
    if(type==='book'){table='catalog_products';filter=`product_code=eq.${encodeURIComponent(id)}`;patch={active:enabled,updated_at:nowIso()}}
    else if(type==='tool'){table='platform_tools';filter=`tool_code=eq.${encodeURIComponent(id)}`;patch={active:enabled,public_visible:enabled,updated_at:nowIso()}}
    else if(type==='lab'){table='platform_labs';filter=`lab_id=eq.${encodeURIComponent(id)}`;patch={active:enabled,registry_visible:enabled,updated_at:nowIso(),updated_by:c.user.id}}
    else if(type==='ad_placement'){table='ad_placements';filter=`placement_code=eq.${encodeURIComponent(id)}`;patch={active:enabled}}
    else if(type==='nav'){table='site_navigation_items';filter=`item_code=eq.${encodeURIComponent(id)}`;patch={active:enabled,public_visible:enabled,updated_at:nowIso(),updated_by:c.user.id}}
    else if(type==='official_post'){table='forum_official_posts';filter=`post_code=eq.${encodeURIComponent(id)}`;patch={status:enabled?'published':'disabled',public_visible:enabled,updated_at:nowIso(),updated_by:c.user.id}}
    else return bad('Unsupported inventory entity type.');
    await serviceRest(env,`${table}?${filter}`,{method:'PATCH',prefer:'return=minimal',body:patch});await audit(env,c.user.id,'inventory.toggle',type,id,{enabled});return ok();
  }
  if(action==='inventory_archive'){
    const c=await withContext(env,request,'settings.manage');const type=clean(body.entity_type),id=clean(body.entity_id);if(!type||!id)return bad('Entity type and id are required.');
    let table='',filter='',patch={};
    if(type==='book'){table='catalog_products';filter=`product_code=eq.${encodeURIComponent(id)}`;patch={active:false,store_visible:false,sales_status:'retired',updated_at:nowIso(),updated_by:c.user.id}}
    else if(type==='tool'){table='platform_tools';filter=`tool_code=eq.${encodeURIComponent(id)}`;patch={active:false,public_visible:false,status:'retired',updated_at:nowIso()}}
    else if(type==='lab'){table='platform_labs';filter=`lab_id=eq.${encodeURIComponent(id)}`;patch={active:false,registry_visible:false,updated_at:nowIso(),updated_by:c.user.id}}
    else if(type==='ad_placement'){table='ad_placements';filter=`placement_code=eq.${encodeURIComponent(id)}`;patch={active:false}}
    else if(type==='nav'){table='site_navigation_items';filter=`item_code=eq.${encodeURIComponent(id)}`;patch={active:false,public_visible:false,updated_at:nowIso(),updated_by:c.user.id}}
    else if(type==='official_post'){table='forum_official_posts';filter=`post_code=eq.${encodeURIComponent(id)}`;patch={status:'archived',public_visible:false,updated_at:nowIso(),updated_by:c.user.id}}
    else return bad('Unsupported inventory entity type.');
    await serviceRest(env,`${table}?${filter}`,{method:'PATCH',prefer:'return=minimal',body:patch});await audit(env,c.user.id,'inventory.archive',type,id,{});return ok();
  }
  if(action==='inventory_reorder'){
    const c=await withContext(env,request,'settings.manage');const type=clean(body.entity_type),ids=Array.isArray(body.ids)?body.ids.map(clean).filter(Boolean).slice(0,500):[];if(!type||!ids.length)return bad('Entity type and ordered ids are required.');
    const map={book:['catalog_products','product_code'],tool:['platform_tools','tool_code'],lab:['platform_labs','lab_id'],ad_placement:['ad_placements','placement_code'],nav:['site_navigation_items','item_code'],official_post:['forum_official_posts','post_code']};const m=map[type];if(!m)return bad('Unsupported inventory entity type.');
    for(let i=0;i<ids.length;i++)await serviceRest(env,`${m[0]}?${m[1]}=eq.${encodeURIComponent(ids[i])}`,{method:'PATCH',prefer:'return=minimal',body:{sort_order:(i+1)*10,...(['catalog_products','platform_labs','site_navigation_items','forum_official_posts'].includes(m[0])?{updated_at:nowIso(),updated_by:c.user.id}:{})}});
    await audit(env,c.user.id,'inventory.reorder',type,'bulk',{ids});return ok({count:ids.length});
  }
  if(action==='lab_control_save'){
    const c=await withContext(env,request,'learning.manage');const id=clean(body.lab_id).toUpperCase();if(!id)return bad('Lab ID required.');
    const row={lab_id:id,title:clean(body.title)||null,book_code:clean(body.book_code)||null,chapter_number:body.chapter_number==null?null:Number(body.chapter_number),ticker:clean(body.ticker).toUpperCase()||null,historical_date:body.historical_date||null,timeframe:clean(body.timeframe)||null,lab_type:['core','supplemental'].includes(body.lab_type)?body.lab_type:'core',active:body.active!==false,registry_visible:body.registry_visible!==false,public_sample:!!body.public_sample,custom_href:clean(body.custom_href)||null,sort_order:Number(body.sort_order||100),metadata:body.metadata&&typeof body.metadata==='object'?body.metadata:{},updated_at:nowIso(),updated_by:c.user.id};
    await serviceRest(env,'platform_labs?on_conflict=lab_id',{method:'POST',prefer:'resolution=merge-duplicates,return=minimal',body:row});await audit(env,c.user.id,'lab.control.save','lab',id,{active:row.active,public_sample:row.public_sample});return ok({lab_id:id});
  }
  if(action==='official_post_save'){
    const c=await withContext(env,request,'content.manage');const code=safeCode(body.post_code);if(!code||!body.title||!body.body)return bad('Post code, title, and body are required.');
    const status=['draft','published','disabled','archived'].includes(body.status)?body.status:'draft';const row={post_code:code,category:clean(body.category||'Discussion'),title:clean(body.title),summary:clean(body.summary)||null,body:clean(body.body),status,pinned:!!body.pinned,public_visible:body.public_visible!==false,sort_order:Number(body.sort_order||100),author_label:clean(body.author_label||'Site Administration'),published_at:status==='published'?(body.published_at||nowIso()):null,metadata:body.metadata&&typeof body.metadata==='object'?body.metadata:{},updated_at:nowIso(),updated_by:c.user.id};
    await serviceRest(env,'forum_official_posts?on_conflict=post_code',{method:'POST',prefer:'resolution=merge-duplicates,return=minimal',body:row});await audit(env,c.user.id,'community.official_post.save','official_post',code,{status});return ok({post_code:code});
  }
  if(action==='nav_item_save'){
    const c=await withContext(env,request,'settings.manage');const code=safeCode(body.item_code);if(!code||!body.label)return bad('Navigation code and label required.');
    const row={item_code:code,label:clean(body.label),href:clean(body.href)||null,menu_group:['learn','trade','research','top','profile'].includes(body.menu_group)?body.menu_group:'top',tool_code:clean(body.tool_code)||null,auth_mode:['any','signed_in','signed_out'].includes(body.auth_mode)?body.auth_mode:'any',active:body.active!==false,public_visible:body.public_visible!==false,sort_order:Number(body.sort_order||100),style_variant:clean(body.style_variant)||null,metadata:body.metadata&&typeof body.metadata==='object'?body.metadata:{},updated_at:nowIso(),updated_by:c.user.id};
    await serviceRest(env,'site_navigation_items?on_conflict=item_code',{method:'POST',prefer:'resolution=merge-duplicates,return=minimal',body:row});await audit(env,c.user.id,'navigation.item.save','nav_item',code,{group:row.menu_group});return ok({item_code:code});
  }
  if(action==='ad_policy_save'){
    const c=await withContext(env,request,'ads.manage');const code=safeCode(body.access_code);if(!code)return bad('Access code required.');
    const row={access_code:code,label:clean(body.label||code),ads_enabled:body.ads_enabled!==false,max_impressions_per_session:Math.max(0,Number(body.max_impressions_per_session||0)),max_impressions_per_24h:Math.max(0,Number(body.max_impressions_per_24h||0)),minimum_minutes_between_ads:Math.max(0,Number(body.minimum_minutes_between_ads||0)),allowed_slots:Array.isArray(body.allowed_slots)?body.allowed_slots:[],notes:clean(body.notes)||null,updated_at:nowIso()};
    await serviceRest(env,'plan_ad_policies?on_conflict=access_code',{method:'POST',prefer:'resolution=merge-duplicates,return=minimal',body:row});await audit(env,c.user.id,'ads.policy.save','ad_policy',code,{enabled:row.ads_enabled});return ok();
  }
  if(action==='advertiser_save'){
    const c=await withContext(env,request,'ads.manage');if(!body.name)return bad('Advertiser name required.');const row={name:clean(body.name),contact_name:clean(body.contact_name)||null,contact_email:clean(body.contact_email)||null,website_url:assertHttpsOrBlank(body.website_url,'Website URL')||null,status:['prospect','active','paused','rejected','closed'].includes(body.status)?body.status:'prospect',notes:clean(body.notes)||null,updated_at:nowIso()};if(body.id)await serviceRest(env,`advertisers?id=eq.${Number(body.id)}`,{method:'PATCH',prefer:'return=minimal',body:row});else await serviceRest(env,'advertisers',{method:'POST',prefer:'return=minimal',body:row});await audit(env,c.user.id,'ads.advertiser.save','advertiser',body.id||row.name,{});return ok();
  }
  if(action==='placement_save'){
    const c=await withContext(env,request,'ads.manage');const code=safeCode(body.placement_code);if(!code||!body.name)return bad('Placement code and name required.');const row={placement_code:code,name:clean(body.name),description:clean(body.description)||null,page_pattern:clean(body.page_pattern||'*'),slot_position:clean(body.slot_position||'inline'),active:body.active!==false,free_only:body.free_only!==false,dimensions:clean(body.dimensions)||null,sort_order:Number(body.sort_order||100),metadata:body.metadata&&typeof body.metadata==='object'?body.metadata:{}};await serviceRest(env,'ad_placements?on_conflict=placement_code',{method:'POST',prefer:'resolution=merge-duplicates,return=minimal',body:row});await audit(env,c.user.id,'ads.placement.save','placement',code,{});return ok();
  }
  if(action==='campaign_save'){
    const c=await withContext(env,request,'ads.manage');if(!body.advertiser_id||!body.name)return bad('Advertiser and campaign name required.');const row={advertiser_id:Number(body.advertiser_id),name:clean(body.name),status:['draft','scheduled','active','paused','completed','canceled'].includes(body.status)?body.status:'draft',billing_model:['flat','cpm','cpc','sponsorship'].includes(body.billing_model)?body.billing_model:'flat',amount_cents:Math.max(0,Number(body.amount_cents||0)),budget_cents:body.budget_cents==null?null:Math.max(0,Number(body.budget_cents)),starts_at:body.starts_at||null,ends_at:body.ends_at||null,impression_limit:body.impression_limit?Number(body.impression_limit):null,click_limit:body.click_limit?Number(body.click_limit):null,audience:body.audience&&typeof body.audience==='object'?body.audience:{free:true,signed_out:true,tool_pass:true,full:true},notes:clean(body.notes)||null,updated_at:nowIso()};if(body.id)await serviceRest(env,`ad_campaigns?id=eq.${Number(body.id)}`,{method:'PATCH',prefer:'return=minimal',body:row});else await serviceRest(env,'ad_campaigns',{method:'POST',prefer:'return=minimal',body:row});await audit(env,c.user.id,'ads.campaign.save','campaign',body.id||row.name,{status:row.status});return ok();
  }
  if(action==='creative_save'){
    const c=await withContext(env,request,'ads.manage');if(!body.campaign_id||!body.placement_code||!body.destination_url)return bad('Campaign, placement, and destination URL required.');const row={campaign_id:Number(body.campaign_id),placement_code:safeCode(body.placement_code),status:['draft','approved','active','paused','rejected','archived'].includes(body.status)?body.status:'draft',headline:clean(body.headline)||null,body:clean(body.body)||null,image_url:assertHttpsOrBlank(body.image_url,'Image URL')||null,destination_url:assertHttpsOrBlank(body.destination_url,'Destination URL'),disclosure_label:clean(body.disclosure_label||'Advertisement'),alt_text:clean(body.alt_text)||null,utm:body.utm&&typeof body.utm==='object'?body.utm:{},updated_at:nowIso()};if(body.id)await serviceRest(env,`ad_creatives?id=eq.${Number(body.id)}`,{method:'PATCH',prefer:'return=minimal',body:row});else await serviceRest(env,'ad_creatives',{method:'POST',prefer:'return=minimal',body:row});await audit(env,c.user.id,'ads.creative.save','creative',body.id||row.headline,{status:row.status});return ok();
  }
  if(action==='provider_save'){
    const c=await withContext(env,request,'datasets.manage');const code=safeCode(body.provider_code);if(!code||!body.name)return bad('Provider code and name required.');const row={provider_code:code,name:clean(body.name),description:clean(body.description)||null,connection_mode:['byo_token','public','server_license','upload'].includes(body.connection_mode)?body.connection_mode:'byo_token',status:['live','beta','planned','paused'].includes(body.status)?body.status:'beta',active:body.active!==false,coverage:clean(body.coverage)||null,hours:clean(body.hours)||null,documentation_url:assertHttpsOrBlank(body.documentation_url,'Documentation URL')||null,metadata:body.metadata&&typeof body.metadata==='object'?body.metadata:{},sort_order:Number(body.sort_order||100)};await serviceRest(env,'market_data_providers?on_conflict=provider_code',{method:'POST',prefer:'resolution=merge-duplicates,return=minimal',body:row});await audit(env,c.user.id,'marketdata.provider.save','provider',code,{status:row.status});return ok();
  }
  if(action==='dataset_save'){
    const c=await withContext(env,request,'datasets.manage');const code=safeCode(body.dataset_code);if(!code||!body.title)return bad('Dataset code and title required.');const row={dataset_code:code,title:clean(body.title),ticker:clean(body.ticker).toUpperCase()||null,provider_code:safeCode(body.provider_code)||null,dataset_type:['ohlcv','timesales','quotes','level2','options','mixed'].includes(body.dataset_type)?body.dataset_type:'ohlcv',interval_label:clean(body.interval_label)||null,timezone:clean(body.timezone||'America/New_York'),start_at:body.start_at||null,end_at:body.end_at||null,raw_adjusted:['raw','adjusted','both'].includes(body.raw_adjusted)?body.raw_adjusted:'raw',storage_path:clean(body.storage_path)||null,source_attribution:clean(body.source_attribution)||null,license_note:clean(body.license_note)||null,status:['draft','verified','published','archived'].includes(body.status)?body.status:'draft',metadata:body.metadata&&typeof body.metadata==='object'?body.metadata:{},updated_at:nowIso()};await serviceRest(env,'market_datasets?on_conflict=dataset_code',{method:'POST',prefer:'resolution=merge-duplicates,return=minimal',body:row});await audit(env,c.user.id,'marketdata.dataset.save','dataset',code,{status:row.status});return ok();
  }
  if(action==='envelope_save'){
    const c=await withContext(env,request,'datasets.manage');const code=safeCode(body.envelope_code);if(!code||!body.title||!body.ticker||!body.context_start_at||!body.teaching_start_at||!body.teaching_end_at||!body.context_end_at)return bad('Envelope code, title, ticker, and all context/teaching boundaries are required.');const row={envelope_code:code,title:clean(body.title),ticker:clean(body.ticker).toUpperCase(),lab_id:clean(body.lab_id)||null,dataset_code:safeCode(body.dataset_code)||null,context_start_at:body.context_start_at,teaching_start_at:body.teaching_start_at,teaching_end_at:body.teaching_end_at,context_end_at:body.context_end_at,decision_boundary_at:body.decision_boundary_at||null,multi_day_runner:!!body.multi_day_runner,session_model:'MORNING_DAY_NIGHT',corporate_actions:Array.isArray(body.corporate_actions)?body.corporate_actions:[],catalyst_context:body.catalyst_context&&typeof body.catalyst_context==='object'?body.catalyst_context:{},display_config:body.display_config&&typeof body.display_config==='object'?body.display_config:{premarket:'04:00-09:30',regular:'09:30-16:00',afterhours:'16:00-20:00'},status:['draft','verified','published','archived'].includes(body.status)?body.status:'draft',metadata:body.metadata&&typeof body.metadata==='object'?body.metadata:{},updated_at:nowIso()};await serviceRest(env,'historical_context_envelopes?on_conflict=envelope_code',{method:'POST',prefer:'resolution=merge-duplicates,return=minimal',body:row});await audit(env,c.user.id,'marketdata.envelope.save','envelope',code,{ticker:row.ticker,status:row.status});return ok();
  }
  return bad('Unknown admin action.',404);
}

export async function onRequest(context){
  const {request,env}=context;const url=new URL(request.url);const action=clean(url.searchParams.get('action'));
  try{
    if(request.method==='OPTIONS')return new Response(null,{status:204,headers:{...JSON_HEADERS,allow:'GET,POST,OPTIONS'}});
    if(request.method==='GET')return await handleGet(env,request,action,url);
    if(request.method==='POST'){
      // v78: No legacy account editor may modify entitlements, Book Key
      // companion rights, plan grants, staff roles or identities outside the
      // source-bound Manage Account workflow. Older routes had unscoped
      // DELETE/PATCH mutations and returned success without checking rows.
      const retired=new Set([
       'set_role','user_ban','user_delete','user_flag','username_override',
       'user_note','library_grant','library_revoke',
       'entitlement_grant','entitlement_revoke',
       'plan_grant','plan_revoke','tool_grant','tool_revoke'
      ]);
      if(retired.has(action))
        return bad('Legacy account mutation retired. Open Admin Control Center → Account Management → Manage Account for verified, source-aware account changes. Provider billing operations remain at the provider.',409);
      return await handlePost(env,request,action);
    }
    return bad('Method not allowed.',405);
  }catch(e){return bad(e?.message||'Administrative request failed.',e?.status||500,{detail:e?.status===500?undefined:e?.data})}
}
