/* v0.14.0.49 — OWNER testing console in Payments & Billing. SHADOW ONLY. */
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
 const lead=element('p','Safely check Stripe test payments without changing real customer memberships, orders, or eBook rights.');
 const banner=element('p','TEST MODE ONLY · Real customer checkout remains OFF','gu39-danger');
 const help=element('p','Verification works with testing OFF. Configure GU39_STRIPE_TEST_SECRET_KEY and GU39_STRIPE_TEST_PRICE_MAP_JSON in Cloudflare server-side settings. Never enter secret keys here.','gu39-small');
 const message=element('p','Select Refresh to check the system.','gu39-message');message.setAttribute('role','status');message.setAttribute('aria-live','polite');
 const summary=element('dl',undefined,'gu39-summary');
 const controls=element('div',undefined,'gu39-actions');
 const refresh=element('button','Refresh Testing Status');refresh.type='button';
 const verify=element('button','Verify All 8 Sandbox Products');verify.type='button';
 const catalog=element('div',undefined,'gu39-catalog-report');catalog.setAttribute('role','status');catalog.setAttribute('aria-live','polite');
 const toggle=element('button','Enable Testing');toggle.type='button';toggle.disabled=true;
 const label=element('label','Choose a test product');label.htmlFor='gu39-sku';
 const sel=element('select');sel.id='gu39-sku';for(const [value,name] of Object.entries(SKUS)){const opt=element('option',name);opt.value=value;sel.append(opt)}
 const begin=element('button','Open Stripe Test Checkout');begin.type='button';begin.disabled=true;
 const explain=element('p','Only the Owner can change testing settings. A recent password confirmation is required. Test data is stored separately from real entitlements. No refunds or recurring memberships are modified outside this test area.','gu39-small');
 controls.append(refresh,verify,toggle,label,sel,begin);root.append(title,lead,banner,help,summary,controls,catalog,message,explain);
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
 function show(data){state=data;summary.replaceChildren();const rows=[['Owner Test Mode',data.enabled?'Enabled':'Disabled'],['Cloudflare Sandbox Gate',data.cloudflareGate?'Configured':'Not configured'],['Stripe Test Price IDs (configured, not verified)',String(data.priceIdsConfigured??0)+' / 8'],['Test Checkout Records',String(data.intentCount??0)],['Processed Sandbox Events',String(data.processedEventCount??0)],['Shadow Access Records',String(data.shadowAccessCount??0)],['Real Customer Payments','DISABLED']];
  for(const [k,v] of rows){summary.append(element('dt',k),element('dd',v))}
  toggle.textContent=data.enabled?'Disable Testing':'Enable Testing';toggle.disabled=data.role!=='OWNER'||(!data.enabled&&!data.cloudflareGate);
  begin.disabled=data.role!=='OWNER'||!data.enabled||!data.cloudflareGate||data.priceIdsConfigured!==8||!catalogReady;
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
  }catch(e){catalogReady=false;if(state)show(state);catalog.replaceChildren();catalog.append(element('p','Catalog verification could not complete: '+(e.message||'Unknown error.')))}finally{verify.disabled=false}
 }
 verify.addEventListener('click',verifyCatalog);
 async function perform(payload){toggle.disabled=begin.disabled=true;try{const token=await auth();const r=await fetch('/api/gu39-sandbox',{method:'POST',headers:{authorization:'Bearer '+token,'content-type':'application/json'},body:JSON.stringify(payload),cache:'no-store'});const data=await r.json();if(!r.ok||!data.ok)throw Error(data.error||'Action was not authorized.');return data}catch(e){message.textContent='Payment testing action not completed: '+(e.message||'Unknown error.');return null}finally{if(state){toggle.disabled=state.role!=='OWNER';begin.disabled=state.role!=='OWNER'||!state.enabled||!state.cloudflareGate||state.priceIdsConfigured!==8||!catalogReady}}}
 refresh.addEventListener('click',getState);
 toggle.addEventListener('click',async()=>{if(!state)return;const next=!state.enabled;if(next&&!confirm('Enable SHADOW sandbox tests? No real member access will change.'))return;
  const result=await perform({action:'toggle',enabled:next,updatedAt:state.updatedAt});if(result)await getState()});
 begin.addEventListener('click',async()=>{const sku=sel.value;if(!Object.hasOwn(SKUS,sku))return;if(!confirm('Start a STRIPE TEST purchase? Use Stripe test card details only. No real billing.'))return;
  const result=await perform({action:'checkout',sku});if(!result)return;
  let destination;try{destination=new URL(result.url);if(destination.protocol!=='https:'||destination.hostname!=='checkout.stripe.com')throw Error('Unsafe destination.')}catch{message.textContent='Stripe checkout URL verification failed.';return}
  location.assign(destination.href)});
 function mount(){if(loaded||!permitted())return;const panel=$('#admin-app .admin-panel[data-admin-panel="commerce"]');if(!panel)return;
  const host=$('.gu33-payment-hub',panel)||panel;
  if($('#gu39-shadow')){loaded=true;return}loaded=true;host.prepend(root);window.GroundUpStripeShadowV01439=Object.freeze({version:'0.14.0.49',refresh:getState,verifyCatalog});getState()}
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
