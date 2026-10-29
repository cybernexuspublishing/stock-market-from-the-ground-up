/* The Stock Market: From the Ground Up — v0.13.4.2 controlled security repair.
 * Route policy is shared with the service worker; private data remains secured at API/RLS level.
 * Retain historical application enhancers in their approved order. */
import '../assets/js/route-policy.js';
const POLICY=globalThis.GroundUpRoutePolicy;
const JSON_HEADERS={'content-type':'application/json; charset=utf-8','cache-control':'no-store'};
const reject=(message,status=403)=>new Response(JSON.stringify({ok:false,error:message}),{status,headers:JSON_HEADERS});
const clean=s=>String(s||'').trim();
function bearer(request){const h=request.headers.get('authorization')||'';return /^Bearer\s+/i.test(h)?h.replace(/^Bearer\s+/i,'').trim():null}
async function showcaseIdentity(env,token){
  const base=clean(env.SUPABASE_URL).replace(/\/$/,'');
  const pub=clean(env.SUPABASE_PUBLISHABLE_KEY),secret=clean(env.SUPABASE_SECRET_KEY);
  if(!base||!pub||!secret)throw new Error('Auth configuration unavailable.');
  const identity=await fetch(base+'/auth/v1/user',{
    headers:{apikey:pub,authorization:'Bearer '+token},cache:'no-store'
  });
  if(identity.status===401||identity.status===403)return false; // downstream rejects invalid sessions
  if(!identity.ok)throw new Error('Unable to verify authentication.');
  const user=await identity.json();
  if(!user?.id)throw new Error('Missing verified user identity.');
  const h={...supabasePaymentServiceHeaders(secret),accept:'application/json'};
  const [profile,roles]=await Promise.all([
    fetch(base+'/rest/v1/profiles?select=account_kind&id=eq.'+encodeURIComponent(user.id)+'&limit=1',{headers:h,cache:'no-store'}),
    fetch(base+'/rest/v1/admin_user_roles?select=role_code,expires_at&user_id=eq.'+encodeURIComponent(user.id),{headers:h,cache:'no-store'})
  ]);
  if(!profile.ok||!roles.ok)throw new Error('Unable to verify Showcase restrictions.');
  const ps=await profile.json(),rs=await roles.json();
  return ps.some(x=>x.account_kind==='showcase') || rs.some(x=>x.role_code==='SHOWCASE_VIEWER'&&(!x.expires_at||Date.parse(x.expires_at)>Date.now()));
}
// Owner-account lock for legacy administrative mutation endpoints.
// The complete v0.13.5.3 Account Center already requires OWNER on all writes;
// this also prevents historical ADMIN/TECH_ADMIN UI paths from modifying an OWNER.
async function protectLegacyOwnerTarget(context,url){
 const req=context.request;if(['GET','HEAD','OPTIONS'].includes(req.method))return null;
 const path=url.pathname,action=url.searchParams.get('action')||'';
 const original=path==='/api/admin'&&['set_role','username_override','user_ban','user_flag','user_delete'].includes(action);
 const legacy=path==='/api/admin-v0134'&&['account_email_update','account_identity_correct'].includes(action);
 if(!original&&!legacy)return null;
 let body={};try{body=await req.clone().json()}catch{return null}
 const id=clean(body.user_id||body.userId);
 if(!/^[0-9a-f-]{36}$/i.test(id))return null; // backend still validates ID
 const token=bearer(req);if(!token)return null; // backend handles no authentication
 try{
  const base=clean(context.env.SUPABASE_URL).replace(/\/$/,''),pub=clean(context.env.SUPABASE_PUBLISHABLE_KEY),secret=clean(context.env.SUPABASE_SECRET_KEY);
  if(!base||!pub||!secret)throw new Error('Unavailable');
  const h={...supabasePaymentServiceHeaders(secret),accept:'application/json'};
  const own=await fetch(base+'/rest/v1/admin_user_roles?select=user_id,expires_at&role_code=eq.OWNER&user_id=eq.'+encodeURIComponent(id),{headers:h,cache:'no-store'});
  if(!own.ok)throw new Error('Unable to verify target');
  const t=await own.json();if(!t.some(x=>!x.expires_at||Date.parse(x.expires_at)>Date.now()))return null;
  const caller=await fetch(base+'/auth/v1/user',{headers:{apikey:pub,authorization:'Bearer '+token},cache:'no-store'});
  if(!caller.ok)return reject('Invalid staff session.',401);
  const u=await caller.json();if(!u?.id)return reject('Invalid staff identity.',401);
  const roles=await fetch(base+'/rest/v1/admin_user_roles?select=role_code,expires_at&user_id=eq.'+encodeURIComponent(u.id),{headers:h,cache:'no-store'});
  if(!roles.ok)throw new Error('Unable to verify staff role');
  if(!(await roles.json()).some(x=>x.role_code==='OWNER'&&(!x.expires_at||Date.parse(x.expires_at)>Date.now())))
   return reject('Only an OWNER can modify an Owner account.',403);
  return null;
 }catch{return reject('Owner-account authorization could not be verified. Mutation blocked.',503)}
}
// v0.14.0.55 — fail-closed global mode barrier for ALL known server-created
// CUSTOMER checkout sessions. Switching to TESTING is not a visual-only choice:
// customer Checkout POSTs are stopped before any provider/API or DB writes.
// Turning TESTING off restores the live route only when the independent launch
// approval exists; a mode selector can never authorize real charges by itself.
const LIVE_CHECKOUT_ROUTES=new Set([
 '/api/checkout','/api/checkout-v0135',
 '/api/stripe-customer-checkout-v01438','/api/signed-book-checkout',
 '/api/stripe-live-checkout', // stable public route; SAME strict mode boundary
 '/api/book-stripe-live-checkout-v1', // same TEST/LIVE mode barrier; separate verified digital book path
 '/api/stripe-live-checkout-v01458', // backward-compatible legacy route
 '/api/founding600-checkout' // also constrained by the global TEST/LIVE payment-mode boundary
]);
const LEGACY_TEST_CHECKOUT_ROUTES=new Set(['/api/stripe-managed-sandbox-v01432r2',
 '/api/stripe-staging-member-checkout-v01461']);
