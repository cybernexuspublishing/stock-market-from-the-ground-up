/* v0.14.0.55 — OWNER testing console in Payments & Billing. SHADOW ONLY. */
(()=>{'use strict';
 if(!/^\/admin(?:\.html)?$/i.test(location.pathname)||window.GroundUpStripeShadowV01439)return;
 const $=(s,r=document)=>r.querySelector(s),element=(tag,text,cls)=>{const x=document.createElement(tag);if(text!==undefined)x.textContent=text;if(cls)x.className=cls;return x};
 const SKUS={
  'plan:FULL_MONTHLY':'Full Monthly — $69.99', 'plan:FULL_ANNUAL':'Full Annual — $699.00',
  'plan:LIFETIME':'Lifetime — $2,499.00','plan:ONDEMAND_MONTHLY':'Historical Replay — $19.99/month',
  'tool:INTERACTIVE_LEARNING':'Learning & Labs — $29.99/month',
  'tool:JOURNAL_ANALYTICS':'Trading Journal — $29.99/month',
  'tool:MARKET_SIMULATOR':'Market Simulator — $29.99/month','tool:MARKET_TUTOR':'Market Tutor — $29.99/month'
 };
 let state=null,loaded=false,catalogReady=false;
 function permitted(){const gate=$('#admin-gate'),app=$('#admin-app');
  // Navigation is customizable and may be moved or hidden even for an authorized Owner.
  // Use the already authenticated Admin context for UI visibility instead of menu geometry.
  const ctx=typeof ADMIN!=='undefined'?ADMIN.ctx:null;
  const roles=Array.isArray(ctx?.roles)?ctx.roles:[];
  return gate?.hidden===true&&app&&!app.hidden&&
    Array.isArray(ctx?.permissions)&&ctx.permissions.includes('commerce.view')&&
    roles.some(x=>['OWNER','ADMIN'].includes(String(x).toUpperCase()));
 }
 const root=element('section',undefined,'gu39-shadow-card');root.id='gu39-shadow';root.setAttribute('aria-label','Stripe sandbox payment testing');
 const title=element('h2','Stripe Payment Testing');
 const deployedVersion=element('p','Payment testing interface v0.14.0.55 · includes Run Payment Test Preflight','gu39-small');
 const lead=element('p','Safely check Stripe test payments without changing real customer memberships, orders, or eBook rights.');
 const banner=element('p','TEST MODE ONLY · Real customer checkout remains OFF','gu39-danger');
 const help=element('p','Verification works with testing OFF. Configure GU39_STRIPE_TEST_SECRET_KEY and GU39_STRIPE_TEST_PRICE_MAP_JSON in Cloudflare server-side settings. Never enter secret keys here.','gu39-small');
 const message=element('p','Select Refresh to check the system.','gu39-message');message.setAttribute('role','status');message.setAttribute('aria-live','polite');
 const summary=element('dl',undefined,'gu39-summary');
 const controls=element('div',undefined,'gu39-actions');
 const refresh=element('button','Refresh Testing Status');refresh.type='button';
 const verify=element('button','Verify All 8 Sandbox Products');verify.type='button';
 const preflight=element('button','Run Payment Test Preflight');preflight.type='button';
 const preflightReport=element('div',undefined,'gu39-preflight');preflightReport.setAttribute('role','status');preflightReport.setAttribute('aria-live','polite');
 const catalog=element('div',undefined,'gu39-catalog-report');catalog.setAttribute('role','status');catalog.setAttribute('aria-live','polite');
 // Native checkbox with switch semantics: keyboard, screen-reader and focus
 // accessible. The backend database is the authority, not the thumb position.
 const modeControl=element('label',undefined,'gu39-payment-mode-control');
 const liveName=element('span','LIVE','gu39-mode-live');
 const toggle=element('input');toggle.type='checkbox';toggle.id='gu39-payment-mode';
 toggle.setAttribute('role','switch');toggle.setAttribute('aria-label','Payment mode: Testing enabled');
 toggle.disabled=true;
 const track=element('span',undefined,'gu39-mode-track');track.setAttribute('aria-hidden','true');
 const testName=element('span','TESTING','gu39-mode-test');
 modeControl.append(liveName,toggle,track,testName);
 const modeDescription=element('p','LIVE selected: customer checkout remains disabled until separate production-launch approval.','gu39-mode-description');
 modeDescription.setAttribute('role','status');modeDescription.setAttribute('aria-live','polite');
 const label=element('label','Choose a test product');label.htmlFor='gu39-sku';
 const sel=element('select');sel.id='gu39-sku';for(const [value,name] of Object.entries(SKUS)){const opt=element('option',name);opt.value=value;sel.append(opt)}
 const audit=element('button','Audit Checkout — No Payment');audit.type='button';
 const auditReport=element('div',undefined,'gu39-checkout-audit');auditReport.setAttribute('role','status');auditReport.setAttribute('aria-live','polite');
 let auditApprovedForSku=null;
 const begin=element('button','Open Stripe Test Checkout');begin.type='button';begin.disabled=true;
 const explain=element('p','Only the Owner can change testing settings. A recent password confirmation is required. Test data is stored separately from real entitlements. No refunds or recurring memberships are modified outside this test area.','gu39-small');
 controls.append(refresh,verify,preflight,modeControl,label,sel,audit,begin);root.append(title,deployedVersion,lead,banner,help,summary,controls,modeDescription,preflightReport,catalog,auditReport,message,explain);
 async function auth(){const sb=await window.getSupabaseClient?.();const session=(await sb?.auth?.getSession?.())?.data?.session;if(!session?.access_token)throw Error('Sign in to Admin first.');return session.access_token}
 // Consistent human-readable guidance for the Owner's read-only Stripe readiness checks.
 const errorMessage=(code,status)=>{
  const help={
   SANDBOX_TEST_KEY_MISSING:'Cloudflare is missing GU39_STRIPE_TEST_SECRET_KEY (Stripe sk_test_ value), or the configured value is invalid. Configure the TEST secret in Cloudflare server settings; never paste it here.',
   PRICE_MAP_INVALID:'GU39_STRIPE_TEST_PRICE_MAP_JSON is not valid JSON. Configure the eight existing price_ IDs in Cloudflare as one JSON object.',
   SANDBOX_ACCOUNT_MISMATCH:'The configured Stripe TEST key belongs to a different Stripe account. Use the test key for the known sandbox; do not create new products.',
   STRIPE_CATALOG_API_UNAVAILABLE:'Stripe could not return an authenticated product or price verification. Check Stripe TEST key permissions and service availability.',
   SUPABASE_NOT_CONFIGURED:'Cloudflare Supabase server settings are incomplete. Review SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY and SUPABASE_SECRET_KEY.',
   SUPABASE_AUTH_UNAVAILABLE:'Supabase authentication could not be reached. Check the Cloudflare Supabase URL and publishable key, plus Functions logs.',
   STAFF_ROLE_RPC_MISSING:'Supabase is missing the approved gu_staff_role_v01432r1 staff verification RPC. Review migration v0.14.0.32R1 before applying any SQL.',
   STAFF_ROLE_AUTHORIZATION_FAILED:'Supabase rejected staff verification. Confirm this is an eligible Owner/Admin member login with required MFA (AAL2), then retry.',
   STAFF_ROLE_RPC_UNAVAILABLE:'The staff verification RPC is not responding. Check Supabase database functions, API permissions, and Cloudflare Functions logs.',
   SIGN_IN_REQUIRED:'Sign in to the website with your Owner account and try again.',
   INVALID_SESSION:'Your session has expired. Sign out and back in before verifying.',
   STAFF_REQUIRED:'This account is not authorized as OWNER or ADMIN by the Supabase server.',
   SANDBOX_VERIFICATION_UNAVAILABLE:'Supabase or Stripe sandbox verification is unavailable. Check Cloudflare Functions logs and production database RPCs; no products were modified.'
  };
  return help[String(code||'')]||('Verification unavailable (HTTP '+status+'). Review Cloudflare Functions and Supabase connectivity; no Stripe changes were made.');
 };
 function show(data){state=data;summary.replaceChildren();const rows=[['Payment Mode',data.enabled?'TESTING':'LIVE (selected)'],['Owner Test Mode',data.enabled?'Enabled':'Disabled'],['Cloudflare Sandbox Gate',data.cloudflareGate?'Configured':'Not configured'],['Stripe Test Price IDs (configured, not verified)',String(data.priceIdsConfigured??0)+' / 8'],['Test Checkout Records',String(data.intentCount??0)],['Processed Sandbox Events',String(data.processedEventCount??0)],['Shadow Access Records',String(data.shadowAccessCount??0)],['Live Customer Checkout',data.enabled?'PAUSED BY TESTING':data.liveRouteGateOpen?'LAUNCH GATE OPEN — provider conditions still apply':'NOT LAUNCH APPROVED']];
  for(const [k,v] of rows){summary.append(element('dt',k),element('dd',v))}
  toggle.checked=data.enabled===true;toggle.disabled=data.role!=='OWNER'||(!data.enabled&&!data.cloudflareGate);
  toggle.setAttribute('aria-checked',String(toggle.checked));
  toggle.setAttribute('aria-label','Payment mode: '+(toggle.checked?'Testing enabled':'Live selected'));
  modeDescription.textContent=data.enabled
    ?'TESTING ENABLED · New customer checkout is blocked at the Cloudflare server boundary. Only isolated TEST sessions can proceed through their separate safeguards.'
    :data.liveRouteGateOpen
     ?'LIVE SELECTED · The independent launch gate is open. Each provider still requires its separate approved checkout configuration.'
     :'LIVE SELECTED · Real customer checkout is NOT approved. Switching TESTING off does not authorize real charges.';
  begin.disabled=data.role!=='OWNER'||!data.enabled||!data.cloudflareGate||data.priceIdsConfigured!==8||!catalogReady||auditApprovedForSku!==sel.value;
  message.textContent='All displayed purchases remain sandbox-only; actual Stripe processing and entitlement safety require acceptance testing.';
 }
 async function getState(){refresh.disabled=true;message.textContent='Checking authorized sandbox status…';try{const token=await auth();const r=await fetch('/api/gu39-sandbox',{headers:{authorization:'Bearer '+token},cache:'no-store'});const data=await r.json();if(!r.ok||!data.ok)throw Error(data.error||'Sandbox unavailable.');show(data)}catch(e){toggle.disabled=begin.disabled=true;message.textContent=e.message||'Unable to access payment testing controls.'}finally{refresh.disabled=false}}
 async function verifyCatalog(){verify.disabled=true;catalog.replaceChildren();catalog.append(element('p','Checking the eight products directly against the Stripe Sandbox API…'));
  try{const jwt=await auth(),r=await fetch('/api/gu39-sandbox?view=catalog',{headers:{authorization:'Bearer '+jwt},cache:'no-store'}),data=await r.json().catch(()=>null);
   if(!r.ok||!data?.ok)throw Error(errorMessage(data?.error,r.status));
   catalogReady=data.allVerified===true&&data.productsVerified===8&&data.pricesVerified===8;
   catalog.replaceChildren();catalog.append(element('h3','Products: '+data.productsVerified+' / 8 verified · Prices: '+data.pricesVerified+' / 8 verified'));
   if(data.taxClassificationReviewRequired)catalog.append(element('p','Tax review required: monthly and annual membership Stripe tax classifications differ.'));
   if(state)show(state);
   if(!data.allVerified)catalog.append(element('p','No products were added or modified. Review discrepancies before importing anything.'));
   const table=element('table'),caption=element('caption','Read-only Stripe verification results'),head=element('thead'),htr=element('tr');
   for(const c of ['Product','Expected Price','Product','Price','Result'])htr.append(element('th',c));head.append(htr);table.append(head);
   const body=element('tbody');for(const x of data.rows){const tr=element('tr');tr.append(element('td',x.productName||x.sku),element('td','$'+(x.amountCents/100).toFixed(2)+' / '+x.interval),element('td',x.productVerified?'Verified':'Not verified'),element('td',x.priceVerified?'Verified':'Not verified'),element('td',x.reason||x.status));body.append(tr)}
   table.append(body);catalog.append(table);
  }catch(e){catalogReady=false;auditApprovedForSku=null;if(state)show(state);catalog.replaceChildren();catalog.append(element('p','Catalog verification could not complete: '+(e.message||'Unknown error.')))}finally{verify.disabled=false}
 }
 async function runPreflight(){
  preflight.disabled=true;preflightReport.replaceChildren(element('p','Checking TEST account, secure bindings, Supabase controls and Stripe webhook event subscriptions…'));
  try{
   const jwt=await auth(),r=await fetch('/api/gu39-sandbox?view=readiness',{headers:{authorization:'Bearer '+jwt},cache:'no-store'});
   const data=await r.json().catch(()=>null);
   if(!r.ok||!data?.ok)throw Error(errorMessage(data?.error,r.status));
   preflightReport.replaceChildren();
   const h=element('h3','Payment preflight: '+data.passed+' / '+data.total+' checks passed');preflightReport.append(h);
   const table=element('table'),caption=element('caption','Read-only payment configuration checks');
   const thead=element('thead'),tr=element('tr');
   for(const label of ['Check','Result','What it means'])tr.append(element('th',label));
   thead.append(tr);table.append(caption,thead);
   const tbody=element('tbody');
   for(const row of data.checks){const item=element('tr');for(const value of [row.check,row.status,row.detail])item.append(element('td',value));tbody.append(item)}
   table.append(tbody);preflightReport.append(table);
   preflightReport.append(element('p',data.configurationReady?
    'Configuration is ready for controlled Stripe TEST acceptance. Manual secure testing gates and one successful signed checkout are still required.':
    'Do not enable testing until all BLOCKED checks are resolved.'));
   if(data.cloudflareGate===true&&data.ownerMode===true)preflightReport.append(element('p','WARNING: Both test gates are currently enabled. Disable them after completing acceptance testing.'));
  }catch(e){preflightReport.replaceChildren(element('p','Payment preflight failed: '+(e.message||'Unknown error')))}
  finally{preflight.disabled=false}
 }
 async function auditCheckout(){
  audit.disabled=true;auditApprovedForSku=null;
  if(state)show(state);
  auditReport.replaceChildren(element('p','Checking Owner step-up, existing Stripe catalog, full TEST gates, and isolated Supabase permissions. No payment is created.'));
  try{
   const jwt=await auth();
   const safetyUrl='/api/gu39-sandbox?view=checkout-safety&sku='+encodeURIComponent(sel.value);
   const inspect=async()=>{
    const response=await fetch(safetyUrl,{headers:{authorization:'Bearer '+jwt},cache:'no-store'});
    const report=await response.json().catch(()=>null);
    if(!response.ok||report?.ok!==true)throw Error(errorMessage(report?.error,response.status));
    return report;
   };
   let report=await inspect();
   // Opening a non-payment audit should also offer the existing Owner
   // password/Turnstile control when recent step-up has expired. No Stripe
   // session is created, and only one automatic read-only recheck is allowed.
   if(report.checks?.some(x=>x.name==='Recent Owner password confirmation'&&x.status==='BLOCKED')){
    const confirmPassword=window.GroundUpAdminPasswordConfirm?.ensure;
    if(typeof confirmPassword==='function'){
     await confirmPassword();
     report=await inspect();
    }
   }
   auditReport.replaceChildren(element('h3','Pre-payment safety audit: '+report.passed+' / '+report.total+' checks passed'));
   const table=element('table'),caption=element('caption','Read-only checkout safety requirements');
   const head=element('thead'),htr=element('tr');
   for(const name of ['Requirement','Result','Evidence'])htr.append(element('th',name));
   head.append(htr);table.append(caption,head);
   const tbody=element('tbody');
   for(const item of report.checks){
    const row=element('tr');
    for(const value of [item.name,item.status,item.detail])row.append(element('td',value));
    tbody.append(row);
   }
   table.append(tbody);auditReport.append(table);
   if(report.safeToAttemptTest===true&&report.sku===sel.value){
    auditApprovedForSku=report.sku;
    auditReport.append(element('p','All source-side guards passed. Stripe Managed Payments account eligibility and signed provider delivery remain unverified until an explicitly approved TEST transaction; none has been created.'));
   }else{
    auditReport.append(element('p','BLOCKED. Do not attempt Stripe TEST checkout until every safety check passes.'));
   }
  }catch(e){auditReport.replaceChildren(element('p','Checkout safety audit unavailable: '+(e?.message||'Unknown error')))}
  finally{audit.disabled=false;if(state)show(state)}
 }
 sel.addEventListener('change',()=>{auditApprovedForSku=null;if(state)show(state);auditReport.replaceChildren(element('p','The selected product changed. Rerun the read-only safety audit.'));});
 audit.addEventListener('click',auditCheckout);
 preflight.addEventListener('click',runPreflight);
 verify.addEventListener('click',verifyCatalog);
 const actionError=code=>{
  const reasons={
   PASSWORD_RECONFIRM_REQUIRED:'Your Owner password must be confirmed before changing testing settings.',
   STAFF_STEPUP_CHECK_UNAVAILABLE:'Password verification service is unavailable. Check Supabase Auth and Cloudflare Functions.',
   SETTINGS_STALE_REFRESH:'Testing settings changed since they were loaded. Click Refresh Testing Status and try again.',
   OWNER_REQUIRED:'This action requires the OWNER account.',
   SHADOW_TOGGLE_AUTH_REJECTED:'Supabase denied the Owner testing toggle. Check its Owner authorization and password confirmation RPC.',
   SHADOW_TOGGLE_RPC_UNAVAILABLE:'The database testing-toggle RPC is unavailable. Review gu39_sandbox_owner_toggle in Supabase.',
   SHADOW_TOGGLE_DATABASE_REJECTED:'Supabase rejected the testing-toggle transaction. Check Supabase Postgres logs for gu39_sandbox_owner_toggle and its audit-log insert.',
   SANDBOX_SECRETS_NOT_CONFIGURED:'The Cloudflare sandbox gate or TEST secrets are not configured.',
   SAME_ORIGIN_REQUIRED:'Open the site using its Production hostname before testing.',
   INVALID_SESSION:'Your sign-in session expired. Sign in again.',
   PASSWORD_CONFIRM_DIALOG_UNAVAILABLE:'Password confirmation is still loading or unavailable. Refresh this page and try again.',
   SHADOW_TEST_CHECKLIST_BLOCKED:'Full read-only checkout audit not passing. Do not attempt a payment.',
   STRIPE_ACCOUNT_LOOKUP_FAILED:'Stripe TEST account lookup failed during checkout.',
   SHADOW_STATUS_READ_FAILED:'Supabase could not read the current Owner testing state.',
   STRIPE_PRICE_LOOKUP_FAILED:'Stripe TEST price lookup failed.',
   SHADOW_INTENT_READ_FAILED:'Supabase rejected the server-only test intent read.',
   SHADOW_INTENT_CREATE_FAILED:'Supabase rejected the test-only intent INSERT. Check service-role permissions and constraints.',
   SHADOW_INTENT_CLEANUP_FAILED:'Stripe rejected the test checkout, but Supabase could not safely mark its prepared intent failed. Reconcile the isolated ledger before retrying.',
   STRIPE_CHECKOUT_NETWORK_UNAVAILABLE:'Stripe Checkout network/service unreachable; no test session confirmed.',
   STRIPE_CHECKOUT_API_AUTH_REJECTED:'Stripe TEST key is unauthorized to create Checkout sessions.',
   STRIPE_CHECKOUT_PROVIDER_RETRY:'Stripe temporarily rejected the Checkout request or rate-limited it.',
   STRIPE_MANAGED_PAYMENTS_NOT_AVAILABLE:'Stripe Managed Payments preview parameter or access was rejected. Check provider eligibility, terms and account/API version; preserve existing products.',
   STRIPE_TEST_PRICE_NOT_FOUND:'Stripe Checkout rejected this TEST price ID.',
   STRIPE_CHECKOUT_PROVIDER_REJECTED:'Stripe rejected Managed Payments checkout creation. Inspect Stripe TEST Developers → Logs for the error code; do not recreate products.',
   SHADOW_CHECKOUT_BIND_FAILED:'A Stripe TEST session may exist but the test intent could not be bound. Avoid another payment until the isolated intent/Stripe TEST logs are reconciled.',
   SHADOW_TEST_ACTION_UNAVAILABLE:'Unclassified checkout failure. Do not retry; inspect Functions logs and the read-only checkout audit.'
  };
  return reasons[String(code||'')]||String(code||'Testing action was not authorized.');
 };
 async function perform(payload){
  toggle.disabled=begin.disabled=true;
  try{
   const request=async()=>{
    const token=await auth();
    const response=await fetch('/api/gu39-sandbox',{
     method:'POST',headers:{authorization:'Bearer '+token,'content-type':'application/json'},
     body:JSON.stringify(payload),cache:'no-store'
    });
    const data=await response.json().catch(()=>null);
    return {response,data};
   };
   let {response,data}=await request();
   // This action uses fetch rather than the Supabase JS SDK; its existing SDK
   // wrapper cannot automatically open the Owner password/Turnstile dialog.
   // Start existing Owner password confirmation and retry exactly once.
   if(!response.ok&&data?.error==='PASSWORD_RECONFIRM_REQUIRED'){
    const confirmPassword=window.GroundUpAdminPasswordConfirm?.ensure;
    if(typeof confirmPassword!=='function')throw Error('PASSWORD_CONFIRM_DIALOG_UNAVAILABLE');
    await confirmPassword();
    ({response,data}=await request());
   }
   if(!response.ok||data?.ok!==true)throw Error(data?.error||'Payment test action failed; check Cloudflare Functions logs.');
   return data;
  }catch(e){
   const detail=e?.message||'Unknown error.';
   message.textContent='Payment testing action not completed: '+actionError(detail);
   return null;
  }finally{
   if(state){
    toggle.disabled=state.role!=='OWNER'||(!state.enabled&&!state.cloudflareGate);
    begin.disabled=state.role!=='OWNER'||!state.enabled||!state.cloudflareGate||state.priceIdsConfigured!==8||!catalogReady||auditApprovedForSku!==sel.value;
   }
  }
 }
 refresh.addEventListener('click',getState);
 toggle.addEventListener('change',async()=>{
  if(!state){toggle.checked=false;return}
  const next=toggle.checked;
  // Keep the thumb in the user's requested position while authorization runs.
  // The database remains authoritative; rollback only on cancellation/failure.
  if(next===state.enabled)return;
  modeDescription.textContent='Changing payment mode… waiting for Owner authorization and server confirmation.';
  const warning=next
   ?'Switch to TESTING? New LIVE checkout will be blocked on the server; historical customer purchases and existing recurring payments are not canceled. TEST transactions remain isolated.'
   :'Switch to LIVE-selected mode? TEST checkout will be disabled. Real customer checkout will resume ONLY if production launch was independently approved and the provider-specific switches are ready.';
  if(!confirm(warning)){show(state);return;}
  auditApprovedForSku=null;
  const result=await perform({action:'toggle',enabled:next,updatedAt:state.updatedAt});
  if(result)await getState();else if(state)show(state);
 });
 begin.addEventListener('click',async()=>{if(auditApprovedForSku!==sel.value){message.textContent='Complete Audit Checkout — No Payment before continuing.';return;}const sku=sel.value;if(!Object.hasOwn(SKUS,sku))return;if(!confirm('Start a STRIPE TEST purchase? Use Stripe test card details only. No real billing.'))return;
  const result=await perform({action:'checkout',sku});if(!result)return;
  let destination;try{destination=new URL(result.url);if(destination.protocol!=='https:'||destination.hostname!=='checkout.stripe.com')throw Error('Unsafe destination.')}catch{message.textContent='Stripe checkout URL verification failed.';return}
  location.assign(destination.href)});
 function mount(){if(loaded||!permitted())return;const panel=$('#admin-app .admin-panel[data-admin-panel="commerce"]');if(!panel)return;
  const host=$('.gu33-payment-hub',panel)||panel;
  if($('#gu39-shadow')){loaded=true;return}loaded=true;host.prepend(root);window.GroundUpStripeShadowV01439=Object.freeze({version:'0.14.0.55',refresh:getState,verifyCatalog,runPreflight,auditCheckout});getState()}
 // Unlike the old one-time navigation loader, this watcher tolerates delayed
 // authentication, Owner permission hydration, and Admin menu reconstruction.
 const observer=new MutationObserver(()=>mount());
 function start(){
  const gate=$('#admin-gate'),app=$('#admin-app'),tabs=$('#admin-tabs');
  if(gate)observer.observe(gate,{attributes:true,attributeFilter:['hidden']});
  if(app)observer.observe(app,{attributes:true,attributeFilter:['hidden']});
  if(tabs)observer.observe(tabs,{attributes:true,subtree:true,childList:true,
    attributeFilter:['hidden','disabled','class','aria-disabled']});
  mount();
 }
 const retry=setInterval(()=>{if(loaded){clearInterval(retry);observer.disconnect()}else mount()},1000);
 window.addEventListener('pagehide',()=>{clearInterval(retry);observer.disconnect()},{once:true});
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
