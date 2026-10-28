/* v0.14.0.149 Owner navigation and zero-dollar QA visibility, independent of sandbox status. */
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
 // The Owner-only LIVE diagnostic remains discoverable even if the separate
 // Stripe TEST sandbox API fails or TESTING mode is disabled.
 // The GU71 server still requires Owner JWT and a fresh password step-up.
 function ownerVisible(){const ctx=typeof ADMIN!=='undefined'?ADMIN.ctx:null;
  return permitted()&&Array.isArray(ctx?.roles)&&ctx.roles.includes('OWNER');
 }
 const root=element('section',undefined,'gu39-shadow-card');root.id='gu39-shadow';root.setAttribute('aria-label','Stripe sandbox payment testing');
 const title=element('h2','Stripe Payment Testing');
 const deployedVersion=element('p','Payment testing interface v'+(window.SITE_CONFIG?.VERSION||'0.14.0.155')+' · includes Run Payment Test Preflight','gu39-small');
 const lead=element('p','Safely check Stripe test payments without changing real customer memberships, orders, or eBook rights.');
 const banner=element('p','Payment mode initializing · Customer checkout remains OFF','gu39-danger');
 const help=element('p','Verification works with testing OFF. Configure GU39_STRIPE_TEST_SECRET_KEY and GU39_STRIPE_TEST_PRICE_MAP_JSON in Cloudflare server-side settings. Never enter secret keys here.','gu39-small');
 const message=element('p','Select Refresh to check the system.','gu39-message');message.setAttribute('role','status');message.setAttribute('aria-live','polite');
 const summary=element('dl',undefined,'gu39-summary');
 const controls=element('div',undefined,'gu39-actions');
 const unified=element('button','Run Complete Payment Review — No Charge');unified.type='button';unified.classList.add('gu39-primary-readiness');
 const unifiedReport=element('section',undefined,'gu39-complete-report');unifiedReport.setAttribute('role','status');unifiedReport.setAttribute('aria-live','polite');
 // Additional no-charge LIVE account and catalog review; separate from TEST checkout.
 const liveAudit=element('details',undefined,'gu39-live-merchant-review');liveAudit.hidden=true;
 const liveTitle=element('summary','LIVE Merchant & Eight-Product Readiness — No Charge');
 const liveButton=element('button','Run LIVE Merchant Review — No Charge');liveButton.type='button';
 const liveInfo=element('p','Uses existing encrypted Cloudflare credentials to read LIVE Stripe account, eight prices and webhook details. Does not open checkout, charge, or change TEST/LIVE mode.','gu39-small');
 const liveResults=element('section',undefined,'gu39-complete-report');liveResults.setAttribute('role','status');liveResults.setAttribute('aria-live','polite');
 const releaseButton=element('button','Audit All-Category LIVE Sale Gates — Read Only');releaseButton.type='button';
 const releaseDescription=element('p','Verifies current Stripe Price/Product mapping, correct LIVE webhook event coverage, 60 canonical Store faces and Owner release switches. Does not approve customer charges or open checkout.','gu39-small');
 const releaseResults=element('section',undefined,'gu39-complete-report');
 releaseResults.setAttribute('role','status');releaseResults.setAttribute('aria-live','polite');
 liveAudit.append(liveTitle,liveInfo,liveButton,liveResults,releaseDescription,releaseButton,releaseResults);
 // $0 LIVE QA is NOT GU58 member checkout. This collapsible test control stays
 // hidden from non-Owners and uses a separate explicit server-side enable gate.
 const zeroQA=element('details',undefined,'gu71-zero-live-checkout');zeroQA.id='gu71-zero-live-checkout';zeroQA.hidden=true;
 const zeroHeader=element('summary','Owner LIVE $0.00 Checkout — Separate QA Product (No Membership Grant)');
 const zeroDescription=element('p','One-time Stripe-hosted $0.00 Checkout, no card required. Requires a separate flagged QA Product/Price and explicit server-side GU71 switch. Does NOT test paid processing, Managed Payments, signed GU58 fulfillment or grant an entitlement.','gu39-small');
 const zeroSkuLabel=element('label','Select a product for a separate $0 LIVE diagnostic');
 zeroSkuLabel.htmlFor='gu71-qa-target-sku';
 const zeroSkuSelect=element('select');zeroSkuSelect.id='gu71-qa-target-sku';
 const general=element('option','General $0 checkout diagnostic');general.value='';zeroSkuSelect.append(general);
 // Dedicated 14-Day zero-dollar diagnostic; the actual $22.99 checkout stays closed.
 const f14=element('option','Founding 14-Day — LIVE $0.00 QA only (NO membership grant)');
 f14.value='founding:FOUNDING_14';zeroSkuSelect.append(f14);
 zeroQA.addEventListener('toggle',async()=>{
  if(!zeroQA.open||zeroSkuSelect.dataset.catalogLoaded==='1')return;
  try{
   const r=await fetch('/api/storefront-public-catalog',{cache:'no-store'});
   const d=r.ok?await r.json():null;
   if(d?.ok!==true||!Array.isArray(d.items))throw Error('Catalog unavailable');
   zeroSkuSelect.dataset.catalogLoaded='1';
   for(const x of d.items){
    if(!/^(addon|book|course|feature|founding|membership|plan|tool):[A-Z0-9_-]{2,90}$/.test(String(x.sku||'')))continue;
    const option=element('option',String(x.name)+' ('+String(x.sku)+')');
    option.value=x.sku;zeroSkuSelect.append(option);const multi=element('option',String(x.name)+' ('+String(x.sku)+')');multi.value=x.sku;zeroMany.append(multi);
   }
  }catch{zeroReadout.replaceChildren(element('p','Could not verify the full catalog. General $0 diagnostics remain available.'))}
 });
 const zeroModeLabel=element('label','Diagnostic scope');
 const zeroMode=element('select');zeroMode.id='gu71-qa-scope';
 for(const [code,title] of [['one','One selected item'],['category','Entire category'],['selected','Selected items'],['all','All catalog items']]){
  const opt=element('option',title);opt.value=code;zeroMode.append(opt);
 }
 zeroModeLabel.append(zeroMode);
 const zeroCategoryLabel=element('label','Category for the $0 diagnostic');
 const zeroCategory=element('select');zeroCategory.id='gu71-qa-category';
 for(const name of ['membership','founding','tool','bootcamp','book','addon','feature']){
  const opt=element('option',name);opt.value=name;zeroCategory.append(opt);
 }
 zeroCategoryLabel.append(zeroCategory);
 const zeroManyLabel=element('label','Products to include in one $0 diagnostic (Ctrl/Command-click to select multiple)');
 const zeroMany=element('select');zeroMany.id='gu71-qa-many';zeroMany.multiple=true;zeroMany.size=9;
 zeroManyLabel.append(zeroMany);
 const zeroUpdateScope=()=>{
  zeroSkuLabel.hidden=zeroMode.value!=='one';zeroSkuSelect.hidden=zeroMode.value!=='one';
  zeroCategoryLabel.hidden=zeroMode.value!=='category';zeroManyLabel.hidden=zeroMode.value!=='selected';
 };
 zeroMode.addEventListener('change',zeroUpdateScope);zeroUpdateScope();
  const zeroCheck=element('button','Check $0 LIVE QA Product — No Checkout');zeroCheck.type='button';
 const zeroStart=element('button','Create Owner $0 LIVE Checkout — Explicit Confirmation');zeroStart.type='button';
 zeroStart.disabled=true;
 const zeroReadout=element('section',undefined,'gu39-complete-report');zeroReadout.setAttribute('role','status');zeroReadout.setAttribute('aria-live','polite');
 zeroQA.append(zeroHeader,zeroDescription,zeroModeLabel,zeroSkuLabel,zeroSkuSelect,zeroCategoryLabel,zeroManyLabel,zeroCheck,zeroStart,zeroReadout);
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
  controls.append(unified,modeControl,label,sel,begin);
 const advanced=element('details',undefined,'gu39-advanced-controls');
 const advancedTitle=element('summary','Advanced diagnostics (individual checks)');
 const advancedRow=element('div',undefined,'gu39-advanced-actions');
 advancedRow.append(refresh,verify,preflight,audit);advanced.append(advancedTitle,advancedRow);
 root.append(title,deployedVersion,lead,banner,help,summary,controls,modeDescription,unifiedReport,liveAudit,zeroQA,advanced,preflightReport,catalog,auditReport,message,explain);
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
  banner.textContent=data.enabled
   ?'TESTING ACTIVE · New customer checkout blocked · Sandbox-only payment sessions'
   :data.liveRouteGateOpen
    ?'LIVE SELECTED · Independent launch gate approved; provider-specific switches still required'
    :'LIVE SELECTED · Real customer payments are NOT approved';
  toggle.checked=data.enabled===true;toggle.disabled=data.role!=='OWNER'||(!data.enabled&&!data.cloudflareGate);
  toggle.setAttribute('aria-checked',String(toggle.checked));
  toggle.setAttribute('aria-label','Payment mode: '+(toggle.checked?'Testing enabled':'Live selected'));
  modeDescription.textContent=data.enabled
    ?'TESTING ENABLED · New customer checkout is blocked at the Cloudflare server boundary. Only isolated TEST sessions can proceed through their separate safeguards.'
    :data.liveRouteGateOpen
     ?'LIVE SELECTED · The independent launch gate is open. Each provider still requires its separate approved checkout configuration.'
     :'LIVE SELECTED · Real customer checkout is NOT approved. Switching TESTING off does not authorize real charges.';
  begin.disabled=data.role!=='OWNER'||!data.enabled||!data.cloudflareGate||data.priceIdsConfigured!==8||!catalogReady||auditApprovedForSku!==sel.value;
  liveAudit.hidden=data.role!=='OWNER';liveButton.disabled=data.role!=='OWNER';
  // The TEST sandbox readout is not the authority for the independent LIVE QA panel.
  const visible=ownerVisible();zeroQA.hidden=!visible;zeroCheck.disabled=!visible;
  if(!visible)zeroStart.disabled=true;
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
 sel.addEventListener('change',()=>{auditApprovedForSku=null;unifiedReport.replaceChildren(element('p','Product changed. Run Complete Payment Review again.'));if(state)show(state);auditReport.replaceChildren(element('p','The selected product changed. Rerun the read-only safety audit.'));});
 audit.addEventListener('click',auditCheckout);

 async function runCompletePaymentReview(){
  unified.disabled=true;auditApprovedForSku=null;
  if(state)show(state);
  unifiedReport.replaceChildren(element('p','Checking all Stripe TEST catalog products, seven configuration checks, nine checkout guards, existing TEST attempts against Stripe, and the independent LIVE launch lock. No charges or database changes.'));
  try{
   const jwt=await auth();
   const reportUrl='/api/gu39-sandbox?view=complete-review&sku='+encodeURIComponent(sel.value);
   const read=async()=>{
    const response=await fetch(reportUrl,{headers:{authorization:'Bearer '+jwt},cache:'no-store'});
    const report=await response.json().catch(()=>null);
    if(!response.ok||report?.ok!==true)throw Error(errorMessage(report?.error,response.status));
    return report;
   };
   let report=await read();
   if(report.checkout?.checks?.some(x=>x.name==='Recent Owner password confirmation'&&x.status==='BLOCKED')){
    const confirmPassword=window.GroundUpAdminPasswordConfirm?.ensure;
    if(typeof confirmPassword==='function'){await confirmPassword();report=await read();}
   }
   unifiedReport.replaceChildren();
   unifiedReport.append(element('h3','Complete payment review: '+report.checksPassed+' / '+report.totalChecks+' checks passed'));
   const modeLabel=report.mode==='TESTING'?'TESTING — customer checkout blocked':'LIVE selected — production launch separately locked';
   unifiedReport.append(element('p',modeLabel));
   const allChecks=[
    ...(report.config?.checks||[]).map(x=>({label:x.check,status:x.status,detail:x.detail})),
    ...(report.checkout?.checks||[]).map(x=>({label:x.name,status:x.status,detail:x.detail})),
    {label:'Eight actual Stripe TEST products & prices',
     status:report.catalog?.allVerified?'PASS':'BLOCKED',
     detail:report.catalog?.allVerified?'8/8 products and 8/8 prices verified':'Stripe TEST catalog could not be fully verified'}
   ];
   const table=element('table'),caption=element('caption','All configured and payment-specific checks');
   const head=element('thead'),tr=element('tr');
   for(const title of ['Check','Status','Evidence'])tr.append(element('th',title));
   head.append(tr);table.append(caption,head);
   const body=element('tbody');
   for(const check of allChecks){
    const line=element('tr');
    for(const entry of [check.label,check.status,check.detail])line.append(element('td',String(entry||'')));
    body.append(line);
   }
   table.append(body);unifiedReport.append(table);
   const p=report.pending||{};
   if(p.totalUnbound===0)unifiedReport.append(element('p','Earlier TEST attempts: no unbound PREPARED records; no reconciliation needed.'));
   else if(p.error||p.totalUnbound===null)unifiedReport.append(element('p','Earlier TEST attempts: provider/database reconciliation unavailable. No new checkout may be started.'));
   else{
    unifiedReport.append(element('p','Earlier TEST attempts: '+p.totalUnbound+' unbound record(s). A new TEST checkout remains disabled until reconciled.'));
    for(const pending of p.results||[]){
     unifiedReport.append(element('p','Prior attempt: '+pending.status+' · '+pending.createdAt+' · matching Stripe sessions: '+pending.matchedSessions));
    }
    if(p.safeToReconcile&&p.results?.length===1){
     const candidate=p.results[0],fix=element('button','Resolve Existing TEST Attempt — No Charge');
     fix.type='button';
     unifiedReport.append(fix);
     fix.addEventListener('click',async()=>{
      const detail=candidate.status==='MATCHED_VERIFIED_SESSION'
        ?'A matching Stripe TEST session was found and verified. Bind it to the isolated TEST record? This does not charge a card, grant customer access, or certify webhook acceptance.'
        :'A complete Stripe listing found no corresponding Checkout session in the bounded creation window. Mark this isolated PREPARED attempt failed? This does not charge a card or change any real memberships.';
      if(!confirm(detail))return;
      fix.disabled=true;
      const resolved=await perform({action:'reconcile',intentId:candidate.intentId});
      if(resolved){message.textContent='TEST-only reconciliation: '+resolved.action+(resolved.auditRecorded===false?' · WARNING: Admin audit log unavailable; review Supabase logs.':' · Admin audit record stored.')+' Refreshing the complete audit.';await runCompletePaymentReview();}
      else fix.disabled=false;
     });
    }
   }
   // Separate payment *acceptance* evidence from the 17 pre-transaction
   // readiness checks. No accepted transaction is inferred from configuration.
   const acceptance=report.acceptance||{};
   const accepted=element('section',undefined,'gu39-acceptance-evidence');
   accepted.append(element('h3','Actual TEST payment acceptance — '+(acceptance.status||'NOT_TESTED')));
   if(acceptance.attemptCreatedAt)
    accepted.append(element('p','Latest bound TEST checkout: '+acceptance.attemptCreatedAt+
     ' · isolated ledger status: '+(acceptance.testRecordStatus||'unknown')));
   const stages=element('table'),stagesHead=element('thead'),headRow=element('tr');
   for(const h of ['Acceptance evidence','Status','Provider / database evidence'])headRow.append(element('th',h));
   stagesHead.append(headRow);stages.append(stagesHead);
   const stagesBody=element('tbody');
   for(const check of acceptance.steps||[]){
    const row=element('tr');
    for(const field of [check.label,check.status,check.detail||'Awaiting an actual authorized sandbox transaction.'])
     row.append(element('td',String(field||'')));
    stagesBody.append(row);
   }
   stages.append(stagesBody);accepted.append(stages);
   if(acceptance.error)accepted.append(element('p',
    'Acceptance evidence unavailable: '+acceptance.error+'. Configuration checks remain separate.'));
   const life=acceptance.lifeCycle||{};
   accepted.append(element('p','Additional lifecycle evidence (observed, not simulated): '+
    ['renewal','failedPayment','cancellation','refund','dispute']
      .map(k=>k+' '+(life[k]||'NOT_TESTED')).join(' · ')));
   accepted.append(element('p','Only TEST shadow access is inspected. This does not establish real-customer membership fulfillment or authorize LIVE checkout.'));
   unifiedReport.append(accepted);
   const live=report.production||{};
   unifiedReport.append(element('p',
    'Production customer memberships (v'+(window.SITE_CONFIG?.VERSION||'0.14.0.150')+'): '+
    (live.liveCheckoutAvailable?'LIVE route enabled — independent acceptance still required':
      'Source connector prepared; LIVE checkout and real entitlement issuance remain LOCKED.')+
    ' LIVE database installation and exact stored SQL require independent verification against Owner-provided Supabase evidence; a TEST shadow grant is not real member access.'));
   unifiedReport.append(element('p',live.liveCheckoutApproved
    ?'Independent LIVE launch gate is configured; production merchant acceptance and provider-specific switches remain separately required.'
    :'LIVE customer checkout remains locked until independent Owner launch approval. Switching TESTING off will not charge customers.'));
   if(report.readyForSingleSandboxCheckout===true&&report.selectedSku===sel.value){
    auditApprovedForSku=report.selectedSku;catalogReady=true;
    unifiedReport.append(element('p','ALL automated pre-checkout safeguards passed. One controlled TEST checkout can be authorized separately; this review created no payment.'));
   }else{
    unifiedReport.append(element('p','Checkout remains BLOCKED. Resolve the specific findings above; no new payment has been attempted.'));
   }
  }catch(e){unifiedReport.replaceChildren(element('p','Complete payment review could not finish: '+(e.message||'Unknown error')+'. No payment was created.'))}
  finally{unified.disabled=false;if(state)show(state)}
 }
 unified.addEventListener('click',runCompletePaymentReview);
 async function runLiveMerchantReview(){
  liveButton.disabled=true;
  liveResults.replaceChildren(element('p','Verifying LIVE merchant, 8 product prices and webhook settings using read-only requests. No charge.'));
  try{
   const jwt=await auth();
   const read=async()=>{const r=await fetch('/api/stripe-live-merchant-readiness-v01467',{headers:{authorization:'Bearer '+jwt},cache:'no-store'});return {r,j:await r.json().catch(()=>null)}};
   let {r,j}=await read();
   if(!r.ok&&j?.error==='PASSWORD_RECONFIRM_REQUIRED'){
    const step=window.GroundUpAdminPasswordConfirm?.ensure;
    if(typeof step!=='function')throw Error('Confirm your Owner password in Admin Security first.');
    await step();({r,j}=await read());
   }
   if(!r.ok||j?.ok!==true)throw Error(j?.error==='OWNER_ONLY'?'Owner access required.':
    j?.error==='PASSWORD_RECONFIRM_REQUIRED'?'Owner password confirmation required.':
    'Cloudflare/Supabase LIVE readiness unavailable; review Owner login and server settings.');
   liveResults.replaceChildren();
   liveResults.append(element('h3','LIVE merchant review — '+j.verifiedLivePrices+' / 8 LIVE prices verified (NO CHARGE)'));
   liveResults.append(element('p','Payment mode: '+j.mode+'. LIVE billing NOT APPROVED; this does not validate signed provider delivery or real member entitlements.'));
   const table=element('table'),thead=element('thead'),tr=element('tr');
   for(const col of ['Category','Check','Status','Evidence'])tr.append(element('th',col));
   thead.append(tr);const body=element('tbody');
   for(const row of (Array.isArray(j.rows)?j.rows:[])){
    const line=element('tr');for(const v of [row.group,row.check,row.status,row.detail])line.append(element('td',String(v??'')));
    body.append(line);
   }
   table.append(thead,body);liveResults.append(table);
   if(j.suggestedLiveCatalogJson&&j.discoveryStatus==='COMPLETE_CANDIDATES'){
    const paragraph=element('p','Eight uniquely name/price-matched LIVE Stripe candidates were found. This is a proposed mapping, NOT an automatic update or payment approval. Review each Product and Price ID in the LIVE Dashboard before saving to Cloudflare.');
    const box=element('textarea');box.readOnly=true;box.rows=20;
    box.setAttribute('aria-label','Proposed LIVE Stripe catalog JSON for Owner review');
    box.value=j.suggestedLiveCatalogJson;box.style.width='100%';box.style.maxWidth='900px';
    const copy=element('button','Copy proposed LIVE catalog JSON');copy.type='button';
    copy.addEventListener('click',async()=>{
     try{await navigator.clipboard.writeText(box.value);copy.textContent='Copied — review and update Cloudflare manually';}
     catch{box.focus();box.select();copy.textContent='Select and copy the proposed JSON above';}
    });
    liveResults.append(paragraph,box,copy);
   }else if(j.discoveryStatus&&j.discoveryStatus!=='NOT_REQUIRED'){
    liveResults.append(element('p','LIVE catalog discovery: '+j.discoveryStatus+'. Review RECOVERY rows; no Stripe products or Cloudflare configuration were changed.'));
   }
   liveResults.append(element('p','The Owner must separately authorize LIVE checkout after actual provider acceptance. This report never activates charges.'));
  }catch(e){liveResults.replaceChildren(element('p','LIVE merchant review unavailable: '+(e.message||'Unknown error')+'. No payment attempted.'))}
  finally{liveButton.disabled=state?.role!=='OWNER'}
 }
  liveButton.addEventListener('click',runLiveMerchantReview);
 releaseButton.addEventListener('click',async()=>{
  releaseButton.disabled=true;
  releaseResults.replaceChildren(element('p','Reading release evidence; no Stripe Checkout or customer data changes.'));
  try{
   const jwt=await auth();
   const response=await fetch('/api/live-commerce-readiness',{headers:{authorization:'Bearer '+jwt},cache:'no-store'});
   const x=await response.json().catch(()=>null);
   if(!response.ok||x?.ok!==true)throw Error(x?.error||'Read-only release evidence is temporarily unavailable.');
   releaseResults.replaceChildren();
   releaseResults.append(element('h3',x.operationalCheckoutConfigured===true?'LIVE selling configured — first paid fulfillment acceptance pending':x.go===true?'Payment release checks passed':'NO-GO — LIVE payment configuration incomplete'));
   releaseResults.append(element('p',String(x.storeCount)+' Store faces; '+String(x.mappedSKUs)+' mapped paid SKUs; '+
    String(x.activePriceCount)+' active LIVE Prices; '+String(x.activeProductCount)+' active Stripe Products.'));
   const denied=Array.isArray(x.blockers)?x.blockers:[],allowed=Array.isArray(x.verified)?x.verified:[];
   const list=element('ul');
   for(const key of denied)list.append(element('li','BLOCKED: '+String(key)));
   for(const key of allowed)list.append(element('li','VERIFIED: '+String(key)));
   releaseResults.append(list);
   const table=element('table'),head=element('thead'),h=element('tr');
   for(const col of ['Product category','Store faces','Independent sale-ready'])h.append(element('th',col));
   head.append(h);table.append(head);
   const body=element('tbody');
   for(const [category,v] of Object.entries(x.categoryCounts||{})){
    const row=element('tr');for(const value of [category,String(v.total),String(v.ready)])row.append(element('td',value));body.append(row);
   }
   table.append(body);releaseResults.append(table,element('p',String(x.explanation||'')));
  }catch(e){releaseResults.replaceChildren(element('p','LIVE commerce preflight unavailable: '+(e.message||'Unknown error')+'. Check LIVE status independently.'))}
  finally{releaseButton.disabled=false}
 });
 const QA_URL='/api/owner-zero-live-checkout';
 const QA_FAILED={
  ZERO_QA_DISABLED:'Zero-dollar LIVE QA is OFF. Keep it off until you intentionally configure the separate $0 LIVE QA Product.',
  ZERO_QA_CONFIGURATION_MISSING:'Configure GU71_ZERO_LIVE_PRODUCT_ID, GU71_ZERO_LIVE_PRICE_ID and existing GU58 LIVE Stripe credentials in Cloudflare Production.',
  ZERO_QA_MUST_NOT_USE_PAID_CATALOG:'QA Product/Price must be distinct from every paid membership and tool.',
  ZERO_PRODUCT_NOT_QA_MARKED:'Stripe LIVE QA Product must be active and have metadata gu71_zero_qa=true.',
  NOT_AN_EXACT_ZERO_DOLLAR_ONE_TIME_PRICE:'Price must be LIVE, USD, exactly $0.00, one-time, flat per unit and owned by the separate QA product.',
  PASSWORD_RECONFIRM_REQUIRED:'Use the Owner password confirmation before trying again.',
  ZERO_CHECKOUT_NOT_SUPPORTED:'Stripe did not accept this $0 Checkout configuration. Stop; do not enter card details or replace with a paid Price.'
 };
 async function zeroFetch(method='GET',sessionId,sku='',batch=null){
  const jwt=await auth();
  const url=QA_URL+(sessionId?'?session_id='+encodeURIComponent(sessionId):'');
  const perform=async()=>{const r=await fetch(url,{method,headers:{authorization:'Bearer '+jwt,
   ...(method==='POST'?{'content-type':'application/json'}:{})},
   ...(method==='POST'?{body:JSON.stringify({confirm:'CREATE_ZERO_DOLLAR_LIVE_QA',...(batch|| (sku?{sku}:{}))})}:{cache:'no-store'})});
   return {r,data:await r.json().catch(()=>null)}};
  let {r,data}=await perform();
  if(!r.ok&&data?.error==='PASSWORD_RECONFIRM_REQUIRED'){
   const fn=window.GroundUpAdminPasswordConfirm?.ensure;
   if(typeof fn!=='function')throw Error('Owner password confirmation required.');
   await fn();({r,data}=await perform());
  }
  if(!r.ok||data?.ok!==true){
   let reason=QA_FAILED[data?.error]||('LIVE $0 QA unavailable: '+String(data?.error||r.status));
   if(data?.error==='ZERO_CHECKOUT_NOT_SUPPORTED'){
    const info=data?.stripeDiagnostic||{};
    const details=[info.code?'Code: '+info.code:null,info.param?'Parameter: '+info.param:null,
     info.httpStatus?'HTTP '+info.httpStatus:null,info.requestId?'Stripe request: '+info.requestId:null].filter(Boolean);
    if(details.length)reason+=' Stripe diagnostic: '+details.join(' · ')+'.';
    else reason+=' Stripe did not provide a machine-readable error; check LIVE API request logs.';
   }
   throw Error(reason);
  }
  return data;
 }
 zeroCheck.addEventListener('click',async()=>{
  zeroCheck.disabled=true;zeroStart.disabled=true;
  zeroReadout.replaceChildren(element('p','Checking one-time LIVE $0 product and Owner access without opening Stripe Checkout.'));
  try{
   const r=await zeroFetch();
   if(r.configuredZeroPrice===true&&r.amountCents===0){
    zeroReadout.replaceChildren(element('p','PASS — The separate Stripe LIVE QA Product and Price are verified at exactly $0.00, one-time, no other paid SKU. Creating a checkout still requires explicit Owner confirmation.'));
    zeroStart.disabled=false;
   }
  }catch(e){zeroReadout.replaceChildren(element('p',e.message))}
  finally{zeroCheck.disabled=state?.role!=='OWNER'}
 });
 zeroStart.addEventListener('click',async()=>{
  const mode=zeroMode.value,chosen=[...zeroMany.selectedOptions].map(x=>x.value);
  const batch=mode==='all'?{selection:'all'}:mode==='category'?{selection:'category',category:zeroCategory.value}:
   mode==='selected'?{selection:'selected',skus:chosen}:null;
  const target=mode==='one'?zeroSkuSelect.value:'';
  if(mode==='selected'&&!chosen.length){zeroReadout.replaceChildren(element('p','Select at least one product.'));return}
  const label=mode==='one'?(target||'general checkout'):mode==='category'?zeroCategory.value+' category':
   mode==='all'?'all products':chosen.length+' selected products';
  if(!window.confirm('Create ONE $0 Stripe LIVE diagnostic for '+label+'? No card, subscription, entitlement or actual paid fulfillment. Stripe-hosted completion is still required.'))return;
  zeroStart.disabled=true;
  zeroReadout.replaceChildren(element('p','Creating one Owner-only $0 LIVE diagnostic session for the chosen scope; not a paid order.'));
  try{
   const r=await zeroFetch('POST',null,target,batch);
   if(!r.zeroDollar||!r.sessionUrl)throw Error('Zero-dollar validation missing; do not proceed.');
   window.location.assign(r.sessionUrl);
  }catch(e){zeroReadout.replaceChildren(element('p',e.message))}
 });
 const returnId=new URLSearchParams(window.location.search).get('session_id');
 if(new URLSearchParams(window.location.search).get('gu71')==='complete'&&returnId){
  zeroQA.open=true;
  zeroReadout.replaceChildren(element('p','Checking returned Stripe LIVE $0 checkout against the Owner and ensuring no payment intent or subscription exists.'));
  // Wait for the Owner session to be accessible in the Admin screen; no
  // unauthenticated return-url acceptance or membership grant.
  setTimeout(async()=>{
   try{
    const r=await zeroFetch('GET',returnId);
    zeroReadout.replaceChildren(element('h3',r.verifiedSafe?'PASS — Stripe returned a verified $0 Checkout.':'REVIEW — Zero-dollar order NOT verified.'));
    zeroReadout.append(element('p','Target catalog item: '+(r.targetSku||'General QA')+'. Stripe status: '+r.status+'; payment status: '+r.paymentStatus+'; amount: '+r.orderTotalCents+' cents; charge absent: '+r.noCharge+'. No membership was granted.'));
    zeroReadout.append(element('p','This does not certify signed GU58 webhook delivery, Managed Payments, recurring billing or paid checkout.'));
   }catch(e){zeroReadout.replaceChildren(element('p','Owner verification unavailable: '+e.message))}
  },1250);
 }


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
  if($('#gu39-shadow')){loaded=true;return}
  loaded=true;host.prepend(root);
  // A separate GU39 TEST status failure must not conceal the Owner's LIVE $0 QA.
  // UI visibility is for discovery only; GU71 enforces Owner and price checks.
  const allowedOwner=ownerVisible();zeroQA.hidden=!allowedOwner;zeroCheck.disabled=!allowedOwner;
  const jump=()=>{
   const commerce=$('#admin-tabs button[data-panel="commerce"]');
   if(commerce&&!commerce.hidden&&!commerce.classList.contains('cc-owner-hidden'))commerce.click();
   zeroQA.open=true;
   setTimeout(()=>zeroQA.scrollIntoView({block:'start',behavior:'smooth'}),100);
  };
  if(allowedOwner){
   const heading=$('.admin-heading',panel);
   if(heading&&!$('#gu71-owner-commerce-shortcut',heading)){
    const button=element('button','Owner LIVE $0.00 Checkout QA','btn secondary');
    button.type='button';button.id='gu71-owner-commerce-shortcut';button.addEventListener('click',jump);heading.append(button);
   }
   const nav=$('#admin-tabs');
   if(nav&&!$('#gu71-owner-nav-shortcut',nav)){
    const button=element('button','Owner LIVE $0.00 Checkout QA');
    button.type='button';button.id='gu71-owner-nav-shortcut';
    button.setAttribute('aria-controls','gu71-zero-live-checkout');
    button.addEventListener('click',jump);nav.append(button);
   }
   zeroReadout.replaceChildren(element('p','Owner-only $0 LIVE QA. Check the zero-price product before creating a Checkout session. This control remains accessible when Stripe TEST diagnostics are disabled.'));
  }
  window.GroundUpStripeShadowV01439=Object.freeze({version:window.SITE_CONFIG?.VERSION||'0.14.0.155',refresh:getState,verifyCatalog,runPreflight,runCompletePaymentReview,auditCheckout});getState()}
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