function supabasePaymentServiceHeaders(value){
 const secret=clean(value);
 if(secret.startsWith('sb_secret_'))return {apikey:secret};
 if(/^eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(secret))
  return {apikey:secret,authorization:'Bearer '+secret};
 throw Error('PAYMENT_DB_SECRET_UNAVAILABLE');
}
async function paymentModeBoundary(context,url){
 const {request,env}=context;
 const checkoutPath=url.pathname.toLowerCase();
 const isPublicQuote=request.method==='GET'&&url.searchParams.get('action')==='quote'&&LIVE_CHECKOUT_ROUTES.has(checkoutPath);
 if(request.method!=='POST'&&!isPublicQuote)return null;
 if(!LIVE_CHECKOUT_ROUTES.has(checkoutPath)&&!LEGACY_TEST_CHECKOUT_ROUTES.has(checkoutPath))return null;
 // Do not trust the frontend-selected mode or a stale cached setting.
 const base=clean(env.SUPABASE_URL).replace(/\/$/,'');
 if(!/^https:\/\/[a-z0-9]{20}\.supabase\.co$/.test(base))
  return reject('PAYMENT_MODE_UNAVAILABLE',503);
 let state;
 try{
  const reply=await fetch(base+'/rest/v1/gu39_sandbox_settings?select=enabled&id=eq.true&limit=1',{
   headers:{...supabasePaymentServiceHeaders(env.SUPABASE_SECRET_KEY),accept:'application/json'},
   cache:'no-store'
  });
  if(!reply.ok)throw Error('PAYMENT_MODE_DB_UNAVAILABLE');
  const rows=await reply.json();
  if(!Array.isArray(rows)||rows.length!==1||typeof rows[0].enabled!=='boolean')throw Error('PAYMENT_MODE_INVALID');
  state=rows[0].enabled;
 }catch{return reject('PAYMENT_MODE_UNAVAILABLE',503)}
 if(LEGACY_TEST_CHECKOUT_ROUTES.has(checkoutPath)){
  if(state!==true)return reject('PAYMENT_MODE_LIVE_TESTING_DISABLED',423);
  return null; // The legacy TEST route's own environment gates remain mandatory.
 }
 if(state===true)return reject('PAYMENT_MODE_TESTING_LIVE_DISABLED',423);
 if(env.GU_PAYMENT_LIVE_LAUNCH_APPROVED!=='true')return reject('LIVE_CHECKOUT_NOT_APPROVED',503);
 // Existing provider-specific/Owner-controlled checks remain mandatory.
 return null;
}

async function apiMutationBoundary(context,url){
  const {request,env}=context;
  if(!url.pathname.startsWith('/api/')||['GET','HEAD','OPTIONS'].includes(request.method))return null;
  const blockedOwner=await protectLegacyOwnerTarget(context,url);
  if(blockedOwner)return blockedOwner;
  const action=url.searchParams.get('action')||'';
  // Legacy demo lifecycle creates REAL paid grants and can mass-delete accounts
  // by an email +demo- substring; keep synthetic QA in approved TEST/SHOWCASE flows.
  if(url.pathname==='/api/admin-v013'&&['demo_create','demo_delete'].includes(action))
    return reject('Legacy real-entitlement demo creation and broad demo deletion are disabled. Use isolated TEST account administration.',503);
  // Older TEST creation still writes REAL plan/tool/book entitlements.
  // Deprecated v0.13.4 account creation can also issue paid grants to a new user.
  // The audited v0.14.0.2 Account Management endpoint is the sole creation path.
  if((url.pathname==='/api/admin-v013'&&action==='test_account_create')||
     (url.pathname==='/api/admin-v0134'&&['account_create','test_account_create','account_identity_correct','account_email_update'].includes(action)))
    return reject('This legacy account mutation route is retired. Use the visible Admin Account Management workspace.',410);
  // A legacy book checkout intent has no format or edition. Require the v0.13.5
  // format-bound endpoint; leave pre-existing subscription checkout unchanged.
  if(url.pathname==='/api/checkout'&&request.method==='POST'&&url.searchParams.get('action')==='create'){
    let payload={};try{payload=await request.clone().json()}catch{}
    if(payload.type==='book'||payload.type==='bundle')
      return reject('Use the versioned format-aware book checkout.',409);
  }
  // The legacy helper fabricates a DOB for real members created with a temporary password.
  // Invitations remain available while the identity-correctness fix is developed.
  if(url.pathname==='/api/admin-v0134'&&action==='account_create'){
    let body={};try{body=await request.clone().json()}catch{}
    if(body.mode==='temporary_password')
      return reject('Temporary-password account creation is temporarily disabled to prevent incorrect date-of-birth records. Use invitation mode.',503);
  }
  // The legacy v0.13.4 implementation issues REAL entitlements during Showcase creation.
  // Block these issuance paths until the synthetic replacement is deployed and tested.
  if(url.pathname==='/api/admin-v0134'&&action==='showcase_account_create')
    return reject('Showcase creation is temporarily disabled pending synthetic-entitlement isolation.',503);
  if(url.pathname==='/api/admin-v0134'&&action==='test_account_duplicate'){
    // Preserve ordinary TEST duplication; block only a SHOWCASE-derived duplicate.
    let body={};try{body=await request.clone().json()}catch{}
    const target=clean(body.userId);
    if(!/^[a-f0-9-]{36}$/i.test(target))return reject('Invalid duplicate account identifier.',400);
    const base=clean(env.SUPABASE_URL).replace(/\/$/,'');
    const secret=clean(env.SUPABASE_SECRET_KEY);
    if(!base||!secret)return reject('Unable to verify test-account class.',503);
    try{
      const r=await fetch(base+'/rest/v1/test_account_profiles?select=preset_code&user_id=eq.'+encodeURIComponent(target)+'&limit=1',{
        headers:supabasePaymentServiceHeaders(secret),cache:'no-store'
      });
      if(!r.ok)return reject('Unable to verify test-account class.',503);
      const rows=await r.json();
      if(rows.some(x=>x.preset_code==='SHOWCASE'))return reject('SHOWCASE duplication requires synthetic-only creation.',503);
    }catch{return reject('Unable to verify test-account class.',503)}
  }
  if(url.pathname==='/api/admin-v0134'&&action==='test_account_create'){
    let body={};try{body=await request.clone().json()}catch{}
    if(String(body.presetCode||'').toUpperCase()==='SHOWCASE')
      return reject('Showcase creation is temporarily disabled pending synthetic-entitlement isolation.',503);
  }
  const token=bearer(request);
  if(!token)return null; // existing endpoint authentication handles missing tokens
  try{
    if(await showcaseIdentity(env,token))
      return reject('SHOWCASE_VIEWER is read-only. Production API mutations are forbidden.',403);
  }catch{return reject('Unable to verify mutation authorization. Request blocked.',503)}
  return null;
}
// OWNER-controlled rollout: turn on REQUIRE_STAFF_AAL2_V135 ONLY after all staff
// have verified TOTP factors. This prevents a production-owner lockout during setup.
async function staffMfaBoundary(context,url){
 if(context.env.REQUIRE_STAFF_AAL2_V135!=='true')return null;
 const path=url.pathname.toLowerCase();
 const staffPath=/^\/api\/admin(?:-[a-z0-9-]+)?$/.test(path)||
    path==='/api/showcase-v0135'||path==='/api/book-catalog-v0135';
 if(!staffPath)return null;
 const token=bearer(context.request);
 if(!token)return reject('Sign in before accessing staff operations.',401);
 try{
  const base=clean(context.env.SUPABASE_URL).replace(/\/$/,''),pub=clean(context.env.SUPABASE_PUBLISHABLE_KEY);
  if(!base||!pub)return reject('Authentication service unavailable.',503);
  const verified=await fetch(base+'/auth/v1/user',{headers:{apikey:pub,authorization:'Bearer '+token},cache:'no-store'});
  if(!verified.ok)return reject('Invalid staff authentication session.',401);
  const identity=await verified.json();if(!identity?.id)return reject('Invalid identity.',401);
  const part=token.split('.')[1];if(!part)return reject('Invalid security token.',401);
  let assurance='';try{assurance=JSON.parse(atob(part.replace(/-/g,'+').replace(/_/g,'/'))).aal||''}catch{}
  if(assurance!=='aal2')return new Response(JSON.stringify({ok:false,error:'Staff access requires verified MFA (AAL2).',mfaRequired:true,mfaUrl:'/mfa-security.html'}),{status:403,headers:JSON_HEADERS});
  return null;
 }catch{return reject('Unable to verify staff authentication.',503)}
}
export async function onRequest(context){
  const url=new URL(context.request.url),path=POLICY.canonicalPath(url.pathname),kind=POLICY.classify(path);
  if(['/corrections.html','/corrections','/verification.html','/verification'].includes(path))
    return Response.redirect(new URL('/',url),302);
  if(['/forum.html','/forum'].includes(path))
    return Response.redirect(new URL('/market-commons.html',url),302);
  // Keep account.html as a protected legacy deep link. Navigation remains consolidated
  // in Dashboard, but redirecting it here would lose the requested URL in next=.

  // Never publish repository migrations, internal source, or release notes through Pages.
  // Public JSON catalog files in /data/ remain deliberately accessible to the app.
  const rawPath=url.pathname.toLowerCase();
  if(rawPath.startsWith('/supabase/')||rawPath.startsWith('/docs/')||
     rawPath.startsWith('/src/')||rawPath.startsWith('/workers/')||
     rawPath.startsWith('/functions/')||rawPath==='/project_manifest.json'||
     /\.(?:sql|md|mjs|py|ts|zip)$/i.test(rawPath))
    return new Response('Not found.',{status:404,headers:{'cache-control':'no-store'}});

  const mfaDenied=await staffMfaBoundary(context,url);
  if(mfaDenied)return mfaDenied;
  const paymentDenied=await paymentModeBoundary(context,url);
  if(paymentDenied)return paymentDenied;
  const denied=await apiMutationBoundary(context,url);
  if(denied)return denied;
  const upstream=await context.next();
  const hardened=new Headers(upstream.headers);
  hardened.set('x-content-type-options','nosniff');
  hardened.set('referrer-policy','strict-origin-when-cross-origin');
  hardened.set('x-frame-options','SAMEORIGIN');
  if(url.protocol==='https:')hardened.set('strict-transport-security','max-age=86400');
  const response=new Response(upstream.body,{status:upstream.status,statusText:upstream.statusText,headers:hardened});
  const type=(response.headers.get('content-type')||'').toLowerCase();
  if(!type.includes('text/html'))return response;
  // Exact, owner-approved v3.2 standalone demonstrations must never inherit
  // the website's legacy CSS, authentication overlay or DOM injection.
  // The two fictional v3.2 previews remain isolated from website chrome.
  // Production Learning v3.3, however, MUST inherit the exact same canonical
  // navigation, account controls, header search and page enhancements as the
  // rest of the website. Entitlements continue to be checked server-side.
  if(['/lab-v32-reference','/lab-v32-reference.html',
      '/lab-v32-member','/lab-v32-member.html'].includes(path))return response;
  // When the official v3.3 player is opened inside the authenticated Registry,
  // the PARENT already owns navigation and account chrome. Reusing its CSS/JS
  // a second time in the frame would create duplicate menus and page reflows.
  // Do not skip the security boundaries above or the Lab API authorization.
  if(['/lab-player','/lab-player.html'].includes(path)&&url.searchParams.get('embedded')==='1'){
    // Embedded learning is still member-only; avoid duplicating the parent
    // navigation or modifying the approved full-width Lab layout.
    try{
      const embeddedMemberGate=new HTMLRewriter()
        .on('head',{element(el){
          el.append('<style id="v1342-access-pending">html body{visibility:hidden!important}</style>',{html:true});
          el.append('<script defer src="/assets/js/auth-boundary.js"></script>',{html:true});
        }})
        .on('body',{element(el){
          el.setAttribute('data-route-access','member');
          el.setAttribute('data-auth-required','true');
        }})
        .transform(response);
      const gated=new Response(embeddedMemberGate.body,embeddedMemberGate);
      gated.headers.set('cache-control','private, no-store, max-age=0');
      gated.headers.set('pragma','no-cache');
      gated.headers.set('x-robots-tag','noindex, nofollow');
      gated.headers.delete('content-length');
      return gated;
    }catch{
      return new Response('Protected Lab unavailable.',{status:503,headers:{'cache-control':'no-store'}});
    }
  }
  try{
    const modified=new HTMLRewriter()
      .on('head',{element(el){
        if(POLICY.isProtected(path)){
          // Style lives inside the HTML head and exists BEFORE any member DOM can render.
          el.append('<style id="v1342-access-pending">html body{visibility:hidden!important}</style>',{html:true});
        }
        if(path==='/labs.html'||path==='/labs')
          el.append('<style id="v011-lab-registry-gate">body{visibility:hidden}</style>',{html:true});
        el.append('<meta name="application-version" content="v0.14.0.14">',{html:true});
        el.append('<meta name="theme-color" content="#061827">',{html:true});
        el.append('<link rel="stylesheet" href="/assets/css/display-preferences.css?v=20261026"><link rel="stylesheet" href="/assets/css/sitewide-surface-refinement.css?v=20261026b"><script defer src="/assets/js/display-preferences.js?v=20261026"></script>',{html:true});
        el.append('<link rel="manifest" href="/manifest.webmanifest">',{html:true});
        for(const file of [
          'platform.css','production.css','frontend-complete.css',
          'production-completion.css','dashboard.css',
          'frontend-freeze.css','polish.css','mobile-auth.css','learning.css','layout-integrity.css'
        ])el.append('<link rel="stylesheet" href="/assets/css/'+file+(file==='layout-integrity.css'?'?v=graphics-20261026':'')+'">',{html:true});
        // Preserve application stack. New auth boundary owns final visibility, staff authorization, and logout.
        for(const file of [
          'navigation.js','production.js',
          'frontend-complete.js','production-completion.js',
          'dashboard-ui-legacy.js','live-fixes.js',
          'frontend-freeze.js'
        ])el.append('<script defer src="/assets/js/'+file+(file==='dashboard-ui-legacy.js'?'?v=books-download-dashboard-20261029':'')+'"></script>',{html:true});
        if(path==='/labs.html'||path==='/labs')el.append('<script defer src="/assets/js/lab-registry.js"></script>',{html:true});
        if(path==='/site-lab.html'||path==='/site-lab')el.append('<script defer src="/assets/js/lab-narrative.js"></script>',{html:true});
        if(path==='/site-lab.html'||path==='/site-lab')el.append('<script defer src="/assets/js/site-lab-experience.js"></script>',{html:true});
        el.append('<script defer src="/assets/js/presence.js"></script>',{html:true});
        // Password validation and policy UI are part of assets/js/signup.js.
        if(path==='/admin.html'||path==='/admin')el.append('<script defer src="/assets/js/admin-community.js"></script>',{html:true});
        if(path==='/admin.html'||path==='/admin')el.append('<script defer src="/assets/js/admin-enhancements.js"></script>',{html:true});
        if(path==='/admin.html'||path==='/admin'){
          el.append('<script defer src="/assets/js/admin-showcase.js"></script>',{html:true});

        }
        if(['/store.html','/membership.html','/store','/membership','/admin.html','/admin'].includes(path))el.append('<script defer src="/assets/js/commerce-presentation.js"></script>',{html:true});
        if(path==='/dashboard.html'||path==='/dashboard')el.append('<script defer src="/assets/js/member-dashboard.js"></script>',{html:true});
        
        if(path==='/admin.html'||path==='/admin')el.append('<script defer src="/assets/js/admin-operations.js"></script>',{html:true});
        if(path==='/ondemand-training.html'||path==='/ondemand-training')el.append('<script defer src="/assets/js/replay-journal.js"></script>',{html:true});
        if(path==='/signin.html'||path==='/signin'||path==='/create-account.html'||path==='/create-account')el.append('<script defer src="/assets/js/turnstile-auth.js"></script>',{html:true});
        if(['/admin','/admin.html','/market-commons','/market-commons.html'].includes(path))el.append('<script defer src="/assets/js/layout-integrity.js"></script>',{html:true});
        el.append('<script defer src="/assets/js/auth-boundary.js"></script>',{html:true});
        el.append('<script defer src="/assets/js/links.js"></script>',{html:true});
        if(path==='/admin.html'||path==='/admin')el.append('<script defer src="/assets/js/admin-core.js"></script>',{html:true});
        if(path==='/admin.html'||path==='/admin')el.append('<script defer src="/assets/js/accounts-access.js"></script>',{html:true});
        // Dashboard desktop tabs now wrap in existing CSS; the former DOM deduplicator is retired.
        
        el.append('<script defer src="/assets/js/branding.js"></script>',{html:true});
        if(path==='/admin.html'||path==='/admin')el.append('<link rel="stylesheet" href="/assets/css/admin-operations.css">',{html:true});
        el.append('<link rel="stylesheet" href="/assets/css/control-center.css">',{html:true});
        // Final visual composition layer after legacy layout CSS; route-specific and passive.
        el.append('<link rel="stylesheet" href="/assets/css/sitewide-composition-v014234.css?v=emerald20261027">',{html:true});
        el.append('<link rel="stylesheet" href="/assets/css/accounts-and-lab-preview.css">',{html:true});
        /* admin.html already loads admin-navigation.css; do not duplicate this stylesheet. */
        el.append('<script defer src="/assets/js/service-worker.js"></script>',{html:true});
        // The Lab shares site navigation but its teaching controls must not
        // inherit broad legacy overrides. Reapply the isolated layout last.
        if(path==='/lab-player'||path==='/lab-player.html')
          el.append('<link rel="stylesheet" href="/assets/css/lab-v33-site-shell.css">',{html:true});
      }})
      .on('body',{element(el){
        el.setAttribute('data-build','v0.14.0.14');
        el.setAttribute('data-gu-layout-route',path.replace('.html','').split('/').filter(Boolean).join('-')||'home');
        el.setAttribute('data-route-access',kind);
        if(POLICY.isProtected(path))el.setAttribute('data-auth-required','true');
        if(path==='/labs.html'||path==='/labs')el.setAttribute('data-v011-protected-labs','true');
      }})
      .transform(response);
    if(POLICY.isProtected(path)){
      const result=new Response(modified.body,modified);
      result.headers.set('cache-control','private, no-store, max-age=0');
      result.headers.set('pragma','no-cache');
      result.headers.set('x-robots-tag','noindex, nofollow');
      result.headers.delete('content-length');
      return result;
    }
    return modified;
  }catch(error){
    if(POLICY.isProtected(path))return new Response('Protected page unavailable.',{status:503,headers:{'cache-control':'no-store'}});
    return response;
  }
}
